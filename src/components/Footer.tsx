import React from 'react';
import { ShieldCheck, Lock, AlertTriangle, Cpu, HeartHandshake } from 'lucide-react';

interface FooterProps {
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full border-t border-[#252a39] bg-[#090e1c] text-[#949eb5] text-xs">
      {/* Medical Disclaimer Banner */}
      <div className="bg-[#1a1f2e]/90 border-b border-[#252a39] px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-start sm:items-center gap-3">
          <div className="p-1.5 rounded bg-[#ffb95f]/15 border border-[#ffb95f]/40 text-[#ffb95f] shrink-0 mt-0.5 sm:mt-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-[11px] leading-relaxed text-[#c5cce0]">
            <strong className="text-white font-semibold uppercase tracking-wider">
              Educational & Awareness Notice:
            </strong>{' '}
            PostureAI is an ergonomic awareness and computer-vision posture evaluation tool. It is{' '}
            <strong className="text-white">not a medical diagnostic system</strong> and does not diagnose,
            treat, or prescribe therapy for any spinal, musculoskeletal, or medical conditions. For persistent
            discomfort or orthopedic concerns, consult a licensed physical therapist or physician.
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-[#1a1f2e] border border-[#00e5ff]/50 flex items-center justify-center glow-cyan-sm">
                <span className="font-telemetry font-bold text-[#00e5ff] text-xs">P</span>
              </div>
              <span className="font-telemetry font-bold text-white tracking-wider text-base">
                POSTURE<span className="text-[#00e5ff]">AI</span>
              </span>
            </div>
            <p className="text-xs text-[#949eb5] leading-relaxed">
              "Understand Your Posture. Improve Your Alignment."
              Real-time biomechanical telemetry computed entirely in your browser.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#4edea3]">
              <Lock className="w-3.5 h-3.5" />
              <span>100% Client-Side Video Inference</span>
            </div>
          </div>

          {/* Platform Nav */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest font-telemetry">Platform</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-[#00e5ff] transition-colors"
                >
                  System Overview
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('live-analysis')}
                  className="hover:text-[#00e5ff] transition-colors"
                >
                  Live Assessment
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('progress')}
                  className="hover:text-[#00e5ff] transition-colors"
                >
                  Progress & Analytics
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('how-it-works')}
                  className="hover:text-[#00e5ff] transition-colors"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('technology')}
                  className="hover:text-[#00e5ff] transition-colors"
                >
                  Biomechanical Spec
                </button>
              </li>
            </ul>
          </div>

          {/* Privacy & Standards */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest font-telemetry">Privacy & Trust</h4>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4edea3]" />
                <span>Zero Cloud Video Recording</span>
              </li>
              <li className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span>WebAssembly & WebGL Engine</span>
              </li>
              <li className="flex items-center gap-2">
                <HeartHandshake className="w-3.5 h-3.5 text-[#ffb95f]" />
                <span>Ergonomic Habit Coaching</span>
              </li>
            </ul>
          </div>

          {/* Telemetry Architecture */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest font-telemetry">Telemetry Engine</h4>
            <div className="p-3 rounded-lg bg-[#161b2a] border border-[#252a39] space-y-1.5 font-telemetry text-[11px]">
              <div className="flex justify-between text-[#949eb5]">
                <span>Landmarks:</span>
                <span className="text-white">33 3D Keypoints</span>
              </div>
              <div className="flex justify-between text-[#949eb5]">
                <span>Latency:</span>
                <span className="text-[#4edea3]">~16ms (60 FPS)</span>
              </div>
              <div className="flex justify-between text-[#949eb5]">
                <span>Inference:</span>
                <span className="text-[#00e5ff]">Local MediaPipe Tasks</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#1a1f2e] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#78829d]">
          <p>© {new Date().getFullYear()} POSTUREAI. All rights reserved. Built for posture awareness and ergonomic ergonomics.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-white cursor-pointer" onClick={() => onNavigate('technology')}>Architecture</span>
            <span>•</span>
            <span className="hover:text-white cursor-pointer" onClick={() => onNavigate('how-it-works')}>Instructions</span>
            <span>•</span>
            <span className="hover:text-white cursor-pointer" onClick={() => onNavigate('live-analysis')}>Live Assessment</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
