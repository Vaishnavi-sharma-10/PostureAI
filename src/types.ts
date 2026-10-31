export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export type CameraViewMode = 'front' | 'side' | 'auto';

export type PostureRating = 'optimal' | 'acceptable' | 'deviated';

export type TrackingStatus =
  | 'tracking'
  | 'no_person'
  | 'partially_visible'
  | 'unreliable';

export type ActivityType =
  | 'standing'
  | 'sitting'
  | 'walking'
  | 'running'
  | 'unknown'
  | 'no_person'
  | 'multiple_people';

export interface ActivityTelemetryFeatures {
  windowDurationMs: number;
  frameCount: number;
  avgVisibility: number;
  torsoLength: number;
  normalizedVelocity: number;
  normalizedAcceleration: number;
  verticalDisplacement: number;
  verticalVelocity: number;
  horizontalVelocity: number;
  kneeAngleLeft: number;
  kneeAngleRight: number;
  hipAngleLeft: number;
  hipAngleRight: number;
  strideCadenceHz: number;
  periodicityScore: number;
  leftRightSymmetry: number;
  footSeparation: number;
  movementScore: number;
  orientationDetected: 'front' | 'side' | 'oblique';
}

export interface UserBodyCalibration {
  timestamp: number;
  isCalibrated: boolean;
  baselineTorsoLength: number;
  baselineShoulderWidth: number;
  baselineHipWidth: number;
  baselineStandingHeight: number;
  viewMode: CameraViewMode;
}

export interface ActivityClassification {
  activity: ActivityType;
  label: string; // "Standing", "Sitting", "Walking", "Running", "Analyzing...", "No Person Detected", "Multiple People Detected"
  confidence: number; // 0 - 100 calculated mathematically from evidence
  stability: 'stable' | 'moving' | 'transitional' | 'unknown';
  details: string;
  reasons?: string[];
  postureAdjustedNotice?: string;
  features?: ActivityTelemetryFeatures;
  metrics?: {
    avgVelocity?: number;
    stepFrequencyHz?: number;
    kneeFlexionLeft?: number;
    kneeFlexionRight?: number;
    torsoThighAngle?: number;
  };
}

export interface EvaluationSample {
  id: string;
  label: ActivityType;
  name: string;
  frames: {
    timestamp: number;
    landmarks: NormalizedLandmark[];
  }[];
}

export interface ClassPerformanceMetrics {
  className: ActivityType;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  totalSamples: number;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
}

export interface EvaluationReport {
  timestamp: number;
  totalSamples: number;
  overallAccuracy: number;
  classes: Record<ActivityType, ClassPerformanceMetrics>;
  confusionMatrix: {
    labels: ActivityType[];
    matrix: number[][]; // rows: true label, cols: predicted label
  };
}

export interface PostureMetrics {
  overallScore: number; // 0 - 100
  rating: PostureRating;
  forwardHeadAngle: number; // in degrees (ideal: < 12)
  headForwardDisplacement: number; // normalized horizontal offset
  shoulderTiltAngle: number; // in degrees (ideal: < 3.5)
  shoulderSymmetryDelta: number; // vertical delta between left and right shoulder
  hipTiltAngle: number; // in degrees (ideal: < 3.0)
  torsoSlouchAngle: number; // thoracic inclination in degrees (ideal: < 8)
  spineCurvatureScore: number; // 0 - 100
  confidence: number; // 0 - 1
  flaggedIssues: string[];
  feedbackTips: string[];
  viewDetected: 'front' | 'side';
  activityContext?: ActivityType;
}

export interface AssessmentSession {
  id: string;
  timestamp: number;
  durationSeconds: number;
  overallScore: number;
  rating: PostureRating;
  metrics: {
    forwardHeadAngle: number;
    shoulderTiltAngle: number;
    hipTiltAngle?: number;
    torsoSlouchAngle: number;
    symmetryScore: number;
    timeInGoodPosturePercent: number;
  };
  timeInGoodPosturePercent: number;
  flaggedIssues: string[];
  recommendations: string[];
  aiSummary?: string;
  focusArea?: string;
  encouragement?: string;
  cameraView: CameraViewMode;
  aiExplanationUnavailable?: boolean;
  source?: 'gemini' | 'deterministic_fallback' | 'fallback_on_error';
}

export interface CalibrationSettings {
  soundAlertsEnabled: boolean;
  alertThresholdSeconds: number; // e.g. alert after 3s of continuous slouch
  sensitivity: 'low' | 'medium' | 'high';
  viewMode: CameraViewMode;
  targetPostureDuration: number; // 15, 30, 60 or continuous (0)
}

export interface DailyProgressPoint {
  date: string; // "YYYY-MM-DD" or "Mon 14"
  score: number;
  sessionsCount: number;
  durationMinutes: number;
}

export interface HistoricalStats {
  totalAssessments: number;
  averageScore: number;
  totalTrackingMinutes: number;
  currentStreakDays: number;
  bestScore: number;
  lastSessionDate?: string;
}
