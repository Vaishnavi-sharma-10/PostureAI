import React from 'react';
import { Camera, Compass, Activity, Sparkles, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface HowItWorksProps {
  onStartAssessment: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onStartAssessment }) => {
  const steps = [
    {
      step: '01',
      title: 'Optimal Camera Positioning',
      desc: 'Place your webcam at eye level, roughly 60–80cm away. Ensure your head, neck, and both shoulders are unobstructed within the camera frame.',
      icon: Camera,
      tip: 'Natural ambient lighting from the front yields the highest landmark accuracy.'
    },
    {
      step: '02',
      title: '33 3D Spatial Landmarks',
      desc: 'MediaPipe Tasks Vision processes the video stream frame-by-frame locally on your GPU or WebAssembly CPU. Key points include ear tragus, shoulder acromion, and pelvis.',
      icon: Compass,
      tip: 'Zero video footage is recorded or sent to any server.'
    },
    {
      step: '03',
      title: 'Angular Trigonometric Calculation',
      desc: 'Our kinematic algorithm calculates Craniovertebral Angle (CVA), shoulder horizontal elevation variance, and sagittal thoracic plumbline deviation in real-time.',
      icon: Activity,
      tip: 'Ideal cervical angle sits under 12°; shoulder tilt under 3.5°.'
    },
    {
      step: '04',
      title: 'Ergonomic AI Coaching',
      desc: 'Upon completing your assessment, structured numerical metrics are evaluated to suggest tailored workstation adjustments, chair height cues, and stretching habits.',
      icon: Sparkles,
      tip: 'Continuous habit cues build permanent muscular endurance over time.'
    }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0e1321] text-[#dee2f6] p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-telemetry uppercase tracking-widest text-[#00e5ff]">
            SYSTEM METHODOLOGY
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-sans">
            How PostureAI Works
          </h1>
          <p className="text-sm text-[#949eb5] leading-relaxed">
            A transparent overview of our computer-vision pipeline, mathematical formulas, and ergonomic assessment workflow.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-6 space-y-4 relative overflow-hidden transition-all hover:border-[#00e5ff]/40"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-center justify-center text-[#00e5ff]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-extrabold font-telemetry text-[#252a39]">
                    {s.step}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-telemetry font-bold text-white text-base">
                    {s.title}
                  </h3>
                  <p className="text-xs text-[#949eb5] leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#0e1321] border border-[#252a39] flex items-start gap-2 text-[11px] text-[#c5cce0]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4edea3] shrink-0 mt-0.5" />
                  <span>{s.tip}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Calibration Guide Section */}
        <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-6 sm:p-8 space-y-6">
          <h2 className="text-xl font-bold font-telemetry text-white">
            Workstation Ergonomics Checklist
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="space-y-2 bg-[#0e1321] p-4 rounded-xl border border-[#252a39]">
              <span className="font-telemetry font-bold text-[#00e5ff] uppercase block">
                Monitor Setup
              </span>
              <p className="text-[#949eb5] leading-relaxed">
                Top edge of screen at eye height. Distance should be approximately one arm length. Tilt monitor back 10–20° to reduce glare.
              </p>
            </div>

            <div className="space-y-2 bg-[#0e1321] p-4 rounded-xl border border-[#252a39]">
              <span className="font-telemetry font-bold text-[#4edea3] uppercase block">
                Chair & Armrests
              </span>
              <p className="text-[#949eb5] leading-relaxed">
                Thighs horizontal with feet flat on the floor. Lumbar cushion supporting natural inward curve. Armrests supporting elbows at 90°.
              </p>
            </div>

            <div className="space-y-2 bg-[#0e1321] p-4 rounded-xl border border-[#252a39]">
              <span className="font-telemetry font-bold text-[#ffb95f] uppercase block">
                Movement Breaks
              </span>
              <p className="text-[#949eb5] leading-relaxed">
                Practice micro-breaks every 20-30 minutes: 10 chin tucks, gentle shoulder blade pinches, and 20 seconds gazing at distance.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-6">
          <button
            onClick={onStartAssessment}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#00e5ff] text-[#0e1321] text-xs font-bold font-telemetry tracking-wider hover:bg-[#c3f5ff] transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>TRY LIVE ASSESSMENT NOW</span>
          </button>
        </div>
      </div>
    </div>
  );
};
