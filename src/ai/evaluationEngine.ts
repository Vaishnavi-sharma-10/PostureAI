import {
  ActivityType,
  EvaluationSample,
  EvaluationReport,
  ClassPerformanceMetrics,
  NormalizedLandmark
} from '../types';
import { ActivityClassifierEngine } from './activityClassifier';
import { generateSyntheticPose, DemoPoseType } from '../posture/poseDetector';

export const EVALUATION_CLASSES: ActivityType[] = [
  'standing',
  'sitting',
  'walking',
  'running',
  'unknown'
];

/**
 * Generates a temporal landmark sequence for a specific activity with controlled noise and scale
 */
export function generateBenchmarkSequence(
  label: ActivityType,
  id: string,
  name: string,
  durationSec: number = 2.5,
  fps: number = 30,
  options?: {
    distanceScale?: number; // scale distance from camera (affects torso length)
    lowVisibility?: boolean;
    noiseAmount?: number;
    transitional?: boolean;
  }
): EvaluationSample {
  const framesCount = Math.round(durationSec * fps);
  const frames: { timestamp: number; landmarks: NormalizedLandmark[] }[] = [];
  const startTime = 1000;
  const dtMs = 1000 / fps;

  const scale = options?.distanceScale ?? 1.0;
  const isLowVis = options?.lowVisibility ?? false;
  const noise = options?.noiseAmount ?? 0.002;

  let demoType: DemoPoseType = 'standing';
  if (label === 'sitting') demoType = 'sitting';
  else if (label === 'walking') demoType = 'walking';
  else if (label === 'running') demoType = 'running';
  else if (label === 'unknown') demoType = 'dynamic';

  for (let i = 0; i < framesCount; i++) {
    const timeSec = (i * dtMs) / 1000;
    const timestamp = startTime + i * dtMs;

    // Transition effect if requested
    let currentDemoType = demoType;
    if (options?.transitional) {
      currentDemoType = timeSec < durationSec / 2 ? 'standing' : 'sitting';
    }

    const baseLandmarks = generateSyntheticPose(timeSec, currentDemoType);

    // Apply distance scale and noise
    const processedLandmarks: NormalizedLandmark[] = baseLandmarks.map((lm) => {
      const centerX = 0.5;
      const centerY = 0.5;
      const scaledX = centerX + (lm.x - centerX) * scale + (Math.random() - 0.5) * noise;
      const scaledY = centerY + (lm.y - centerY) * scale + (Math.random() - 0.5) * noise;
      const vis = isLowVis ? Math.max(0.15, (lm.visibility ?? 0.9) * 0.35) : (lm.visibility ?? 0.95);

      return {
        x: Number(scaledX.toFixed(4)),
        y: Number(scaledY.toFixed(4)),
        z: lm.z ?? 0,
        visibility: Number(vis.toFixed(3))
      };
    });

    frames.push({
      timestamp,
      landmarks: processedLandmarks
    });
  }

  return {
    id,
    label,
    name,
    frames
  };
}

/**
 * Creates the standard validation benchmark dataset containing 50 diverse sequences across all classes
 */
export function createStandardBenchmarkDataset(): EvaluationSample[] {
  const dataset: EvaluationSample[] = [];

  // 1. Standing sequences (10 samples)
  for (let i = 1; i <= 10; i++) {
    const scale = 0.75 + (i % 4) * 0.15; // varying camera distances
    dataset.push(
      generateBenchmarkSequence(
        'standing',
        `std-${i}`,
        `Standing Baseline ${i} (Dist scale: ${scale.toFixed(2)})`,
        2.5,
        30,
        { distanceScale: scale, noiseAmount: 0.003 }
      )
    );
  }

  // 2. Sitting sequences (10 samples)
  for (let i = 1; i <= 10; i++) {
    const scale = 0.8 + (i % 3) * 0.15;
    dataset.push(
      generateBenchmarkSequence(
        'sitting',
        `sit-${i}`,
        `Seated Posture ${i} (Desk ergonomics, scale: ${scale.toFixed(2)})`,
        2.5,
        30,
        { distanceScale: scale, noiseAmount: 0.003 }
      )
    );
  }

  // 3. Walking sequences (10 samples)
  for (let i = 1; i <= 10; i++) {
    const scale = 0.85 + (i % 3) * 0.12;
    dataset.push(
      generateBenchmarkSequence(
        'walking',
        `wlk-${i}`,
        `Walking Gait ${i} (Alternating stride, scale: ${scale.toFixed(2)})`,
        2.6,
        30,
        { distanceScale: scale, noiseAmount: 0.004 }
      )
    );
  }

  // 4. Running sequences (10 samples)
  for (let i = 1; i <= 10; i++) {
    const scale = 0.8 + (i % 4) * 0.12;
    dataset.push(
      generateBenchmarkSequence(
        'running',
        `run-${i}`,
        `Running Stride ${i} (High tempo cadence, scale: ${scale.toFixed(2)})`,
        2.6,
        30,
        { distanceScale: scale, noiseAmount: 0.005 }
      )
    );
  }

  // 5. Unknown / Edge cases sequences (10 samples)
  // Low visibility
  for (let i = 1; i <= 4; i++) {
    dataset.push(
      generateBenchmarkSequence(
        'unknown',
        `unk-vis-${i}`,
        `Low Visibility Lighting ${i} (Occlusion / Dark room)`,
        2.5,
        30,
        { lowVisibility: true }
      )
    );
  }
  // Transitional stand-to-sit
  for (let i = 1; i <= 4; i++) {
    dataset.push(
      generateBenchmarkSequence(
        'unknown',
        `unk-trans-${i}`,
        `Stand-to-Sit Transition ${i} (Ambiguous phase)`,
        2.5,
        30,
        { transitional: true }
      )
    );
  }
  // Noisy movement
  for (let i = 1; i <= 2; i++) {
    dataset.push(
      generateBenchmarkSequence(
        'unknown',
        `unk-noise-${i}`,
        `Irregular Fidgeting / Multi-axis Noise ${i}`,
        2.5,
        30,
        { noiseAmount: 0.045 }
      )
    );
  }

  return dataset;
}

/**
 * Runs evaluation on a labeled dataset and computes statistical performance metrics:
 * Confusion Matrix, Precision, Recall, F1 Score, Per-Class Accuracy, and Overall Accuracy
 */
export function runModelEvaluation(
  samples: EvaluationSample[],
  onProgress?: (completed: number, total: number) => void
): EvaluationReport {
  const classes = EVALUATION_CLASSES;
  const nClasses = classes.length;
  const classIndexMap = new Map<ActivityType, number>();
  classes.forEach((c, i) => classIndexMap.set(c, i));

  // Confusion matrix: [trueIndex][predIndex]
  const matrix: number[][] = Array.from({ length: nClasses }, () =>
    new Array(nClasses).fill(0)
  );

  let totalCorrect = 0;

  samples.forEach((sample, sampleIdx) => {
    // Instantiate a fresh classifier instance to avoid state bleed between benchmark sequences
    const engine = new ActivityClassifierEngine();
    let finalPrediction: ActivityType = 'unknown';

    // Feed entire temporal sequence into engine
    for (const frame of sample.frames) {
      const res = engine.update(frame.landmarks, frame.timestamp, 1);
      finalPrediction = res.activity;
    }

    const trueIdx = classIndexMap.get(sample.label) ?? classIndexMap.get('unknown')!;
    const predIdx = classIndexMap.get(finalPrediction) ?? classIndexMap.get('unknown')!;

    matrix[trueIdx][predIdx] += 1;

    if (sample.label === finalPrediction) {
      totalCorrect += 1;
    }

    if (onProgress) {
      onProgress(sampleIdx + 1, samples.length);
    }
  });

  // Calculate per-class metrics
  const classMetrics: Record<ActivityType, ClassPerformanceMetrics> = {} as any;

  classes.forEach((className, i) => {
    const TP = matrix[i][i];

    let FP = 0;
    for (let row = 0; row < nClasses; row++) {
      if (row !== i) FP += matrix[row][i];
    }

    let FN = 0;
    for (let col = 0; col < nClasses; col++) {
      if (col !== i) FN += matrix[i][col];
    }

    let TN = 0;
    for (let row = 0; row < nClasses; row++) {
      for (let col = 0; col < nClasses; col++) {
        if (row !== i && col !== i) TN += matrix[row][col];
      }
    }

    const classTotal = TP + FN;
    const precision = TP + FP > 0 ? Number(((TP / (TP + FP)) * 100).toFixed(1)) : 0;
    const recall = TP + FN > 0 ? Number(((TP / (TP + FN)) * 100).toFixed(1)) : 0;
    const f1Score =
      precision + recall > 0
        ? Number(((2 * precision * recall) / (precision + recall)).toFixed(1))
        : 0;
    const accuracy = samples.length > 0 ? Number((((TP + TN) / samples.length) * 100).toFixed(1)) : 0;

    classMetrics[className] = {
      className,
      truePositives: TP,
      trueNegatives: TN,
      falsePositives: FP,
      falseNegatives: FN,
      totalSamples: classTotal,
      precision,
      recall,
      f1Score,
      accuracy
    };
  });

  const overallAccuracy =
    samples.length > 0
      ? Number(((totalCorrect / samples.length) * 100).toFixed(1))
      : 0;

  return {
    timestamp: Date.now(),
    totalSamples: samples.length,
    overallAccuracy,
    classes: classMetrics,
    confusionMatrix: {
      labels: classes,
      matrix
    }
  };
}
