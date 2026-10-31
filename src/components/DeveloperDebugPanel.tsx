import React from 'react';
import {
  ActivityClassification,
  PostureMetrics,
  TrackingStatus,
  UserBodyCalibration
} from '../types';
import {
  Terminal,
  Activity,
  Compass,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
  Sliders
} from 'lucide-react';

interface DeveloperDebugPanelProps {
  activityResult: ActivityClassification;
  metrics: PostureMetrics | null;
  trackingStatus: TrackingStatus;
  calibration: UserBodyCalibration | null;
  fps: number;
  isOpen: boolean;
  onToggle: () => void;
}

export const DeveloperDebugPanel: React.FC<DeveloperDebugPanelProps> = ({
  activityResult,
  metrics,
  trackingStatus,
  calibration,
  fps,
  isOpen,
  onToggle
}) => {
  const f = activityResult.features;

  return (
    <div className="rounded-2xl bg-[#090e1c] border border-[#252a39] overflow-hidden text-[#dee2f6]">
      {/* Header Toggle */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between bg-[#161b2a] hover:bg-[#1a1f2e] transition-all text-left"
      >
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-[#00e5ff]" />
          <span className="font-telemetry font-bold text-xs uppercase tracking-wider text-white">
            Developer Kinematic & Activity Telemetry
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-telemetry bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40">
            DEBUG
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-telemetry text-[#949eb5]">
          <span>{isOpen ? 'COLLAPSE' : 'EXPAND TELEMETRY'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="p-5 space-y-5 text-xs font-telemetry">
          {/* Top Row Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-[#161b2a] border border-[#252a39]">
              <span className="text-[10px] text-[#949eb5] uppercase block">Engine FPS</span>
              <span className="text-white font-bold text-base">{fps} FPS</span>
            </div>
            <div className="p-3 rounded-xl bg-[#161b2a] border border-[#252a39]">
              <span className="text-[10px] text-[#949eb5] uppercase block">Temporal Window</span>
              <span className="text-[#00e5ff] font-bold text-base">
                {f ? `${(f.windowDurationMs / 1000).toFixed(1)}s (${f.frameCount}f)` : '0.0s'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#161b2a] border border-[#252a39]">
              <span className="text-[10px] text-[#949eb5] uppercase block">Landmark Quality</span>
              <span className="text-[#4edea3] font-bold text-base">
                {f ? `${(f.avgVisibility * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#161b2a] border border-[#252a39]">
              <span className="text-[10px] text-[#949eb5] uppercase block">Stability Mode</span>
              <span className="text-[#ffb95f] font-bold text-base uppercase">
                {activityResult.stability}
              </span>
            </div>
          </div>

          {/* Classification Reasoning Box */}
          <div className="p-4 rounded-xl bg-[#161b2a] border border-[#252a39] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <HelpCircle className="w-3.5 h-3.5 text-[#00e5ff]" />
                Evidence-Based Classification Rationale:
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-[#0e1321] text-[#00e5ff] border border-[#252a39]">
                Confidence: {activityResult.confidence}%
              </span>
            </div>

            <p className="text-[#c5cce0] text-xs">
              <strong>{activityResult.label.toUpperCase()}</strong> detected because:
            </p>

            <ul className="space-y-1 text-xs text-[#949eb5] pl-1">
              {activityResult.reasons && activityResult.reasons.length > 0 ? (
                activityResult.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-[#dee2f6]">
                    <span className="text-[#00e5ff] font-bold">✓</span>
                    <span>{r}</span>
                  </li>
                ))
              ) : (
                <li className="text-[#78829d]">Evaluating rolling kinematic features...</li>
              )}
            </ul>
          </div>

          {/* Biomechanical Feature Matrix */}
          {f && (
            <div className="space-y-2">
              <span className="text-[10px] text-[#949eb5] uppercase tracking-wider block font-bold">
                Extracted Biomechanical Feature Vector (Distance-Invariant)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-lg bg-[#161b2a] border border-[#252a39]">
                  <span className="text-[#78829d] text-[10px] block">Velocity (Norm):</span>
                  <span className="text-white font-bold">
                    {f.normalizedVelocity.toFixed(2)} torso/s
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#161b2a] border border-[#252a39]">
                  <span className="text-[#78829d] text-[10px] block">Vertical Velocity:</span>
                  <span className="text-white font-bold">
                    {f.verticalVelocity.toFixed(2)} torso/s
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#161b2a] border border-[#252a39]">
                  <span className="text-[#78829d] text-[10px] block">Vertical Oscillation:</span>
                  <span className="text-white font-bold">
                    {(f.verticalDisplacement * 100).toFixed(0)}% torso
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#161b2a] border border-[#252a39]">
                  <span className="text-[#78829d] text-[10px] block">Stride Cadence:</span>
                  <span className="text-[#00e5ff] font-bold">
                    {f.strideCadenceHz.toFixed(1)} Hz
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#161b2a] border border-[#252a39]">
                  <span className="text-[#78829d] text-[10px] block">Knee Flexion (L/R):</span>
                  <span className="text-white font-bold">
                    {f.kneeAngleLeft.toFixed(0)}° / {f.kneeAngleRight.toFixed(0)}°
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#161b2a] border border-[#252a39]">
                  <span className="text-[#78829d] text-[10px] block">Hip Angle (L/R):</span>
                  <span className="text-white font-bold">
                    {f.hipAngleLeft.toFixed(0)}° / {f.hipAngleRight.toFixed(0)}°
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#161b2a] border border-[#252a39]">
                  <span className="text-[#78829d] text-[10px] block">Periodicity Score:</span>
                  <span className="text-white font-bold">
                    {(f.periodicityScore * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#161b2a] border border-[#252a39]">
                  <span className="text-[#78829d] text-[10px] block">Torso Scale:</span>
                  <span className="text-white font-bold">
                    {f.torsoLength.toFixed(3)} units
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Posture Kinematics Breakdown */}
          {metrics && (
            <div className="space-y-2">
              <span className="text-[10px] text-[#949eb5] uppercase tracking-wider block font-bold">
                Posture Engine Components (Independent Assessment)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-lg bg-[#161b2a] border border-[#252a39]">
                  <span className="text-[#78829d] text-[10px] block">Forward Head:</span>
                  <span className="text-white font-bold">{metrics.forwardHeadAngle}°</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#161b2a] border border-[#252a39]">
                  <span className="text-[#78829d] text-[10px] block">Shoulder Tilt:</span>
                  <span className="text-white font-bold">{metrics.shoulderTiltAngle}°</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#161b2a] border border-[#252a39]">
                  <span className="text-[#78829d] text-[10px] block">Hip Tilt:</span>
                  <span className="text-white font-bold">{metrics.hipTiltAngle ?? 0}°</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#161b2a] border border-[#252a39]">
                  <span className="text-[#78829d] text-[10px] block">Torso Slouch:</span>
                  <span className="text-white font-bold">{metrics.torsoSlouchAngle}°</span>
                </div>
              </div>
            </div>
          )}

          {/* Note on Confidence vs Accuracy */}
          <div className="p-3 rounded-xl bg-[#0e1321] border border-[#252a39] text-[#949eb5] text-[11px] leading-relaxed">
            <strong className="text-white">Scientific Transparency Note:</strong> The live percentage
            displayed above represents <em>instantaneous classification confidence</em> (evidence support for
            the current temporal window), NOT <em>validation accuracy</em>. Benchmark validation accuracy is
            evaluated on ground-truth labeled sequences in the{' '}
            <a href="#/evaluation" className="text-[#00e5ff] underline">
              Model Evaluation Suite (/evaluation)
            </a>
            . PostureAI is an educational computer-vision assessment tool and does not provide medical diagnostic claims.
          </div>
        </div>
      )}
    </div>
  );
};
