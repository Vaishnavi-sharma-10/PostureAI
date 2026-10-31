import React from 'react';
import { PostureMetrics, ActivityClassification, TrackingStatus } from '../types';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Compass,
  ArrowUpRight,
  Activity,
  Info,
  UserX,
  Maximize2,
  EyeOff
} from 'lucide-react';

interface PostureHUDProps {
  metrics: PostureMetrics | null;
  fps?: number;
  isAssessing?: boolean;
  assessmentSecondsLeft?: number;
  activityResult?: ActivityClassification;
  trackingStatus?: TrackingStatus;
  statusMessage?: string;
  statusSubMessage?: string;
}

export const PostureHUD: React.FC<PostureHUDProps> = ({
  metrics,
  fps = 30,
  isAssessing = false,
  assessmentSecondsLeft,
  activityResult,
  trackingStatus = 'tracking',
  statusMessage,
  statusSubMessage
}) => {
  // Activity presentation helper
  const getActivityEmoji = (activity?: string) => {
    switch (activity) {
      case 'standing':
        return '🧍';
      case 'sitting':
        return '🪑';
      case 'walking':
        return '🚶';
      case 'running':
        return '🏃';
      case 'no_person':
        return '👤';
      case 'multiple_people':
        return '👥';
      default:
        return '⏳';
    }
  };

  // If person is not detected, partially visible, or landmarks are unreliable:
  // Do NOT show misleading scores!
  if (trackingStatus === 'no_person') {
    return (
      <div className="bg-[#161b2a]/95 border border-[#252a39] rounded-2xl p-6 text-center space-y-4 shadow-2xl backdrop-blur-md">
        <div className="w-14 h-14 rounded-2xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 flex items-center justify-center mx-auto text-[#ff6b6b]">
          <UserX className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="font-telemetry font-bold text-white text-base">
            {statusMessage || 'Person not detected'}
          </h3>
          <p className="text-xs text-[#949eb5] max-w-xs mx-auto leading-relaxed">
            {statusSubMessage || 'Step into the camera viewport to begin real-time posture analysis.'}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-[#0e1321] border border-[#252a39] text-[11px] font-telemetry text-[#78829d]">
          SENSORS STANDBY • WAITING FOR BODY LANDMARKS
        </div>
      </div>
    );
  }

  if (trackingStatus === 'partially_visible') {
    return (
      <div className="bg-[#161b2a]/95 border border-[#252a39] rounded-2xl p-6 text-center space-y-4 shadow-2xl backdrop-blur-md">
        <div className="w-14 h-14 rounded-2xl bg-[#ffb95f]/10 border border-[#ffb95f]/30 flex items-center justify-center mx-auto text-[#ffb95f]">
          <Maximize2 className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="font-telemetry font-bold text-white text-base">
            {statusMessage || 'Please make sure your full body is visible'}
          </h3>
          <p className="text-xs text-[#949eb5] max-w-xs mx-auto leading-relaxed">
            {statusSubMessage ||
              'Step back or tilt your webcam down to ensure your head, shoulders, and hips are in frame.'}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-[#0e1321] border border-[#ffb95f]/20 text-[11px] font-telemetry text-[#ffb95f]">
          FULL TORSO REQUIRED FOR CALIBRATED ACCURACY
        </div>
      </div>
    );
  }

  if (trackingStatus === 'unreliable') {
    return (
      <div className="bg-[#161b2a]/95 border border-[#252a39] rounded-2xl p-6 text-center space-y-4 shadow-2xl backdrop-blur-md">
        <div className="w-14 h-14 rounded-2xl bg-[#ffb95f]/10 border border-[#ffb95f]/30 flex items-center justify-center mx-auto text-[#ffb95f]">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="font-telemetry font-bold text-white text-base">
            {statusMessage || 'Adjust your position for a better assessment'}
          </h3>
          <p className="text-xs text-[#949eb5] max-w-xs mx-auto leading-relaxed">
            {statusSubMessage ||
              'Increase ambient lighting or face the camera directly to eliminate landmark noise.'}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-[#0e1321] border border-[#252a39] text-[11px] font-telemetry text-[#949eb5]">
          RE-CALIBRATING KEYPOINTS...
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-[#161b2a]/95 border border-[#252a39] rounded-2xl p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full border border-[#00e5ff]/30 flex items-center justify-center mx-auto text-[#00e5ff] animate-spin">
          <Compass className="w-6 h-6" />
        </div>
        <h3 className="font-telemetry font-bold text-white text-sm">CALIBRATING POSE SENSORS</h3>
        <p className="text-xs text-[#949eb5]">
          Ensure your upper body, neck, and shoulders are clearly visible in the camera frame.
        </p>
      </div>
    );
  }

  const {
    overallScore,
    rating,
    forwardHeadAngle,
    shoulderTiltAngle,
    hipTiltAngle = 0,
    torsoSlouchAngle,
    spineCurvatureScore,
    flaggedIssues,
    feedbackTips,
    viewDetected,
    confidence
  } = metrics;

  // Determine colors based on status
  const isOptimal = rating === 'optimal';
  const isAcceptable = rating === 'acceptable';

  const badgeColor = isOptimal
    ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40'
    : isAcceptable
    ? 'bg-[#ffb95f]/15 text-[#ffb95f] border-[#ffb95f]/40'
    : 'bg-[#ff6b6b]/15 text-[#ff6b6b] border-[#ff6b6b]/40';

  const scoreColor = isOptimal
    ? 'text-[#4edea3]'
    : isAcceptable
    ? 'text-[#ffb95f]'
    : 'text-[#ff6b6b]';

  const activityEmoji = getActivityEmoji(activityResult?.activity);

  return (
    <div className="bg-[#161b2a]/95 border border-[#252a39] rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-4">
      {/* Top Status & View Bar */}
      <div className="flex items-center justify-between border-b border-[#252a39] pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse" />
          <span className="font-telemetry text-xs font-semibold uppercase tracking-wider text-white">
            BIOMECHANICAL HUD
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-telemetry uppercase bg-[#1a1f2e] text-[#949eb5] border border-[#252a39]">
            {viewDetected.toUpperCase()} VIEW
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-telemetry bg-[#1a1f2e] text-[#4edea3] border border-[#252a39]">
            {fps} FPS
          </span>
        </div>
      </div>

      {/* Primary Score & Assessment Dial */}
      <div className="flex items-center justify-between gap-4 bg-[#0e1321]/60 p-4 rounded-xl border border-[#252a39]">
        <div className="space-y-1">
          <div className="text-[10px] font-telemetry uppercase tracking-wider text-[#949eb5]">
            POSTURE SCORE
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-4xl font-extrabold font-telemetry tracking-tight ${scoreColor}`}>
              {overallScore}
            </span>
            <span className="text-sm font-telemetry text-[#949eb5]">/ 100</span>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold font-telemetry uppercase tracking-wider border ${badgeColor}`}
          >
            {isOptimal ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            {rating}
          </span>
        </div>

        {/* Assessment Timer if active */}
        {isAssessing && assessmentSecondsLeft !== undefined && (
          <div className="text-right space-y-0.5">
            <span className="text-[10px] font-telemetry uppercase tracking-widest text-[#00e5ff]">
              RECORDING WINDOW
            </span>
            <div className="text-2xl font-bold font-telemetry text-white">
              00:{assessmentSecondsLeft < 10 ? `0${assessmentSecondsLeft}` : assessmentSecondsLeft}
            </div>
            <span className="text-[10px] text-[#949eb5]">Hold natural position</span>
          </div>
        )}
      </div>

      {/* Real-Time Activity Classification Card */}
      <div className="bg-[#0e1321]/60 p-4 rounded-xl border border-[#252a39] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-telemetry uppercase tracking-wider text-[#949eb5]">
            <Activity className="w-3.5 h-3.5 text-[#00e5ff]" />
            <span>CURRENT ACTIVITY</span>
          </div>
          {activityResult && activityResult.confidence > 0 && (
            <span className="text-[10px] font-telemetry px-2 py-0.5 rounded bg-[#1a1f2e] text-[#00e5ff] border border-[#252a39]">
              Confidence: {activityResult.confidence}%
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none" role="img" aria-label={activityResult?.label || 'Activity'}>
              {activityEmoji}
            </span>
            <div>
              <div className="text-base font-bold font-telemetry text-white">
                {activityResult ? activityResult.label : 'Analyzing...'}
              </div>
              <div className="text-[11px] font-telemetry text-[#949eb5]">
                {activityResult?.stability === 'stable'
                  ? 'Stable'
                  : activityResult?.stability === 'moving'
                  ? 'Movement Detected'
                  : activityResult?.details || 'Analyzing...'}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Activity-Specific Posture Message */}
        {activityResult?.postureAdjustedNotice && (
          <div className="p-2.5 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/25 text-xs text-[#00e5ff] flex items-start gap-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="leading-snug font-sans">{activityResult.postureAdjustedNotice}</span>
          </div>
        )}
      </div>

      {/* Angular Kinematic Telemetry Bars: ALL 4 ACTUAL MEASUREMENTS */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-telemetry uppercase font-bold tracking-wider text-[#949eb5]">
          Kinematic Measurements
        </h4>

        {/* 1. Head Position (Cervical Angle) */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-telemetry">
            <span className="text-white">Head Position (Cervical)</span>
            <span className={forwardHeadAngle > 12 ? 'text-[#ff6b6b] font-bold' : 'text-[#4edea3]'}>
              {forwardHeadAngle}° <span className="text-[#78829d] font-normal">(Ideal: &lt;12°)</span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#0e1321] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                forwardHeadAngle > 15 ? 'bg-[#ff6b6b]' : forwardHeadAngle > 10 ? 'bg-[#ffb95f]' : 'bg-[#00e5ff]'
              }`}
              style={{ width: `${Math.min(100, (forwardHeadAngle / 30) * 100)}%` }}
            />
          </div>
        </div>

        {/* 2. Shoulder Alignment (Acromial Tilt) */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-telemetry">
            <span className="text-white">Shoulder Alignment (Tilt)</span>
            <span className={shoulderTiltAngle > 4 ? 'text-[#ffb95f] font-bold' : 'text-[#4edea3]'}>
              {shoulderTiltAngle}° <span className="text-[#78829d] font-normal">(Ideal: &lt;3.5°)</span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#0e1321] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                shoulderTiltAngle > 5 ? 'bg-[#ff6b6b]' : shoulderTiltAngle > 3.5 ? 'bg-[#ffb95f]' : 'bg-[#4edea3]'
              }`}
              style={{ width: `${Math.min(100, (shoulderTiltAngle / 15) * 100)}%` }}
            />
          </div>
        </div>

        {/* 3. Hip Alignment (Pelvic Tilt) */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-telemetry">
            <span className="text-white">Hip Alignment (Pelvis)</span>
            <span className={hipTiltAngle > 3.5 ? 'text-[#ffb95f] font-bold' : 'text-[#4edea3]'}>
              {hipTiltAngle}° <span className="text-[#78829d] font-normal">(Ideal: &lt;3.0°)</span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#0e1321] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                hipTiltAngle > 4.5 ? 'bg-[#ff6b6b]' : hipTiltAngle > 3 ? 'bg-[#ffb95f]' : 'bg-[#4edea3]'
              }`}
              style={{ width: `${Math.min(100, (hipTiltAngle / 12) * 100)}%` }}
            />
          </div>
        </div>

        {/* 4. Torso Alignment (Thoracic Inclination) */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-telemetry">
            <span className="text-white">Torso Alignment (Plumbline)</span>
            <span className={torsoSlouchAngle > 8 ? 'text-[#ff6b6b] font-bold' : 'text-[#4edea3]'}>
              {torsoSlouchAngle}° <span className="text-[#78829d] font-normal">(Ideal: &lt;8°)</span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#0e1321] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                torsoSlouchAngle > 10 ? 'bg-[#ff6b6b]' : torsoSlouchAngle > 6 ? 'bg-[#ffb95f]' : 'bg-[#00e5ff]'
              }`}
              style={{ width: `${Math.min(100, (torsoSlouchAngle / 25) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Flagged Deviations or Affirmation */}
      <div className="pt-2 border-t border-[#252a39]">
        {flaggedIssues.length > 0 ? (
          <div className="space-y-1.5">
            <span className="text-[10px] font-telemetry uppercase tracking-wider text-[#ffb95f] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Detected Deviations
            </span>
            <div className="flex flex-wrap gap-1.5">
              {flaggedIssues.map((issue, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-[11px] bg-[#ff6b6b]/10 text-[#ffb4ab] border border-[#ff6b6b]/30"
                >
                  {issue}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#4edea3]/10 border border-[#4edea3]/25 text-xs text-[#4edea3]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Optimal alignment: Head, shoulders, hips, and spine balanced.</span>
          </div>
        )}
      </div>

      {/* Active Ergonomic Cue */}
      {feedbackTips.length > 0 && (
        <div className="p-3 rounded-lg bg-[#1a1f2e] border border-[#252a39] space-y-1">
          <span className="text-[10px] font-telemetry uppercase tracking-wider text-[#00e5ff] flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            Ergonomic Habit Cue
          </span>
          <p className="text-xs text-[#dee2f6] leading-snug">
            {feedbackTips[0]}
          </p>
        </div>
      )}
    </div>
  );
};
