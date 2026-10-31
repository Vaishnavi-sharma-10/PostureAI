import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { NormalizedLandmark } from '../types';

export type DemoPoseType =
  | 'ideal'
  | 'slouch'
  | 'tilt'
  | 'dynamic'
  | 'standing'
  | 'sitting'
  | 'walking'
  | 'running';

export interface DetectionResult {
  landmarks: NormalizedLandmark[] | null;
  poseCount: number;
}

let poseLandmarkerInstance: PoseLandmarker | null = null;
let isInitializing = false;
let initPromise: Promise<PoseLandmarker> | null = null;

const WASM_CDN_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_ASSET_PATH = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

/**
 * Initializes and caches the MediaPipe PoseLandmarker model
 */
export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (poseLandmarkerInstance) return poseLandmarkerInstance;
  if (initPromise) return initPromise;

  isInitializing = true;

  initPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN_PATH);

      try {
        // Attempt GPU acceleration first with numPoses: 2 to support multi-person detection
        poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_PATH,
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numPoses: 2,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
      } catch (gpuErr) {
        console.warn('GPU delegate failed, falling back to CPU delegate:', gpuErr);
        poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_PATH,
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numPoses: 2,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
      }

      return poseLandmarkerInstance;
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

/**
 * Runs pose estimation on a single video frame with person count
 */
export function detectPoseWithCount(
  landmarker: PoseLandmarker,
  video: HTMLVideoElement,
  timestampMs: number
): DetectionResult {
  if (video.readyState < 2) return { landmarks: null, poseCount: 0 };

  try {
    const result = landmarker.detectForVideo(video, timestampMs);
    if (result && result.landmarks && result.landmarks.length > 0) {
      return {
        landmarks: result.landmarks[0] as NormalizedLandmark[],
        poseCount: result.landmarks.length
      };
    }
  } catch (err) {
    console.error('Frame pose detection error:', err);
  }
  return { landmarks: null, poseCount: 0 };
}

/**
 * Runs pose estimation on a single video frame (legacy wrapper)
 */
export function detectPose(
  landmarker: PoseLandmarker,
  video: HTMLVideoElement,
  timestampMs: number
): NormalizedLandmark[] | null {
  const res = detectPoseWithCount(landmarker, video, timestampMs);
  return res.landmarks;
}

/**
 * High-fidelity synthetic pose generator for Demo Mode & Activity testing.
 * Generates realistic 33-point landmarks with selectable postures and activities:
 * - 'ideal': aligned head, level shoulders, upright spine
 * - 'slouch': forward cervical drift, kyphotic curvature
 * - 'tilt': asymmetrical elevated shoulder
 * - 'dynamic': cycles smoothly through natural work posture shifts
 * - 'standing': upright stationary stance with natural micro-sway and straight legs
 * - 'sitting': seated chair posture with 90-degree knee flexion and horizontal thighs
 * - 'walking': dynamic alternating leg stride cycles with arm opposition
 * - 'running': fast high-cadence running stride with high knee flexion and vertical bounce
 */
export function generateSyntheticPose(
  timeSeconds: number,
  mode: DemoPoseType = 'dynamic'
): NormalizedLandmark[] {
  // Base 33 landmarks placeholder
  const landmarks: NormalizedLandmark[] = new Array(33).fill(null).map(() => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.95
  }));

  // Handle Walking activity synthesis
  if (mode === 'walking') {
    const cadence = 1.35; // ~1.35 Hz walking cadence (steps/sec)
    const phase = timeSeconds * cadence * 2 * Math.PI;

    const bodySwayX = Math.sin(phase * 0.5) * 0.012;
    const bodyBounceY = Math.abs(Math.sin(phase)) * 0.015;

    const noseX = 0.50 + bodySwayX;
    const noseY = 0.22 + bodyBounceY;

    const shoulderY = 0.36 + bodyBounceY;
    const hipY = 0.56 + bodyBounceY;

    // Head
    landmarks[0] = { x: noseX, y: noseY, visibility: 0.98 };
    landmarks[7] = { x: noseX - 0.06, y: noseY - 0.005, visibility: 0.95 };
    landmarks[8] = { x: noseX + 0.06, y: noseY - 0.005, visibility: 0.95 };

    // Shoulders
    const lShX = 0.40 + bodySwayX;
    const rShX = 0.60 + bodySwayX;
    landmarks[11] = { x: lShX, y: shoulderY, visibility: 0.98 };
    landmarks[12] = { x: rShX, y: shoulderY, visibility: 0.98 };

    // Arms swing in opposition to legs
    const armSwing = Math.sin(phase) * 0.08;
    landmarks[13] = { x: lShX - 0.05, y: shoulderY + 0.14 - armSwing * 0.5, visibility: 0.90 };
    landmarks[14] = { x: rShX + 0.05, y: shoulderY + 0.14 + armSwing * 0.5, visibility: 0.90 };
    landmarks[15] = { x: lShX - 0.07 + armSwing * 0.7, y: shoulderY + 0.28, visibility: 0.88 };
    landmarks[16] = { x: rShX + 0.07 - armSwing * 0.7, y: shoulderY + 0.28, visibility: 0.88 };

    // Hips
    const lHipX = 0.43 + bodySwayX;
    const rHipX = 0.57 + bodySwayX;
    landmarks[23] = { x: lHipX, y: hipY, visibility: 0.96 };
    landmarks[24] = { x: rHipX, y: hipY, visibility: 0.96 };

    // Alternating leg stride kinematics
    const leftStride = Math.sin(phase);
    const rightStride = Math.sin(phase + Math.PI);

    // Left leg
    const lKneeX = lHipX + leftStride * 0.05;
    const lKneeY = hipY + 0.18 - Math.max(0, leftStride) * 0.04;
    const lAnkX = lHipX + leftStride * 0.11;
    const lAnkY = hipY + 0.35 - Math.max(0, leftStride) * 0.025;

    // Right leg
    const rKneeX = rHipX + rightStride * 0.05;
    const rKneeY = hipY + 0.18 - Math.max(0, rightStride) * 0.04;
    const rAnkX = rHipX + rightStride * 0.11;
    const rAnkY = hipY + 0.35 - Math.max(0, rightStride) * 0.025;

    landmarks[25] = { x: lKneeX, y: lKneeY, visibility: 0.95 };
    landmarks[26] = { x: rKneeX, y: rKneeY, visibility: 0.95 };
    landmarks[27] = { x: lAnkX, y: lAnkY, visibility: 0.95 };
    landmarks[28] = { x: rAnkX, y: rAnkY, visibility: 0.95 };
    landmarks[29] = { x: lAnkX - 0.015, y: lAnkY + 0.02, visibility: 0.92 };
    landmarks[30] = { x: rAnkX + 0.015, y: rAnkY + 0.02, visibility: 0.92 };
    landmarks[31] = { x: lAnkX + 0.025, y: lAnkY + 0.025, visibility: 0.92 };
    landmarks[32] = { x: rAnkX - 0.025, y: rAnkY + 0.025, visibility: 0.92 };

    return landmarks;
  }

  // Handle Running activity synthesis
  if (mode === 'running') {
    const cadence = 2.4; // ~2.4 Hz running cadence
    const phase = timeSeconds * cadence * 2 * Math.PI;

    const bodyBounceY = Math.abs(Math.sin(phase)) * 0.04;
    const bodySwayX = Math.sin(phase * 0.5) * 0.018;

    const noseX = 0.50 + bodySwayX;
    const noseY = 0.20 + bodyBounceY;

    const shoulderY = 0.34 + bodyBounceY;
    const hipY = 0.54 + bodyBounceY;

    landmarks[0] = { x: noseX, y: noseY, visibility: 0.98 };
    landmarks[7] = { x: noseX - 0.06, y: noseY - 0.005, visibility: 0.95 };
    landmarks[8] = { x: noseX + 0.06, y: noseY - 0.005, visibility: 0.95 };

    const lShX = 0.40 + bodySwayX;
    const rShX = 0.60 + bodySwayX;
    landmarks[11] = { x: lShX, y: shoulderY, visibility: 0.98 };
    landmarks[12] = { x: rShX, y: shoulderY, visibility: 0.98 };

    // Vigorous arm pumping
    const armSwing = Math.sin(phase) * 0.16;
    landmarks[13] = { x: lShX - 0.06, y: shoulderY + 0.12 - armSwing * 0.6, visibility: 0.92 };
    landmarks[14] = { x: rShX + 0.06, y: shoulderY + 0.12 + armSwing * 0.6, visibility: 0.92 };
    landmarks[15] = { x: lShX - 0.08 + armSwing, y: shoulderY + 0.22, visibility: 0.90 };
    landmarks[16] = { x: rShX + 0.08 - armSwing, y: shoulderY + 0.22, visibility: 0.90 };

    const lHipX = 0.43 + bodySwayX;
    const rHipX = 0.57 + bodySwayX;
    landmarks[23] = { x: lHipX, y: hipY, visibility: 0.96 };
    landmarks[24] = { x: rHipX, y: hipY, visibility: 0.96 };

    // High knee drive and large ankle displacement
    const leftStride = Math.sin(phase);
    const rightStride = Math.sin(phase + Math.PI);

    // High knee lift during swing phase (< 95 deg knee angle)
    const lKneeLift = Math.max(0, leftStride) * 0.10;
    const rKneeLift = Math.max(0, rightStride) * 0.10;

    const lKneeX = lHipX + leftStride * 0.08;
    const lKneeY = hipY + 0.18 - lKneeLift;
    const lAnkX = lHipX + leftStride * 0.18;
    const lAnkY = hipY + 0.34 - lKneeLift * 0.7;

    const rKneeX = rHipX + rightStride * 0.08;
    const rKneeY = hipY + 0.18 - rKneeLift;
    const rAnkX = rHipX + rightStride * 0.18;
    const rAnkY = hipY + 0.34 - rKneeLift * 0.7;

    landmarks[25] = { x: lKneeX, y: lKneeY, visibility: 0.95 };
    landmarks[26] = { x: rKneeX, y: rKneeY, visibility: 0.95 };
    landmarks[27] = { x: lAnkX, y: lAnkY, visibility: 0.95 };
    landmarks[28] = { x: rAnkX, y: rAnkY, visibility: 0.95 };
    landmarks[29] = { x: lAnkX - 0.02, y: lAnkY + 0.02, visibility: 0.92 };
    landmarks[30] = { x: rAnkX + 0.02, y: rAnkY + 0.02, visibility: 0.92 };
    landmarks[31] = { x: lAnkX + 0.03, y: lAnkY + 0.025, visibility: 0.92 };
    landmarks[32] = { x: rAnkX - 0.03, y: rAnkY + 0.025, visibility: 0.92 };

    return landmarks;
  }

  // Handle Standing stance synthesis
  if (mode === 'standing') {
    const microSway = Math.sin(timeSeconds * 0.6) * 0.003;
    const breath = Math.sin(timeSeconds * 1.5) * 0.002;

    const noseX = 0.50 + microSway;
    const noseY = 0.22 + breath;

    landmarks[0] = { x: noseX, y: noseY, visibility: 0.99 };
    landmarks[7] = { x: noseX - 0.065, y: noseY - 0.005, visibility: 0.98 };
    landmarks[8] = { x: noseX + 0.065, y: noseY - 0.005, visibility: 0.98 };

    landmarks[11] = { x: 0.39 + microSway, y: 0.36 + breath, visibility: 0.99 };
    landmarks[12] = { x: 0.61 + microSway, y: 0.36 + breath, visibility: 0.99 };

    landmarks[13] = { x: 0.34, y: 0.52, visibility: 0.93 };
    landmarks[14] = { x: 0.66, y: 0.52, visibility: 0.93 };
    landmarks[15] = { x: 0.33, y: 0.68, visibility: 0.91 };
    landmarks[16] = { x: 0.67, y: 0.68, visibility: 0.91 };

    // Hips upright
    landmarks[23] = { x: 0.42 + microSway * 0.5, y: 0.58, visibility: 0.97 };
    landmarks[24] = { x: 0.58 + microSway * 0.5, y: 0.58, visibility: 0.97 };

    // Extended straight legs (knees > 165°, ankles below knees)
    landmarks[25] = { x: 0.43, y: 0.77, visibility: 0.95 };
    landmarks[26] = { x: 0.57, y: 0.77, visibility: 0.95 };
    landmarks[27] = { x: 0.43, y: 0.94, visibility: 0.95 };
    landmarks[28] = { x: 0.57, y: 0.94, visibility: 0.95 };
    landmarks[29] = { x: 0.42, y: 0.96, visibility: 0.92 };
    landmarks[30] = { x: 0.58, y: 0.96, visibility: 0.92 };
    landmarks[31] = { x: 0.45, y: 0.965, visibility: 0.92 };
    landmarks[32] = { x: 0.55, y: 0.965, visibility: 0.92 };

    return landmarks;
  }

  // Handle Sitting posture synthesis
  if (mode === 'sitting') {
    const breath = Math.sin(timeSeconds * 1.2) * 0.003;
    const noseX = 0.50;
    const noseY = 0.23 + breath;

    landmarks[0] = { x: noseX, y: noseY, visibility: 0.99 };
    landmarks[7] = { x: noseX - 0.065, y: noseY - 0.005, visibility: 0.98 };
    landmarks[8] = { x: noseX + 0.065, y: noseY - 0.005, visibility: 0.98 };

    landmarks[11] = { x: 0.38, y: 0.38 + breath, visibility: 0.99 };
    landmarks[12] = { x: 0.62, y: 0.38 + breath, visibility: 0.99 };

    // Arms resting on desk/lap
    landmarks[13] = { x: 0.33, y: 0.54, visibility: 0.93 };
    landmarks[14] = { x: 0.67, y: 0.54, visibility: 0.93 };
    landmarks[15] = { x: 0.38, y: 0.64, visibility: 0.91 };
    landmarks[16] = { x: 0.62, y: 0.64, visibility: 0.91 };

    // Hips seated on chair at y = 0.68
    landmarks[23] = { x: 0.41, y: 0.68, visibility: 0.97 };
    landmarks[24] = { x: 0.59, y: 0.68, visibility: 0.97 };

    // Knees flexed forward at ~90 degrees, small vertical drop from hips
    landmarks[25] = { x: 0.39, y: 0.82, visibility: 0.95 };
    landmarks[26] = { x: 0.61, y: 0.82, visibility: 0.95 };

    // Feet planted under chair
    landmarks[27] = { x: 0.40, y: 0.95, visibility: 0.92 };
    landmarks[28] = { x: 0.60, y: 0.95, visibility: 0.92 };
    landmarks[29] = { x: 0.39, y: 0.965, visibility: 0.90 };
    landmarks[30] = { x: 0.61, y: 0.965, visibility: 0.90 };
    landmarks[31] = { x: 0.42, y: 0.97, visibility: 0.90 };
    landmarks[32] = { x: 0.58, y: 0.97, visibility: 0.90 };

    return landmarks;
  }

  // Work postures: ideal, slouch, tilt, dynamic
  let slouchFactor = 0; // 0 (upright) to 1 (slouched)
  let tiltFactor = 0;   // 0 (level) to 1 (tilted)

  if (mode === 'ideal') {
    slouchFactor = 0.05 + Math.sin(timeSeconds * 0.5) * 0.02;
    tiltFactor = 0.02;
  } else if (mode === 'slouch') {
    slouchFactor = 0.85 + Math.sin(timeSeconds * 0.8) * 0.08;
    tiltFactor = 0.15;
  } else if (mode === 'tilt') {
    slouchFactor = 0.2;
    tiltFactor = 0.8 + Math.sin(timeSeconds * 0.6) * 0.1;
  } else {
    // Dynamic cycle: 0-10s good, 10-22s slouch, 22-30s recovering
    const cycle = (timeSeconds % 30) / 30;
    if (cycle < 0.35) {
      slouchFactor = 0.1 + cycle * 0.2;
      tiltFactor = 0.05;
    } else if (cycle < 0.75) {
      slouchFactor = 0.75 + Math.sin(timeSeconds * 1.2) * 0.15;
      tiltFactor = 0.35 + Math.sin(timeSeconds * 0.9) * 0.2;
    } else {
      slouchFactor = 0.75 - (cycle - 0.75) * 2.5;
      tiltFactor = 0.1;
    }
  }

  const headForwardOffset = slouchFactor * 0.045;
  const headDrop = slouchFactor * 0.025;
  const leftShoulderHike = tiltFactor * 0.035;

  const noseX = 0.50 + Math.sin(timeSeconds * 0.4) * 0.005;
  const noseY = 0.24 + headDrop;

  const leftShoulderX = 0.38;
  const leftShoulderY = 0.42 - leftShoulderHike;

  const rightShoulderX = 0.62;
  const rightShoulderY = 0.42 + (tiltFactor * 0.01);

  const leftHipX = 0.41;
  const leftHipY = 0.70;

  const rightHipX = 0.59;
  const rightHipY = 0.70;

  landmarks[0] = { x: noseX, y: noseY, visibility: 0.99 };
  landmarks[1] = { x: noseX - 0.015, y: noseY - 0.015, visibility: 0.98 };
  landmarks[2] = { x: noseX - 0.025, y: noseY - 0.015, visibility: 0.98 };
  landmarks[3] = { x: noseX - 0.035, y: noseY - 0.015, visibility: 0.98 };
  landmarks[4] = { x: noseX + 0.015, y: noseY - 0.015, visibility: 0.98 };
  landmarks[5] = { x: noseX + 0.025, y: noseY - 0.015, visibility: 0.98 };
  landmarks[6] = { x: noseX + 0.035, y: noseY - 0.015, visibility: 0.98 };
  landmarks[7] = { x: noseX - 0.065 + headForwardOffset, y: noseY - 0.005, visibility: 0.97 };
  landmarks[8] = { x: noseX + 0.065 + headForwardOffset, y: noseY - 0.005, visibility: 0.97 };
  landmarks[9] = { x: noseX - 0.018, y: noseY + 0.025, visibility: 0.95 };
  landmarks[10] = { x: noseX + 0.018, y: noseY + 0.025, visibility: 0.95 };

  landmarks[11] = { x: leftShoulderX, y: leftShoulderY, visibility: 0.99 };
  landmarks[12] = { x: rightShoulderX, y: rightShoulderY, visibility: 0.99 };

  landmarks[13] = { x: leftShoulderX - 0.06, y: leftShoulderY + 0.16, visibility: 0.92 };
  landmarks[14] = { x: rightShoulderX + 0.06, y: rightShoulderY + 0.16, visibility: 0.92 };
  landmarks[15] = { x: leftShoulderX - 0.08, y: leftShoulderY + 0.30, visibility: 0.90 };
  landmarks[16] = { x: rightShoulderX + 0.08, y: rightShoulderY + 0.30, visibility: 0.90 };

  landmarks[23] = { x: leftHipX, y: leftHipY, visibility: 0.95 };
  landmarks[24] = { x: rightHipX, y: rightHipY, visibility: 0.95 };

  landmarks[25] = { x: leftHipX - 0.02, y: 0.85, visibility: 0.88 };
  landmarks[26] = { x: rightHipX + 0.02, y: 0.85, visibility: 0.88 };
  landmarks[27] = { x: leftHipX - 0.02, y: 0.96, visibility: 0.85 };
  landmarks[28] = { x: rightHipX + 0.02, y: 0.96, visibility: 0.85 };

  return landmarks;
}
