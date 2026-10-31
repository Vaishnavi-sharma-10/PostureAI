import { NormalizedLandmark, PostureMetrics, PostureRating, ActivityType, TrackingStatus } from '../types';

export interface Point2D {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface TrackingQualityResult {
  status: TrackingStatus;
  message: string;
  subMessage?: string;
}

/**
 * Validates MediaPipe landmark quality and user framing.
 * Ensures the app never displays misleading scores when someone is missing,
 * partially cut off, or landmarks are noisy/unreliable.
 */
export function evaluateTrackingQuality(
  landmarks: NormalizedLandmark[] | null
): TrackingQualityResult {
  if (!landmarks || landmarks.length === 0) {
    return {
      status: 'no_person',
      message: 'Person not detected',
      subMessage: 'Position yourself in front of the camera to begin posture tracking.'
    };
  }

  // Key MediaPipe landmarks:
  // 0: nose, 11: left shoulder, 12: right shoulder, 23: left hip, 24: right hip
  const nose = landmarks[0];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  // 1. Check primary upper body landmark presence and confidence
  const upperLandmarks = [nose, leftShoulder, rightShoulder].filter(Boolean);
  if (upperLandmarks.length < 3) {
    return {
      status: 'no_person',
      message: 'Person not detected',
      subMessage: 'Ensure your head and shoulders are clearly in the camera frame.'
    };
  }

  const upperVisibilities = upperLandmarks.map((lm) => lm.visibility ?? 0);
  const avgUpperVis = upperVisibilities.reduce((a, b) => a + b, 0) / upperVisibilities.length;

  if (avgUpperVis < 0.42) {
    return {
      status: 'unreliable',
      message: 'Adjust your position for a better assessment',
      subMessage: 'Increase room lighting or move closer to improve camera detection.'
    };
  }

  // 2. Check full body / torso visibility (hips should be visible or within frame boundaries)
  const hips = [leftHip, rightHip].filter(Boolean);
  const hipsVisible = hips.some((h) => (h.visibility ?? 0) >= 0.35);
  const hipsInBounds = hips.some((h) => h.y >= 0.05 && h.y <= 1.02);

  if (!hipsVisible || !hipsInBounds) {
    // If shoulders are visible but hips are cut off at the bottom or out of frame
    return {
      status: 'partially_visible',
      message: 'Please make sure your full body is visible',
      subMessage: 'Step back or tilt your camera down to include your torso and hips.'
    };
  }

  return {
    status: 'tracking',
    message: 'Tracking Active',
    subMessage: 'Biomechanical telemetry actively calculating.'
  };
}

/**
 * Calculates Euclidean angle between three points in degrees (vertex at point B)
 */
export function calculateAngle(
  a: Point2D,
  b: Point2D,
  c: Point2D,
  aspectRatio = 1
): number {
  // MediaPipe x/y are normalized independently. Scale x into the same units as y
  // before measuring angles, otherwise non-square camera frames distort angles.
  const ax = a.x * aspectRatio;
  const bx = b.x * aspectRatio;
  const cx = c.x * aspectRatio;
  const radians = Math.atan2(c.y - b.y, cx - bx) - Math.atan2(a.y - b.y, ax - bx);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return angle;
}

/**
 * Calculates the inclination angle from the horizontal axis in degrees
 */
export function angleFromHorizontal(p1: Point2D, p2: Point2D, aspectRatio = 1): number {
  const dx = Math.abs(p2.x - p1.x) * aspectRatio;
  const dy = Math.abs(p2.y - p1.y);
  return (Math.atan2(dy, dx) * 180.0) / Math.PI;
}

/**
 * Calculates the deviation angle from the vertical plumbline in degrees
 */
export function angleFromVertical(top: Point2D, bottom: Point2D, aspectRatio = 1): number {
  const dx = Math.abs(top.x - bottom.x) * aspectRatio;
  const dy = Math.abs(bottom.y - top.y);
  if (dy === 0) return 90;
  return (Math.atan2(dx, dy) * 180.0) / Math.PI;
}

/**
 * Determines whether the user is positioned facing the camera or in side profile
 */
export function detectCameraOrientation(landmarks: NormalizedLandmark[], aspectRatio = 1): 'front' | 'side' {
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  if (!leftShoulder || !rightShoulder) return 'front';

  const shoulderDistance = Math.hypot((leftShoulder.x - rightShoulder.x) * aspectRatio, leftShoulder.y - rightShoulder.y);
  const torsoLength = leftHip
    ? Math.abs(leftHip.y - leftShoulder.y)
    : 0.35;

  const shoulderToTorsoRatio = shoulderDistance / (torsoLength || 0.35);

  // If shoulders appear compressed horizontally relative to torso, profile view is detected
  return shoulderToTorsoRatio < 0.45 ? 'side' : 'front';
}

export interface ViewValidationResult {
  isMatch: boolean;
  detectedView: 'front' | 'side';
  promptMessage?: string;
}

/**
 * Validates whether user orientation matches the user-selected view mode
 */
export function validateViewModeMatch(
  landmarks: NormalizedLandmark[],
  preferredView: 'front' | 'side' | 'auto',
  aspectRatio = 1
): ViewValidationResult {
  if (preferredView === 'auto') {
    return { isMatch: true, detectedView: detectCameraOrientation(landmarks, aspectRatio) };
  }
  const detected = detectCameraOrientation(landmarks, aspectRatio);
  if (preferredView === 'front' && detected === 'side') {
    return {
      isMatch: false,
      detectedView: 'side',
      promptMessage: 'Please face the camera directly (Front View selected) or switch to Profile View.'
    };
  }
  if (preferredView === 'side' && detected === 'front') {
    return {
      isMatch: false,
      detectedView: 'front',
      promptMessage: 'Please turn sideways to the camera (Profile View selected) or switch to Front View.'
    };
  }
  return {
    isMatch: true,
    detectedView: detected
  };
}

/**
 * Main postural calculation engine: parses 33 MediaPipe pose landmarks and outputs
 * precise kinematic angles, symmetry indices, and composite alignment score.
 */
export function analyzePosture(
  landmarks: NormalizedLandmark[],
  preferredView: 'front' | 'side' | 'auto' = 'auto',
  activityContext: ActivityType = 'standing',
  aspectRatio = 1
): PostureMetrics {
  // MediaPipe landmarks:
  // 0: nose, 7: left ear, 8: right ear
  // 11: left shoulder, 12: right shoulder
  // 23: left hip, 24: right hip
  const nose = landmarks[0];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const flaggedIssues: string[] = [];
  const feedbackTips: string[] = [];

  const autoDetectedView = detectCameraOrientation(landmarks, aspectRatio);
  const viewDetected = preferredView === 'auto' ? autoDetectedView : preferredView;

  // Compute confidence based on visibility of key axial points
  const visibilities = [
    nose?.visibility ?? 0,
    leftEar?.visibility ?? 0,
    rightEar?.visibility ?? 0,
    leftShoulder?.visibility ?? 0,
    rightShoulder?.visibility ?? 0
  ];
  const confidence = visibilities.reduce((a, b) => a + b, 0) / visibilities.length;

  let forwardHeadAngle = 0;
  let headForwardDisplacement = 0;
  let shoulderTiltAngle = 0;
  let shoulderSymmetryDelta = 0;
  let hipTiltAngle = 0;
  let torsoSlouchAngle = 0;
  let spineCurvatureScore = 100;

  if (viewDetected === 'side') {
    // Determine profile side (choose side with higher ear/shoulder visibility)
    const leftSideScore = (leftEar?.visibility ?? 0) + (leftShoulder?.visibility ?? 0);
    const rightSideScore = (rightEar?.visibility ?? 0) + (rightShoulder?.visibility ?? 0);
    const useLeft = leftSideScore >= rightSideScore;

    const ear = useLeft ? leftEar : rightEar;
    const shoulder = useLeft ? leftShoulder : rightShoulder;
    const hip = useLeft ? (leftHip || shoulder) : (rightHip || shoulder);

    if (ear && shoulder) {
      // Forward head posture in profile: ear protruding anteriorly past acromion
      forwardHeadAngle = angleFromVertical(ear, shoulder, aspectRatio);
      headForwardDisplacement = ear.x - shoulder.x;

      if (forwardHeadAngle > 18) {
        flaggedIssues.push('Forward Head Posture (Severe)');
        feedbackTips.push('Retract your chin slightly and align ears over shoulders.');
      } else if (forwardHeadAngle > 12) {
        flaggedIssues.push('Mild Forward Head Drift');
        feedbackTips.push('Gently draw head back to minimize cervical compression.');
      }
    }

    if (shoulder && hip) {
      torsoSlouchAngle = angleFromVertical(shoulder, hip, aspectRatio);
      hipTiltAngle = Number((torsoSlouchAngle * 0.35).toFixed(1));
      if (torsoSlouchAngle > 14) {
        flaggedIssues.push(activityContext === 'sitting' ? 'Seated Kyphotic Slump' : 'Thoracic Slouch Detected');
        feedbackTips.push(
          activityContext === 'sitting'
            ? 'Engage lumbar backrest support and sit tall on your sit-bones.'
            : 'Engage your core and stack ribs directly over hips.'
        );
      }
    }
  } else {
    // Frontal view kinematics
    if (leftShoulder && rightShoulder) {
      shoulderTiltAngle = angleFromHorizontal(leftShoulder, rightShoulder, aspectRatio);
      shoulderSymmetryDelta = leftShoulder.y - rightShoulder.y;

      const tiltThreshold = activityContext === 'running' ? 7.5 : activityContext === 'walking' ? 5.5 : 4.5;
      if (shoulderTiltAngle > tiltThreshold) {
        const higherSide = shoulderSymmetryDelta < 0 ? 'Left' : 'Right';
        flaggedIssues.push(`Elevated ${higherSide} Shoulder`);
        feedbackTips.push(
          activityContext === 'sitting'
            ? `Relax your ${higherSide.toLowerCase()} shoulder and check desk/armrest height.`
            : `Relax your ${higherSide.toLowerCase()} shoulder and balance arm swing.`
        );
      }
    }

    // Hip Alignment measurement
    if (leftHip && rightHip) {
      hipTiltAngle = angleFromHorizontal(leftHip, rightHip, aspectRatio);
      if (hipTiltAngle > 4.0) {
        flaggedIssues.push('Pelvic Tilt / Hip Asymmetry');
        feedbackTips.push('Distribute weight evenly across both hips and feet.');
      }
    }

    // Mid-points
    const midEar = leftEar && rightEar ? {
      x: (leftEar.x + rightEar.x) / 2,
      y: (leftEar.y + rightEar.y) / 2
    } : (nose || { x: 0.5, y: 0.2 });

    const midShoulder = leftShoulder && rightShoulder ? {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    } : { x: 0.5, y: 0.35 };

    const midHip = leftHip && rightHip ? {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    } : { x: midShoulder.x, y: midShoulder.y + 0.3 };

    // Head lateral tilt / deviation from vertical plumbline
    forwardHeadAngle = angleFromVertical(midEar, midShoulder, aspectRatio);
    const headTiltThreshold = activityContext === 'running' ? 12.0 : activityContext === 'walking' ? 10.0 : 8.0;
    if (forwardHeadAngle > headTiltThreshold) {
      flaggedIssues.push('Lateral Head Tilt');
      feedbackTips.push('Center your head and keep your eye-line horizontal.');
    }

    // Torso plumbline deviation
    torsoSlouchAngle = angleFromVertical(midShoulder, midHip, aspectRatio);
    const torsoThreshold = activityContext === 'running' ? 11.0 : activityContext === 'walking' ? 9.0 : 7.0;
    if (torsoSlouchAngle > torsoThreshold) {
      flaggedIssues.push(activityContext === 'sitting' ? 'Lateral Trunk Lean (Seated)' : 'Lateral Trunk Lean');
      feedbackTips.push(
        activityContext === 'sitting'
          ? 'Distribute weight evenly across both sit-bones; check chair ergonomics.'
          : 'Distribute weight evenly across both feet.'
      );
    }

    // Curvature/Linearity indicator
    spineCurvatureScore = Math.max(30, 100 - (torsoSlouchAngle * 4 + shoulderTiltAngle * 3));
  }

  // Calculate composite alignment score (0 - 100) with activity-specific tolerance
  // Uses actual measurements: Shoulder Alignment, Hip Alignment, Head Position, Torso Alignment
  let deductions = 0;

  if (activityContext === 'running') {
    // Dynamic athletic movement tolerance: running has natural forward propulsion and arm pump
    if (forwardHeadAngle > 10) deductions += Math.min(25, (forwardHeadAngle - 10) * 1.8);
    if (shoulderTiltAngle > 5.5) deductions += Math.min(20, (shoulderTiltAngle - 5.5) * 2.0);
    if (hipTiltAngle > 5.0) deductions += Math.min(15, (hipTiltAngle - 5.0) * 1.8);
    if (torsoSlouchAngle > 8.0) deductions += Math.min(20, (torsoSlouchAngle - 8.0) * 1.8);
  } else if (activityContext === 'walking') {
    // Walking movement tolerance: alternating arm swing and natural step shifts
    if (forwardHeadAngle > 8) deductions += Math.min(30, (forwardHeadAngle - 8) * 2.0);
    if (shoulderTiltAngle > 4.2) deductions += Math.min(22, (shoulderTiltAngle - 4.2) * 2.5);
    if (hipTiltAngle > 4.0) deductions += Math.min(18, (hipTiltAngle - 4.0) * 2.2);
    if (torsoSlouchAngle > 6.5) deductions += Math.min(20, (torsoSlouchAngle - 6.5) * 2.0);
  } else if (activityContext === 'sitting') {
    // Seated ergonomic tolerance
    if (forwardHeadAngle > 6) deductions += Math.min(35, (forwardHeadAngle - 6) * 2.5);
    if (shoulderTiltAngle > 2.5) deductions += Math.min(25, (shoulderTiltAngle - 2.5) * 3.2);
    if (hipTiltAngle > 2.8) deductions += Math.min(20, (hipTiltAngle - 2.8) * 2.8);
    if (torsoSlouchAngle > 5.5) deductions += Math.min(25, (torsoSlouchAngle - 5.5) * 2.5);
  } else {
    // Standing standard
    if (forwardHeadAngle > 6) deductions += Math.min(35, (forwardHeadAngle - 6) * 2.5);
    if (shoulderTiltAngle > 2.5) deductions += Math.min(25, (shoulderTiltAngle - 2.5) * 3.2);
    if (hipTiltAngle > 2.8) deductions += Math.min(20, (hipTiltAngle - 2.8) * 2.8);
    if (torsoSlouchAngle > 5) deductions += Math.min(25, (torsoSlouchAngle - 5) * 2.5);
  }

  const overallScore = Math.max(12, Math.min(100, Math.round(100 - deductions)));

  let rating: PostureRating = 'optimal';
  if (overallScore < 65) {
    rating = 'deviated';
  } else if (overallScore < 82) {
    rating = 'acceptable';
  }

  if (feedbackTips.length === 0) {
    if (activityContext === 'sitting') {
      feedbackTips.push('Good seated alignment: lumbar curve supported, head centered, shoulders relaxed.');
    } else if (activityContext === 'walking') {
      feedbackTips.push('Good walking gait: upright spinal carriage and balanced arm motion.');
    } else if (activityContext === 'running') {
      feedbackTips.push('Dynamic running form balanced: head stable and core engaged.');
    } else {
      feedbackTips.push('Excellent alignment maintained. Keep shoulders relaxed and breathing steady.');
    }
  }

  return {
    overallScore,
    rating,
    forwardHeadAngle: Number(forwardHeadAngle.toFixed(1)),
    headForwardDisplacement: Number(headForwardDisplacement.toFixed(3)),
    shoulderTiltAngle: Number(shoulderTiltAngle.toFixed(1)),
    shoulderSymmetryDelta: Number(shoulderSymmetryDelta.toFixed(3)),
    hipTiltAngle: Number(hipTiltAngle.toFixed(1)),
    torsoSlouchAngle: Number(torsoSlouchAngle.toFixed(1)),
    spineCurvatureScore: Math.round(spineCurvatureScore),
    confidence: Number(confidence.toFixed(2)),
    flaggedIssues,
    feedbackTips,
    viewDetected,
    activityContext
  };
}
