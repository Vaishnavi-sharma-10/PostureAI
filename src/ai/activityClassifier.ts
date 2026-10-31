import {
  NormalizedLandmark,
  ActivityType,
  ActivityClassification,
  ActivityTelemetryFeatures,
  UserBodyCalibration
} from '../types';

export interface NormalizedBodyMeasurements {
  torsoLength: number;
  bodyHeightEst: number;
  shoulderWidth: number;
  hipWidth: number;
  upperLegLengthL: number;
  upperLegLengthR: number;
  lowerLegLengthL: number;
  lowerLegLengthR: number;
  kneeAngleL: number;
  kneeAngleR: number;
  hipAngleL: number;
  hipAngleR: number;
  ankleSeparation: number;
  verticalBodyPos: number;
  torsoOrientation: 'front' | 'side' | 'oblique';
  leftRightSymmetry: number;
  avgVisibility: number;
  keyLandmarkVisibilities: {
    nose: number;
    shoulders: number;
    hips: number;
    knees: number;
    ankles: number;
    feet: number;
  };
}

export interface ActivityFrame {
  timestamp: number;
  landmarks: NormalizedLandmark[];
  visibility: number;
  normalizedBodyMeasurements: NormalizedBodyMeasurements;
  displacementNorm: number;
  velocityNorm: number; // torso lengths / second
  verticalVelocityNorm: number;
  horizontalVelocityNorm: number;
  accelerationNorm: number;
}

export interface TemporalActivityConfig {
  windowDurationMs: number; // 1500 to 2500ms
  minWindowDurationMs: number; // 800ms before confident classification
  minLandmarkVisibility: number; // 0.45
  minConfidenceThreshold: number; // 50%
  hysteresisThresholdMs: number; // 600ms to switch stable state
}

export const DEFAULT_ACTIVITY_CONFIG: TemporalActivityConfig = {
  windowDurationMs: 2200,
  minWindowDurationMs: 800,
  minLandmarkVisibility: 0.45,
  minConfidenceThreshold: 52,
  hysteresisThresholdMs: 650
};

/**
 * Calculates Euclidean distance between two points in 2D
 */
function distance2D(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Calculates 3-point angle in degrees (vertex at p2)
 */
function angle3Points(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);

  if (mag1 < 1e-6 || mag2 < 1e-6) return 180;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Extracts body-relative measurements normalized by torso length
 */
export function extractNormalizedMeasurements(
  landmarks: NormalizedLandmark[]
): NormalizedBodyMeasurements {
  const nose = landmarks[0] || { x: 0.5, y: 0.2, visibility: 0 };
  const lSh = landmarks[11] || { x: 0.45, y: 0.35, visibility: 0 };
  const rSh = landmarks[12] || { x: 0.55, y: 0.35, visibility: 0 };
  const lHip = landmarks[23] || { x: 0.46, y: 0.55, visibility: 0 };
  const rHip = landmarks[24] || { x: 0.54, y: 0.55, visibility: 0 };
  const lKnee = landmarks[25] || { x: 0.46, y: 0.72, visibility: 0 };
  const rKnee = landmarks[26] || { x: 0.54, y: 0.72, visibility: 0 };
  const lAnk = landmarks[27] || { x: 0.46, y: 0.90, visibility: 0 };
  const rAnk = landmarks[28] || { x: 0.54, y: 0.90, visibility: 0 };
  const lHeel = landmarks[29] || lAnk;
  const rHeel = landmarks[30] || rAnk;
  const lFoot = landmarks[31] || lAnk;
  const rFoot = landmarks[32] || rAnk;

  const midSh = { x: (lSh.x + rSh.x) / 2, y: (lSh.y + rSh.y) / 2 };
  const midHip = { x: (lHip.x + rHip.x) / 2, y: (lHip.y + rHip.y) / 2 };

  // Torso length serves as the intrinsic body scale ruler
  const rawTorso = distance2D(midSh, midHip);
  const torsoLength = Math.max(0.10, rawTorso);

  const shoulderWidth = distance2D(lSh, rSh);
  const hipWidth = distance2D(lHip, rHip);

  const upperLegLengthL = distance2D(lHip, lKnee);
  const upperLegLengthR = distance2D(rHip, rKnee);
  const lowerLegLengthL = distance2D(lKnee, lAnk);
  const lowerLegLengthR = distance2D(rKnee, rAnk);

  const avgUpperLeg = (upperLegLengthL + upperLegLengthR) / 2;
  const avgLowerLeg = (lowerLegLengthL + lowerLegLengthR) / 2;
  const bodyHeightEst = torsoLength + avgUpperLeg + avgLowerLeg;

  // Joint Angles
  const kneeAngleL = angle3Points(lHip, lKnee, lAnk);
  const kneeAngleR = angle3Points(rHip, rKnee, rAnk);
  const hipAngleL = angle3Points(lSh, lHip, lKnee);
  const hipAngleR = angle3Points(rSh, rHip, rKnee);

  const ankleSeparation = distance2D(lAnk, rAnk) / torsoLength;
  const verticalBodyPos = midHip.y;

  // Torso Orientation
  const widthToTorsoRatio = shoulderWidth / torsoLength;
  let torsoOrientation: 'front' | 'side' | 'oblique' = 'front';
  if (widthToTorsoRatio < 0.45) {
    torsoOrientation = 'side';
  } else if (widthToTorsoRatio < 0.70) {
    torsoOrientation = 'oblique';
  }

  // Left/Right vertical symmetry delta
  const shoulderDiff = Math.abs(lSh.y - rSh.y);
  const hipDiff = Math.abs(lHip.y - rHip.y);
  const leftRightSymmetry = Math.max(0, 1 - (shoulderDiff + hipDiff) / torsoLength);

  // Visibilities
  const noseVis = nose.visibility ?? 1.0;
  const shVis = ((lSh.visibility ?? 1.0) + (rSh.visibility ?? 1.0)) / 2;
  const hipVis = ((lHip.visibility ?? 1.0) + (rHip.visibility ?? 1.0)) / 2;
  const kneeVis = ((lKnee.visibility ?? 1.0) + (rKnee.visibility ?? 1.0)) / 2;
  const ankVis = ((lAnk.visibility ?? 1.0) + (rAnk.visibility ?? 1.0)) / 2;
  const feetVis =
    ((lHeel.visibility ?? 1.0) +
      (rHeel.visibility ?? 1.0) +
      (lFoot.visibility ?? 1.0) +
      (rFoot.visibility ?? 1.0)) /
    4;

  const avgVisibility = (noseVis + shVis * 2 + hipVis * 2 + kneeVis * 2 + ankVis * 2) / 9;

  return {
    torsoLength,
    bodyHeightEst,
    shoulderWidth,
    hipWidth,
    upperLegLengthL,
    upperLegLengthR,
    lowerLegLengthL,
    lowerLegLengthR,
    kneeAngleL,
    kneeAngleR,
    hipAngleL,
    hipAngleR,
    ankleSeparation,
    verticalBodyPos,
    torsoOrientation,
    leftRightSymmetry,
    avgVisibility,
    keyLandmarkVisibilities: {
      nose: noseVis,
      shoulders: shVis,
      hips: hipVis,
      knees: kneeVis,
      ankles: ankVis,
      feet: feetVis
    }
  };
}

/**
 * Activity Classification Engine with Temporal Sequence Analysis (1-3 second rolling window)
 */
export class ActivityClassifierEngine {
  private buffer: ActivityFrame[] = [];
  private config: TemporalActivityConfig;
  private userCalibration: UserBodyCalibration | null = null;

  // Temporal smoothing state
  private stableActivity: ActivityType = 'unknown';
  private candidateActivity: ActivityType = 'unknown';
  private candidateSinceMs: number = 0;
  private recentPredictions: ActivityType[] = [];

  constructor(config?: Partial<TemporalActivityConfig>) {
    this.config = { ...DEFAULT_ACTIVITY_CONFIG, ...config };
  }

  public setCalibration(calibration: UserBodyCalibration | null) {
    this.userCalibration = calibration;
  }

  public reset() {
    this.buffer = [];
    this.stableActivity = 'unknown';
    this.candidateActivity = 'unknown';
    this.candidateSinceMs = 0;
    this.recentPredictions = [];
  }

  /**
   * Main classification method called on every video frame
   */
  public update(
    landmarks: NormalizedLandmark[] | null,
    timestampMs: number,
    personCount: number = 1
  ): ActivityClassification {
    // 1. Check for missing or multiple persons
    if (personCount === 0 || !landmarks || landmarks.length < 25) {
      this.reset();
      return {
        activity: 'no_person',
        label: 'No Person Detected',
        confidence: 0,
        stability: 'unknown',
        details: 'Step into the camera viewport to begin tracking.',
        reasons: ['No pose landmarks detected in frame', 'Zero person bounding boxes active']
      };
    }

    if (personCount > 1) {
      return {
        activity: 'multiple_people',
        label: 'Multiple People Detected',
        confidence: 0,
        stability: 'unknown',
        details: 'Single occupant required for accurate ergonomic tracking.',
        reasons: [
          `Detected ${personCount} simultaneous bodies in frame`,
          'Postural kinematics requires a single calibrated subject'
        ]
      };
    }

    // 2. Extract measurements
    const measurements = extractNormalizedMeasurements(landmarks);

    // 3. Compute frame derivatives relative to previous frame
    let displacementNorm = 0;
    let velocityNorm = 0;
    let verticalVelocityNorm = 0;
    let horizontalVelocityNorm = 0;
    let accelerationNorm = 0;

    const prevFrame = this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;

    if (prevFrame) {
      const dt = Math.max(0.001, (timestampMs - prevFrame.timestamp) / 1000);
      const lHip = landmarks[23];
      const rHip = landmarks[24];
      const prevLHip = prevFrame.landmarks[23];
      const prevRHip = prevFrame.landmarks[24];

      const currentMidHip = { x: (lHip.x + rHip.x) / 2, y: (lHip.y + rHip.y) / 2 };
      const prevMidHip = { x: (prevLHip.x + prevRHip.x) / 2, y: (prevLHip.y + prevRHip.y) / 2 };

      const dx = (currentMidHip.x - prevMidHip.x) / measurements.torsoLength;
      const dy = (currentMidHip.y - prevMidHip.y) / measurements.torsoLength;
      displacementNorm = Math.hypot(dx, dy);

      velocityNorm = displacementNorm / dt;
      verticalVelocityNorm = Math.abs(dy) / dt;
      horizontalVelocityNorm = Math.abs(dx) / dt;

      accelerationNorm = Math.abs(velocityNorm - prevFrame.velocityNorm) / dt;
    }

    // 4. Append to rolling temporal sequence buffer
    const currentFrame: ActivityFrame = {
      timestamp: timestampMs,
      landmarks,
      visibility: measurements.avgVisibility,
      normalizedBodyMeasurements: measurements,
      displacementNorm,
      velocityNorm,
      verticalVelocityNorm,
      horizontalVelocityNorm,
      accelerationNorm
    };

    this.buffer.push(currentFrame);

    // Prune buffer outside window
    const windowCutoff = timestampMs - this.config.windowDurationMs;
    while (this.buffer.length > 0 && this.buffer[0].timestamp < windowCutoff) {
      this.buffer.shift();
    }

    // 5. Evaluate buffer duration and quality
    const windowDuration =
      this.buffer.length > 1
        ? this.buffer[this.buffer.length - 1].timestamp - this.buffer[0].timestamp
        : 0;

    if (windowDuration < this.config.minWindowDurationMs) {
      return {
        activity: 'unknown',
        label: 'Analyzing Movement...',
        confidence: Math.round((windowDuration / this.config.minWindowDurationMs) * 45),
        stability: 'transitional',
        details: 'Acquiring temporal sequence buffer (1–3s window)...',
        reasons: [
          `Accumulating temporal window: ${(windowDuration / 1000).toFixed(1)}s / ${(this.config.minWindowDurationMs / 1000).toFixed(1)}s`,
          'Temporal periodicity calculation requires minimum sequence history'
        ]
      };
    }

    // 6. Check landmark quality
    if (measurements.avgVisibility < this.config.minLandmarkVisibility) {
      return {
        activity: 'unknown',
        label: 'Low Landmark Visibility',
        confidence: Math.round(measurements.avgVisibility * 100),
        stability: 'unknown',
        details: 'Ensure proper lighting and avoid occluding your lower body.',
        reasons: [
          `Average landmark visibility: ${(measurements.avgVisibility * 100).toFixed(0)}% (threshold: ${(this.config.minLandmarkVisibility * 100).toFixed(0)}%)`,
          'Hip, knee, and ankle keypoints require clear optical contrast'
        ]
      };
    }

    // 7. Extract Temporal Features across sequence
    const features = this.extractTemporalFeatures();

    // 8. Calculate evidence scores for each activity
    const classificationDecision = this.classifyFromFeatures(features);

    // 9. Apply Hysteresis & Temporal Smoothing
    const smoothedResult = this.applyTemporalSmoothing(
      classificationDecision.activity,
      classificationDecision.confidence,
      timestampMs,
      classificationDecision.reasons,
      features
    );

    return smoothedResult;
  }

  /**
   * Calculates features over the active rolling temporal window
   */
  private extractTemporalFeatures(): ActivityTelemetryFeatures {
    const n = this.buffer.length;
    const windowDurationMs = this.buffer[n - 1].timestamp - this.buffer[0].timestamp;

    let sumVelocity = 0;
    let sumAcceleration = 0;
    let sumVertVel = 0;
    let sumHorizVel = 0;
    let sumKneeL = 0;
    let sumKneeR = 0;
    let sumHipL = 0;
    let sumHipR = 0;
    let sumVis = 0;
    let sumTorso = 0;
    let sumSymmetry = 0;
    let sumFootSep = 0;

    let minHipY = Infinity;
    let maxHipY = -Infinity;

    // Track left vs right ankle relative positions for stride / cadence calculation
    const ankleDeltaSeries: number[] = [];

    for (let i = 0; i < n; i++) {
      const f = this.buffer[i];
      const m = f.normalizedBodyMeasurements;

      sumVelocity += f.velocityNorm;
      sumAcceleration += f.accelerationNorm;
      sumVertVel += f.verticalVelocityNorm;
      sumHorizVel += f.horizontalVelocityNorm;
      sumKneeL += m.kneeAngleL;
      sumKneeR += m.kneeAngleR;
      sumHipL += m.hipAngleL;
      sumHipR += m.hipAngleR;
      sumVis += m.avgVisibility;
      sumTorso += m.torsoLength;
      sumSymmetry += m.leftRightSymmetry;
      sumFootSep += m.ankleSeparation;

      const midHipY = m.verticalBodyPos;
      if (midHipY < minHipY) minHipY = midHipY;
      if (midHipY > maxHipY) maxHipY = midHipY;

      // Ankle phase difference (left - right) in X and Y
      const lAnk = f.landmarks[27];
      const rAnk = f.landmarks[28];
      const lKnee = f.landmarks[25];
      const rKnee = f.landmarks[26];

      // Normalized leg displacement delta
      const legDelta = ((lAnk.x - rAnk.x) + (lAnk.y - rAnk.y) * 0.5 + (lKnee.y - rKnee.y) * 0.8) / m.torsoLength;
      ankleDeltaSeries.push(legDelta);
    }

    const avgVelocity = sumVelocity / n;
    const avgAcceleration = sumAcceleration / n;
    const avgVertVel = sumVertVel / n;
    const avgHorizVel = sumHorizVel / n;
    const avgKneeL = sumKneeL / n;
    const avgKneeR = sumKneeR / n;
    const avgHipL = sumHipL / n;
    const avgHipR = sumHipR / n;
    const avgVisibility = sumVis / n;
    const avgTorso = sumTorso / n;
    const avgSymmetry = sumSymmetry / n;
    const avgFootSep = sumFootSep / n;

    const verticalDisplacement = (maxHipY - minHipY) / (avgTorso || 1);

    // Periodicity & Cadence Analysis (Zero-crossing & autocorrelation of stride delta)
    const { cadenceHz, periodicityScore } = this.analyzePeriodicity(
      ankleDeltaSeries,
      windowDurationMs
    );

    const movementScore = avgVelocity * 0.5 + avgVertVel * 0.3 + (verticalDisplacement * 2);

    const latestOrientation = this.buffer[n - 1].normalizedBodyMeasurements.torsoOrientation;

    return {
      windowDurationMs,
      frameCount: n,
      avgVisibility,
      torsoLength: avgTorso,
      normalizedVelocity: avgVelocity,
      normalizedAcceleration: avgAcceleration,
      verticalDisplacement,
      verticalVelocity: avgVertVel,
      horizontalVelocity: avgHorizVel,
      kneeAngleLeft: avgKneeL,
      kneeAngleRight: avgKneeR,
      hipAngleLeft: avgHipL,
      hipAngleRight: avgHipR,
      strideCadenceHz: cadenceHz,
      periodicityScore,
      leftRightSymmetry: avgSymmetry,
      footSeparation: avgFootSep,
      movementScore,
      orientationDetected: latestOrientation
    };
  }

  /**
   * Computes stride cadence (Hz) and periodicity strength from alternating leg displacements
   */
  private analyzePeriodicity(
    series: number[],
    durationMs: number
  ): { cadenceHz: number; periodicityScore: number } {
    if (series.length < 10 || durationMs <= 0) {
      return { cadenceHz: 0, periodicityScore: 0 };
    }

    // Mean center the series
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    const centered = series.map((v) => v - mean);

    // Count zero crossings with hysteresis
    let zeroCrossings = 0;
    const threshold = 0.04; // Noise guard
    let lastSign = 0;

    for (let i = 0; i < centered.length; i++) {
      const val = centered[i];
      if (Math.abs(val) > threshold) {
        const sign = val > 0 ? 1 : -1;
        if (lastSign !== 0 && sign !== lastSign) {
          zeroCrossings++;
        }
        lastSign = sign;
      }
    }

    // Full cycle is 2 zero crossings
    const cycles = zeroCrossings / 2;
    const durationSec = durationMs / 1000;
    const rawCadence = cycles / durationSec;

    // Variance/Amplitude of leg oscillation
    const variance =
      centered.reduce((acc, v) => acc + v * v, 0) / centered.length;
    const amplitude = Math.sqrt(variance);

    // Periodicity score based on oscillation regularity & amplitude
    let periodicityScore = 0;
    if (amplitude > 0.08 && cycles >= 0.8) {
      periodicityScore = Math.min(1.0, (amplitude / 0.35) * (Math.min(3, cycles) / 2));
    }

    return {
      cadenceHz: Number(rawCadence.toFixed(2)),
      periodicityScore: Number(periodicityScore.toFixed(2))
    };
  }

  /**
   * Evidence-based multi-class scoring using normalized biomechanical features
   */
  private classifyFromFeatures(features: ActivityTelemetryFeatures): {
    activity: ActivityType;
    confidence: number;
    reasons: string[];
  } {
    const {
      normalizedVelocity,
      verticalDisplacement,
      kneeAngleLeft,
      kneeAngleRight,
      strideCadenceHz,
      periodicityScore,
      avgVisibility
    } = features;

    const avgKneeAngle = (kneeAngleLeft + kneeAngleRight) / 2;
    const isKneeFlexed = avgKneeAngle < 135; // typical sitting flexion: 80° - 120°
    const isKneeExtended = avgKneeAngle > 152; // standing: ~160° - 180°

    const scores: Record<ActivityType, number> = {
      standing: 0,
      sitting: 0,
      walking: 0,
      running: 0,
      unknown: 0,
      no_person: 0,
      multiple_people: 0
    };

    const reasonsMap: Record<ActivityType, string[]> = {
      standing: [],
      sitting: [],
      walking: [],
      running: [],
      unknown: [],
      no_person: [],
      multiple_people: []
    };

    // ----------------------------------------
    // 1. SITTING EVIDENCE EVALUATION
    // ----------------------------------------
    if (isKneeFlexed) {
      scores.sitting += 45;
      reasonsMap.sitting.push(
        `Bilateral knee flexion detected (L: ${kneeAngleLeft.toFixed(0)}°, R: ${kneeAngleRight.toFixed(0)}°)`
      );
    }
    if (normalizedVelocity < 0.32) {
      scores.sitting += 25;
      reasonsMap.sitting.push(`Low kinematic velocity (${normalizedVelocity.toFixed(2)} torso/s)`);
    }
    if (periodicityScore < 0.25) {
      scores.sitting += 15;
      reasonsMap.sitting.push('Minimal cyclic leg oscillation');
    }
    if (verticalDisplacement < 0.15) {
      scores.sitting += 15;
      reasonsMap.sitting.push('Stable seated pelvic elevation');
    }

    // ----------------------------------------
    // 2. STANDING EVIDENCE EVALUATION
    // ----------------------------------------
    if (isKneeExtended) {
      scores.standing += 45;
      reasonsMap.standing.push(
        `Bilateral knee extension (L: ${kneeAngleLeft.toFixed(0)}°, R: ${kneeAngleRight.toFixed(0)}°)`
      );
    }
    if (normalizedVelocity < 0.28) {
      scores.standing += 30;
      reasonsMap.standing.push(`Stationary stance velocity (${normalizedVelocity.toFixed(2)} torso/s)`);
    }
    if (periodicityScore < 0.25) {
      scores.standing += 15;
      reasonsMap.standing.push('No gait stride cycle detected');
    }
    if (verticalDisplacement < 0.12) {
      scores.standing += 10;
      reasonsMap.standing.push('Stable vertical plumbline');
    }

    // ----------------------------------------
    // 3. WALKING EVIDENCE EVALUATION
    // ----------------------------------------
    if (periodicityScore > 0.30) {
      scores.walking += 35;
      reasonsMap.walking.push(`Alternating leg stride cycle (cadence: ${strideCadenceHz.toFixed(1)} Hz)`);
    }
    if (strideCadenceHz >= 0.7 && strideCadenceHz <= 2.2) {
      scores.walking += 25;
      reasonsMap.walking.push(`Cadence matches natural walking range (0.8–2.2 Hz)`);
    }
    if (normalizedVelocity >= 0.25 && normalizedVelocity <= 1.25) {
      scores.walking += 25;
      reasonsMap.walking.push(`Moderate gait velocity (${normalizedVelocity.toFixed(2)} torso/s)`);
    }
    if (verticalDisplacement > 0.04 && verticalDisplacement < 0.30) {
      scores.walking += 15;
      reasonsMap.walking.push(`Rhythmic vertical gait bounce (${(verticalDisplacement * 100).toFixed(0)}% torso)`);
    }

    // ----------------------------------------
    // 4. RUNNING EVIDENCE EVALUATION
    // ----------------------------------------
    if (normalizedVelocity > 1.20) {
      scores.running += 35;
      reasonsMap.running.push(`High movement velocity (${normalizedVelocity.toFixed(2)} torso/s)`);
    }
    if (strideCadenceHz > 2.0) {
      scores.running += 30;
      reasonsMap.running.push(`High-cadence stride cycle (${strideCadenceHz.toFixed(1)} Hz)`);
    }
    if (verticalDisplacement >= 0.25) {
      scores.running += 20;
      reasonsMap.running.push(`Substantial vertical flight oscillation (${(verticalDisplacement * 100).toFixed(0)}% torso)`);
    }
    if (periodicityScore > 0.45) {
      scores.running += 15;
      reasonsMap.running.push('Intense periodic leg propulsion');
    }

    // Find highest scoring activity
    const candidates: ActivityType[] = ['standing', 'sitting', 'walking', 'running'];
    let bestActivity: ActivityType = 'unknown';
    let highestScore = 0;
    let secondScore = 0;

    for (const act of candidates) {
      const s = scores[act];
      if (s > highestScore) {
        secondScore = highestScore;
        highestScore = s;
        bestActivity = act;
      } else if (s > secondScore) {
        secondScore = s;
      }
    }

    // Mathematical confidence derived from score and separation margin
    const margin = highestScore - secondScore;
    const rawConfidence = Math.min(96, Math.max(20, highestScore * 0.7 + margin * 0.3));
    const confidence = Math.round(rawConfidence * Math.min(1.0, avgVisibility * 1.1));

    // Ambiguity guard: If confidence is below threshold or score margin is too small, report unknown
    if (confidence < this.config.minConfidenceThreshold || highestScore < 50) {
      console.debug('[Activity scores]', {
  bestActivity,
  highestScore,
  secondScore,
  confidence,
  avgVisibility,
});
      return {
        activity: 'unknown',
        confidence: Math.max(25, confidence),
        reasons: [
          'Ambiguous movement pattern between kinematic states',
          `Highest candidate (${bestActivity}): ${highestScore} pts, Runner-up: ${secondScore} pts`,
          'Temporal evidence does not surpass decisive threshold'
        ]
      };
    }

    return {
      activity: bestActivity,
      confidence,
      reasons: reasonsMap[bestActivity]
    };
  }

  /**
   * Applies temporal smoothing and hysteresis to avoid rapid state flickering
   */
  private applyTemporalSmoothing(
    instantActivity: ActivityType,
    instantConfidence: number,
    timestampMs: number,
    instantReasons: string[],
    features: ActivityTelemetryFeatures
  ): ActivityClassification {
    // Record recent prediction
    this.recentPredictions.push(instantActivity);
    if (this.recentPredictions.length > 20) {
      this.recentPredictions.shift();
    }

    // Check candidate state duration for hysteresis
    if (instantActivity !== this.candidateActivity) {
      this.candidateActivity = instantActivity;
      this.candidateSinceMs = timestampMs;
    }

    const candidateDuration = timestampMs - this.candidateSinceMs;

    // Hysteresis rule:
    // To change stable state, require either:
    // 1. Candidate maintained for >= hysteresisThresholdMs (e.g. 650ms), OR
    // 2. High majority vote (> 75%) over recent 15 frames
    const recentCount = this.recentPredictions.filter((p) => p === instantActivity).length;
    const majorityRatio = recentCount / this.recentPredictions.length;

    let confirmedActivity = this.stableActivity;
    let stability: 'stable' | 'moving' | 'transitional' | 'unknown' = 'stable';

    if (this.stableActivity === 'unknown') {
      // First state acquisition
      if (candidateDuration >= 500 || majorityRatio > 0.6) {
        this.stableActivity = instantActivity;
        confirmedActivity = instantActivity;
      }
    } else if (instantActivity !== this.stableActivity) {
      if (candidateDuration >= this.config.hysteresisThresholdMs || majorityRatio > 0.8) {
        this.stableActivity = instantActivity;
        confirmedActivity = instantActivity;
      } else {
        // Transitional state
        stability = 'transitional';
      }
    }

    // Set movement stability
    if (confirmedActivity === 'walking' || confirmedActivity === 'running') {
      stability = 'moving';
    } else if (confirmedActivity === 'unknown') {
      stability = 'unknown';
    }

    // Human-readable labels & coaching notices
    const { label, details, notice } = this.getActivityPresentation(
      confirmedActivity,
      stability,
      features
    );

    return {
      activity: confirmedActivity,
      label,
      confidence: instantConfidence,
      stability,
      details,
      reasons: instantReasons,
      postureAdjustedNotice: notice,
      features,
      metrics: {
        avgVelocity: Number(features.normalizedVelocity.toFixed(2)),
        stepFrequencyHz: features.strideCadenceHz,
        kneeFlexionLeft: Math.round(features.kneeAngleLeft),
        kneeFlexionRight: Math.round(features.kneeAngleRight)
      }
    };
  }

  private getActivityPresentation(
    activity: ActivityType,
    stability: 'stable' | 'moving' | 'transitional' | 'unknown',
    features: ActivityTelemetryFeatures
  ): { label: string; details: string; notice?: string } {
    switch (activity) {
      case 'standing':
        return {
          label: 'Standing',
          details: 'Upright stationary stance detected',
          notice: 'Evaluating static upright plumbline, cervical alignment, and shoulder/hip level.'
        };
      case 'sitting':
        return {
          label: 'Sitting',
          details: 'Seated posture with flexed knees detected',
          notice: 'Evaluating seated thoracic slouch, forward head drift, and pelvic ergonomics.'
        };
      case 'walking':
        return {
          label: 'Walking',
          details: `Dynamic stride detected (${features.strideCadenceHz.toFixed(1)} Hz)`,
          notice: 'Dynamic gait active: scoring spinal carriage and bilateral symmetry without penalizing limb excursion.'
        };
      case 'running':
        return {
          label: 'Running',
          details: `High-tempo stride detected (${features.strideCadenceHz.toFixed(1)} Hz)`,
          notice: 'Athletic forward lean and dynamic carriage calibrated for running form.'
        };
      case 'unknown':
      default:
        return {
          label: stability === 'transitional' ? 'Transitioning...' : 'Analyzing Movement...',
          details: 'Evaluating rolling temporal landmark sequence',
          notice: undefined
        };
    }
  }
}

// Export singleton instance for app-wide use
export const activityClassifier = new ActivityClassifierEngine();

/**
 * Convenience procedural function matching existing signature
 */
export function classifyActivity(
  landmarks: NormalizedLandmark[] | null,
  timestampMs: number,
  personCount: number = 1
): ActivityClassification {
  return activityClassifier.update(landmarks, timestampMs, personCount);
}
