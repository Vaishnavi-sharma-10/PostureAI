import React from 'react';
import { Cpu, ShieldCheck, Lock, Activity, Layers, Code, Zap, FileCode } from 'lucide-react';

export const Technology: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0e1321] text-[#dee2f6] p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-telemetry uppercase tracking-widest text-[#00e5ff]">
            ENGINEERING SPECIFICATION
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-sans">
            Biomechanical & Vision Architecture
          </h1>
          <p className="text-sm text-[#949eb5] leading-relaxed">
            Technical blueprint of PostureAI's client-side neural inference pipeline and kinematic mathematics.
          </p>
        </div>

        {/* 3 Pillars Architecture */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-center justify-center text-[#00e5ff]">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-telemetry font-bold text-white text-base">MediaPipe Tasks Vision</h3>
            <p className="text-xs text-[#949eb5] leading-relaxed">
              Utilizes Google's state-of-the-art Pose Landmarker Lite model running via WebAssembly and WebGL shaders on the client hardware.
            </p>
          </div>

          <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#4edea3]/10 border border-[#4edea3]/30 flex items-center justify-center text-[#4edea3]">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-telemetry font-bold text-white text-base">Zero-Transmission Privacy</h3>
            <p className="text-xs text-[#949eb5] leading-relaxed">
              Camera feeds never leave the browser runtime. Frames are consumed in memory for landmark extraction and immediately garbage collected.
            </p>
          </div>

          <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#ffb95f]/10 border border-[#ffb95f]/30 flex items-center justify-center text-[#ffb95f]">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-telemetry font-bold text-white text-base">Vector Kinematics</h3>
            <p className="text-xs text-[#949eb5] leading-relaxed">
              Computes Euclidean angles across anatomical vertices (Tragus, Acromion, C7/Plumbline) with sub-degree accuracy.
            </p>
          </div>
        </div>

        {/* Mathematical Formulas Breakdown */}
        <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-6 sm:p-8 space-y-6">
          <h2 className="text-xl font-bold font-telemetry text-white flex items-center gap-2">
            <Code className="w-5 h-5 text-[#00e5ff]" />
            Kinematic Mathematical Formulas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-telemetry">
            <div className="p-4 rounded-xl bg-[#0e1321] border border-[#252a39] space-y-2">
              <span className="text-[#00e5ff] font-bold block">1. Craniovertebral Angle (CVA)</span>
              <p className="text-[#949eb5] font-sans">
                Measures cervical protrusion relative to the acromial plumbline:
              </p>
              <div className="p-2.5 rounded bg-[#161b2a] text-[#dee2f6] font-mono text-[11px]">
                θ = atan2(|X_ear - X_shoulder|, |Y_shoulder - Y_ear|) * (180 / π)
              </div>
              <span className="text-[#4edea3] text-[11px] block">Nominal range: 0° - 12°</span>
            </div>

            <div className="p-4 rounded-xl bg-[#0e1321] border border-[#252a39] space-y-2">
              <span className="text-[#00e5ff] font-bold block">2. Acromial Line Slope (Shoulder Level)</span>
              <p className="text-[#949eb5] font-sans">
                Quantifies lateral shoulder asymmetry from horizontal:
              </p>
              <div className="p-2.5 rounded bg-[#161b2a] text-[#dee2f6] font-mono text-[11px]">
                α = atan2(|Y_right - Y_left|, |X_right - X_left|) * (180 / π)
              </div>
              <span className="text-[#4edea3] text-[11px] block">Nominal range: 0° - 3.5°</span>
            </div>
          </div>
        </div>

        {/* Landmark Topology Reference Table */}
        <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold font-telemetry text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#4edea3]" />
            Key MediaPipe Pose Landmarks Utilized
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-telemetry">
            <div className="p-3 rounded-lg bg-[#0e1321] border border-[#252a39]">
              <span className="text-[#00e5ff] font-bold">Index 0:</span> Nose Tip
            </div>
            <div className="p-3 rounded-lg bg-[#0e1321] border border-[#252a39]">
              <span className="text-[#00e5ff] font-bold">Index 7:</span> Left Ear Tragus
            </div>
            <div className="p-3 rounded-lg bg-[#0e1321] border border-[#252a39]">
              <span className="text-[#00e5ff] font-bold">Index 8:</span> Right Ear Tragus
            </div>
            <div className="p-3 rounded-lg bg-[#0e1321] border border-[#252a39]">
              <span className="text-[#00e5ff] font-bold">Index 11:</span> Left Acromion
            </div>
            <div className="p-3 rounded-lg bg-[#0e1321] border border-[#252a39]">
              <span className="text-[#00e5ff] font-bold">Index 12:</span> Right Acromion
            </div>
            <div className="p-3 rounded-lg bg-[#0e1321] border border-[#252a39]">
              <span className="text-[#00e5ff] font-bold">Index 13/14:</span> Elbows
            </div>
            <div className="p-3 rounded-lg bg-[#0e1321] border border-[#252a39]">
              <span className="text-[#00e5ff] font-bold">Index 23:</span> Left Iliac Crest
            </div>
            <div className="p-3 rounded-lg bg-[#0e1321] border border-[#252a39]">
              <span className="text-[#00e5ff] font-bold">Index 24:</span> Right Iliac Crest
            </div>
          </div>
        </div>

        {/* Temporal Sequence & Activity Engine Architecture */}
        <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold font-telemetry text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#00e5ff]" />
            Multi-Frame Temporal Activity Classification Engine
          </h2>
          <p className="text-xs text-[#949eb5] leading-relaxed">
            PostureAI classifies user activity through a rolling 1–3 second temporal sequence buffer rather than noisy single-frame snapshots.
            Measurements are normalized by anatomical torso scale (|shoulder_midpoint - hip_midpoint|), ensuring distance invariance whether the user is close or far from the camera.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-telemetry pt-2">
            <div className="p-3.5 rounded-xl bg-[#0e1321] border border-[#252a39] space-y-1.5">
              <span className="text-white font-bold block">1. Kinematic Feature Extraction</span>
              <p className="text-[#78829d]">
                Extracts hip and knee flexion angles, vertical center-of-mass oscillation, normalized velocity, and stride periodicity.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0e1321] border border-[#252a39] space-y-1.5">
              <span className="text-white font-bold block">2. Hysteresis State Machine</span>
              <p className="text-[#78829d]">
                Enforces temporal debouncing and confidence margins to prevent state flickering during transitional phases.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0e1321] border border-[#252a39] space-y-1.5">
              <span className="text-white font-bold block">3. Empirical Validation Suite</span>
              <p className="text-[#78829d]">
                Evaluates model performance against 50+ labeled ground-truth sequences with full confusion matrix, precision, recall, and F1 calculations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
