import React, { useState } from 'react';
import { Camera, ArrowRight, ShieldCheck, Cpu, Zap, Activity, CheckCircle, AlertCircle, Compass, Sparkles, RefreshCw } from 'lucide-react';

interface HomeProps {
  onNavigate: (route: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [simulatorMode, setSimulatorMode] = useState<'optimal' | 'slouch' | 'tilt'>('optimal');

  // Simulator values
  const simData = {
    optimal: {
      score: 92,
      rating: 'OPTIMAL',
      headAngle: '7.8°',
      shoulderTilt: '1.2°',
      torsoLean: '3.4°',
      status: 'Spine elongated, shoulders retracted and level.',
      color: '#4edea3'
    },
    slouch: {
      score: 58,
      rating: 'DEVIATED',
      headAngle: '21.4°',
      shoulderTilt: '3.1°',
      torsoLean: '14.8°',
      status: 'Severe forward head protrusion & thoracic kyphosis.',
      color: '#ff6b6b'
    },
    tilt: {
      score: 71,
      rating: 'ACCEPTABLE',
      headAngle: '12.0°',
      shoulderTilt: '6.5°',
      torsoLean: '7.2°',
      status: 'Unilateral right shoulder elevation from mouse reach.',
      color: '#ffb95f'
    }
  }[simulatorMode];

  return (
    <div className="min-h-screen bg-[#0e1321] text-[#dee2f6]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-[#252a39] hud-grid">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#00e5ff]/10 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a1f2e] border border-[#00e5ff]/30 text-xs font-telemetry text-[#00e5ff] tracking-wider uppercase glow-cyan-sm">
                <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-ping" />
                Real-Time AI Biomechanical Telemetry
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] font-sans">
                UNDERSTAND YOUR POSTURE.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] via-[#c3f5ff] to-[#4edea3]">
                  IMPROVE YOUR ALIGNMENT.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#949eb5] leading-relaxed max-w-2xl">
                Advanced computer-vision pose estimation analyzes 33 anatomical landmarks in real-time.
                Uncover forward head drift, shoulder elevation, and spinal slouching directly in your browser with zero latency.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <button
                  id="hero-start-assessment-btn"
                  onClick={() => onNavigate('live-analysis')}
                  className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#00e5ff] text-[#0e1321] font-bold text-sm tracking-wide transition-all duration-200 hover:bg-[#c3f5ff] hover:shadow-[0_0_25px_rgba(0,229,255,0.45)] active:scale-95 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>START REAL-TIME ASSESSMENT</span>
                </button>

                <button
                  id="hero-how-it-works-btn"
                  onClick={() => onNavigate('how-it-works')}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#1a1f2e] border border-[#252a39] text-white font-medium text-sm transition-all hover:border-[#00e5ff]/50 hover:bg-[#252a39]"
                >
                  <span>How It Works</span>
                  <ArrowRight className="w-4 h-4 text-[#00e5ff]" />
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-[#949eb5] font-telemetry">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#4edea3]" />
                  <span>Zero Video Storage (100% Client-Side)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#00e5ff]" />
                  <span>33 3D Spatial Landmarks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#ffb95f]" />
                  <span>~16ms Frame Latency</span>
                </div>
              </div>
            </div>

            {/* Right Graphic: Futuristic Biomechanical HUD Box */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-[#00e5ff]/40 bg-[#161b2a] shadow-[0_0_35px_rgba(0,229,255,0.15)] group">
                {/* HUD Header Bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e1321]/90 border-b border-[#252a39] text-[11px] font-telemetry text-[#949eb5]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse" />
                    <span className="text-white">LIVE_TELEMETRY_FEED</span>
                  </div>
                  <span className="text-[#00e5ff]">FPS: 59.8</span>
                </div>

                {/* Simulated Visualizer Canvas / Graphic */}
                <div className="relative aspect-[4/3] bg-gradient-to-b from-[#090e1c] to-[#161b2a] p-4 flex items-center justify-center overflow-hidden">
                  {/* Grid lines */}
                  <div className="absolute inset-0 hud-grid-dense opacity-60" />

                  {/* High-res posture illustration backdrop */}
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAnXDXPyiFG69HU2Junop4IPdsU7hJLsPBkjr8SMDYcGjjKVwd2uSIUKxD8Oqq0HOx1SjUsXlvObyG3Qd1zzZtRCcpKCp8Nh3hi_iOPRJIwWJOnOUdgDuiMI4FfY6LOirEGT0QCp2B8E_wbA4RjWWPKUo3BfRGPkbffsdXNLtSYA-4ax2HhRbqHYDGTv4Po4BL65GK7MPu_8OJL4k-4-1CF5XrFTLxO0lx_hlmGCWr8CdrccXPkqDl"
                    alt="AI Posture Analysis Wireframe HUD"
                    className="w-full h-full object-contain mix-blend-screen opacity-85"
                  />

                  {/* Corner Targeting Reticles */}
                  <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#00e5ff]" />
                  <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#00e5ff]" />
                  <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#00e5ff]" />
                  <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#00e5ff]" />

                  {/* Floating Telemetry Badges */}
                  <div className="absolute top-6 left-6 px-2.5 py-1 rounded bg-[#0e1321]/90 border border-[#00e5ff]/50 text-[11px] font-telemetry text-[#00e5ff] shadow-lg">
                    HEAD ANGLE: 8.4° (OPTIMAL)
                  </div>
                  <div className="absolute bottom-6 right-6 px-2.5 py-1 rounded bg-[#0e1321]/90 border border-[#4edea3]/50 text-[11px] font-telemetry text-[#4edea3] shadow-lg">
                    SHOULDER LEVEL: 98.6%
                  </div>
                </div>

                {/* HUD Footer Metrics */}
                <div className="p-4 bg-[#1a1f2e] border-t border-[#252a39] flex items-center justify-between text-xs font-telemetry">
                  <div>
                    <span className="text-[#949eb5] block text-[10px]">ALIGNMENT INDEX</span>
                    <span className="text-xl font-bold text-[#4edea3]">92 / 100</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#949eb5] block text-[10px]">INFERENCE ENGINE</span>
                    <span className="text-white font-medium">Local WebAssembly</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Posture Simulator Section */}
      <section className="py-16 border-b border-[#252a39] bg-[#090e1c]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-sans">
              Interactive Biomechanical Simulator
            </h2>
            <p className="text-sm text-[#949eb5]">
              Preview how computer-vision angular mathematics quantify spinal alignment before starting your webcam assessment.
            </p>

            {/* Mode Switcher */}
            <div className="inline-flex p-1 rounded-xl bg-[#1a1f2e] border border-[#252a39] mt-2">
              <button
                onClick={() => setSimulatorMode('optimal')}
                className={`px-4 py-1.5 rounded-lg text-xs font-telemetry transition-all ${
                  simulatorMode === 'optimal'
                    ? 'bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/40'
                    : 'text-[#949eb5] hover:text-white'
                }`}
              >
                1. Ergonomic Stack
              </button>
              <button
                onClick={() => setSimulatorMode('slouch')}
                className={`px-4 py-1.5 rounded-lg text-xs font-telemetry transition-all ${
                  simulatorMode === 'slouch'
                    ? 'bg-[#ff6b6b]/20 text-[#ff6b6b] border border-[#ff6b6b]/40'
                    : 'text-[#949eb5] hover:text-white'
                }`}
              >
                2. Forward Head Slouch
              </button>
              <button
                onClick={() => setSimulatorMode('tilt')}
                className={`px-4 py-1.5 rounded-lg text-xs font-telemetry transition-all ${
                  simulatorMode === 'tilt'
                    ? 'bg-[#ffb95f]/20 text-[#ffb95f] border border-[#ffb95f]/40'
                    : 'text-[#949eb5] hover:text-white'
                }`}
              >
                3. Shoulder Tilt
              </button>
            </div>
          </div>

          {/* Simulator Display Card */}
          <div className="max-w-4xl mx-auto rounded-2xl bg-[#161b2a] border border-[#252a39] p-6 lg:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[11px] font-telemetry uppercase text-[#949eb5] tracking-wider">
                COMPOSITE SCORE
              </span>
              <div className="text-5xl font-extrabold font-telemetry" style={{ color: simData.color }}>
                {simData.score}
                <span className="text-sm text-[#78829d] font-normal"> / 100</span>
              </div>
              <span
                className="inline-block px-2.5 py-0.5 rounded-full text-xs font-telemetry font-bold border"
                style={{
                  backgroundColor: `${simData.color}20`,
                  color: simData.color,
                  borderColor: `${simData.color}50`
                }}
              >
                {simData.rating}
              </span>
            </div>

            <div className="space-y-3 font-telemetry text-xs md:col-span-2 bg-[#0e1321] p-5 rounded-xl border border-[#252a39]">
              <div className="flex justify-between border-b border-[#252a39] pb-2">
                <span className="text-[#949eb5]">Craniovertebral Angle (Head):</span>
                <span className="text-white font-bold">{simData.headAngle}</span>
              </div>
              <div className="flex justify-between border-b border-[#252a39] pb-2">
                <span className="text-[#949eb5]">Acromial Line Slope (Shoulders):</span>
                <span className="text-white font-bold">{simData.shoulderTilt}</span>
              </div>
              <div className="flex justify-between border-b border-[#252a39] pb-2">
                <span className="text-[#949eb5]">Thoracic Deviation:</span>
                <span className="text-white font-bold">{simData.torsoLean}</span>
              </div>
              <div className="pt-1 text-[#c5cce0] text-xs font-sans italic">
                "{simData.status}"
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Pillars Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-telemetry uppercase tracking-widest text-[#00e5ff]">
            SYSTEM ARCHITECTURE
          </span>
          <h2 className="text-3xl font-bold text-white font-sans">
            Precision Biomechanics, Engineered for Privacy
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-6 space-y-3 transition-all hover:border-[#00e5ff]/50 hover:shadow-[0_0_20px_rgba(0,229,255,0.15)]">
            <div className="w-10 h-10 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-center justify-center text-[#00e5ff]">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-telemetry font-bold text-white text-base">33 3D Spatial Landmarks</h3>
            <p className="text-xs text-[#949eb5] leading-relaxed">
              Calculates 3D coordinates for tragus, acromion, cervical spine, and pelvis using MediaPipe Tasks Vision.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-6 space-y-3 transition-all hover:border-[#4edea3]/50 hover:shadow-[0_0_20px_rgba(78,222,163,0.15)]">
            <div className="w-10 h-10 rounded-lg bg-[#4edea3]/10 border border-[#4edea3]/30 flex items-center justify-center text-[#4edea3]">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-telemetry font-bold text-white text-base">Dual Coronal & Sagittal Views</h3>
            <p className="text-xs text-[#949eb5] leading-relaxed">
              Auto-detects whether you are seated facing the camera or in side profile for customized angular trigonometry.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-6 space-y-3 transition-all hover:border-[#ffb95f]/50 hover:shadow-[0_0_20px_rgba(255,185,95,0.15)]">
            <div className="w-10 h-10 rounded-lg bg-[#ffb95f]/10 border border-[#ffb95f]/30 flex items-center justify-center text-[#ffb95f]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-telemetry font-bold text-white text-base">Ergonomic AI Coaching</h3>
            <p className="text-xs text-[#949eb5] leading-relaxed">
              Server-side Gemini generates personalized, non-medical desk ergonomics and habit cues from your telemetry.
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-6 space-y-3 transition-all hover:border-[#00e5ff]/50 hover:shadow-[0_0_20px_rgba(0,229,255,0.15)]">
            <div className="w-10 h-10 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-center justify-center text-[#00e5ff]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-telemetry font-bold text-white text-base">Zero Video Transmission</h3>
            <p className="text-xs text-[#949eb5] leading-relaxed">
              Webcam video is processed strictly in memory on your device. Only aggregated numerical angles leave the browser.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 border-t border-[#252a39] bg-gradient-to-b from-[#161b2a] to-[#0e1321]">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-sans">
            Ready to calibrate your desk posture?
          </h2>
          <p className="text-sm sm:text-base text-[#949eb5] max-w-xl mx-auto">
            Run a 30-second live assessment using your webcam or our interactive synthetic demo mode.
          </p>
          <button
            onClick={() => onNavigate('live-analysis')}
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-[#00e5ff] text-[#0e1321] font-bold text-sm tracking-wider transition-all hover:bg-[#c3f5ff] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] cursor-pointer"
          >
            <Camera className="w-5 h-5" />
            <span>LAUNCH CAMERA ASSESSMENT</span>
          </button>
        </div>
      </section>
    </div>
  );
};
