import React from 'react';
import { AssessmentSession } from '../types';
import {
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  BarChart2,
  ShieldAlert,
  Sparkles,
  Printer,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface ResultsProps {
  session: AssessmentSession | null;
  onRetake: () => void;
  onViewProgress: () => void;
}

export const Results: React.FC<ResultsProps> = ({ session, onRetake, onViewProgress }) => {
  if (!session) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-xl font-bold font-telemetry text-white">No Recent Assessment Found</h2>
        <p className="text-xs text-[#949eb5] max-w-md">
          Run a quick 30-second live assessment to generate your personalized biomechanical telemetry report.
        </p>
        <button
          onClick={onRetake}
          className="px-6 py-3 rounded-xl bg-[#00e5ff] text-[#0e1321] text-xs font-bold font-telemetry"
        >
          START LIVE ASSESSMENT
        </button>
      </div>
    );
  }

  const {
    overallScore,
    rating,
    durationSeconds,
    timestamp,
    metrics,
    timeInGoodPosturePercent,
    flaggedIssues,
    recommendations,
    aiSummary,
    focusArea,
    encouragement,
    aiExplanationUnavailable,
    cameraView
  } = session;

  const isOptimal = rating === 'optimal';
  const isAcceptable = rating === 'acceptable';

  const scoreColor = isOptimal
    ? 'text-[#4edea3]'
    : isAcceptable
    ? 'text-[#ffb95f]'
    : 'text-[#ff6b6b]';

  const dateStr = new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <ErrorBoundary>
      <div className="min-h-[calc(100vh-4rem)] bg-[#0e1321] text-[#dee2f6] p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Top Header Navigation */}
          <div className="flex items-center justify-between border-b border-[#252a39] pb-4">
            <button
              onClick={onRetake}
              className="flex items-center gap-2 text-xs font-telemetry text-[#949eb5] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>BACK TO ASSESSMENT</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161b2a] border border-[#252a39] text-xs font-telemetry text-[#949eb5] hover:text-white"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>
              <button
                onClick={onViewProgress}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1a1f2e] border border-[#00e5ff]/40 text-xs font-telemetry text-[#00e5ff] hover:bg-[#00e5ff]/15"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>View All Trends</span>
              </button>
            </div>
          </div>

          {/* Hero Score Card */}
          <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#00e5ff]/5 blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Score circle / metric */}
              <div className="md:col-span-5 text-center md:text-left space-y-2">
                <span className="text-xs font-telemetry uppercase tracking-widest text-[#949eb5]">
                  ASSESSMENT SCORE
                </span>
                <div className="flex items-baseline justify-center md:justify-start gap-2">
                  <span className={`text-6xl font-extrabold font-telemetry tracking-tight ${scoreColor}`}>
                    {overallScore}
                  </span>
                  <span className="text-xl font-telemetry text-[#78829d]">/ 100</span>
                </div>
                <div className="pt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-telemetry uppercase border ${
                      isOptimal
                        ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40'
                        : isAcceptable
                        ? 'bg-[#ffb95f]/15 text-[#ffb95f] border-[#ffb95f]/40'
                        : 'bg-[#ff6b6b]/15 text-[#ff6b6b] border-[#ff6b6b]/40'
                    }`}
                  >
                    {isOptimal ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    {rating.toUpperCase()} ALIGNMENT
                  </span>
                </div>
              </div>

              {/* Assessment Session metadata */}
              <div className="md:col-span-7 bg-[#0e1321] p-5 rounded-xl border border-[#252a39] space-y-3 text-xs font-telemetry">
                <div className="flex justify-between border-b border-[#252a39] pb-2">
                  <span className="text-[#949eb5]">Assessment Date:</span>
                  <span className="text-white">{dateStr}</span>
                </div>
                <div className="flex justify-between border-b border-[#252a39] pb-2">
                  <span className="text-[#949eb5]">Session Duration:</span>
                  <span className="text-white">{durationSeconds} Seconds</span>
                </div>
                <div className="flex justify-between border-b border-[#252a39] pb-2">
                  <span className="text-[#949eb5]">Good Posture Window:</span>
                  <span className="text-[#4edea3] font-bold">{timeInGoodPosturePercent}% of time</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#949eb5]">Camera Orientation:</span>
                  <span className="text-[#00e5ff] uppercase">{cameraView} View</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Detailed Biomechanical Measurements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Head Position */}
            <div className="rounded-xl bg-[#161b2a] border border-[#252a39] p-4 space-y-1">
              <span className="text-[10px] font-telemetry uppercase text-[#949eb5] block">Head Position</span>
              <div className="text-2xl font-bold font-telemetry text-white">{metrics.forwardHeadAngle}°</div>
              <span className="text-[11px] text-[#78829d]">Target: &lt; 12°</span>
            </div>

            {/* 2. Shoulder Alignment */}
            <div className="rounded-xl bg-[#161b2a] border border-[#252a39] p-4 space-y-1">
              <span className="text-[10px] font-telemetry uppercase text-[#949eb5] block">Shoulder Alignment</span>
              <div className="text-2xl font-bold font-telemetry text-white">{metrics.shoulderTiltAngle}°</div>
              <span className="text-[11px] text-[#78829d]">Target: &lt; 3.5°</span>
            </div>

            {/* 3. Hip Alignment */}
            <div className="rounded-xl bg-[#161b2a] border border-[#252a39] p-4 space-y-1">
              <span className="text-[10px] font-telemetry uppercase text-[#949eb5] block">Hip Alignment</span>
              <div className="text-2xl font-bold font-telemetry text-white">{metrics.hipTiltAngle ?? 1.5}°</div>
              <span className="text-[11px] text-[#78829d]">Target: &lt; 3.0°</span>
            </div>

            {/* 4. Torso Alignment */}
            <div className="rounded-xl bg-[#161b2a] border border-[#252a39] p-4 space-y-1">
              <span className="text-[10px] font-telemetry uppercase text-[#949eb5] block">Torso Alignment</span>
              <div className="text-2xl font-bold font-telemetry text-white">{metrics.torsoSlouchAngle}°</div>
              <span className="text-[11px] text-[#78829d]">Target: &lt; 8°</span>
            </div>
          </div>

          {/* AI Posture Coach Guidance Card */}
          <div className="rounded-2xl bg-[#161b2a] border border-[#00e5ff]/30 p-6 sm:p-8 space-y-5 shadow-lg relative">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/40 flex items-center justify-center text-[#00e5ff]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-telemetry font-bold text-base">Ergonomic Analysis & Guidance</h3>
              </div>

              <div className="flex items-center gap-2">
                {aiExplanationUnavailable ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-telemetry uppercase bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/30">
                    Biomechanical Engine
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-telemetry uppercase bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30">
                    Gemini AI Coach
                  </span>
                )}
                {focusArea && (
                  <span className="px-3 py-1 rounded-full text-xs font-telemetry uppercase bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30">
                    Focus: {focusArea}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-[#dee2f6] leading-relaxed">
              {aiSummary ||
                'Your session demonstrated consistent upper body control. Continue monitoring gaze depth to avoid cervical hyper-extension.'}
            </p>

            {/* Actionable Recommendations */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-telemetry font-bold uppercase tracking-wider text-white">
                Recommended Workstation Adjustments & Habits:
              </h4>
              <div className="space-y-2">
                {recommendations && recommendations.length > 0 ? (
                  recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-xl bg-[#0e1321] border border-[#252a39] text-xs text-[#c5cce0]"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#00e5ff]/20 text-[#00e5ff] flex items-center justify-center font-telemetry font-bold shrink-0 text-[11px]">
                        {i + 1}
                      </span>
                      <span className="leading-snug">{rec}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-[#0e1321] border border-[#252a39] text-xs text-[#949eb5]">
                    Maintain screen at eye level and stand up for a brief posture reset every 20 minutes.
                  </div>
                )}
              </div>
            </div>

            {encouragement && (
              <div className="p-3.5 rounded-xl bg-[#4edea3]/10 border border-[#4edea3]/30 text-xs text-[#4edea3] font-medium italic">
                "{encouragement}"
              </div>
            )}
          </div>

          {/* Action Buttons Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#252a39]">
            <button
              onClick={onRetake}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#00e5ff] text-[#0e1321] font-bold text-xs font-telemetry tracking-wider hover:bg-[#c3f5ff] transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>START NEW ASSESSMENT</span>
            </button>

            <button
              onClick={onViewProgress}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#161b2a] border border-[#252a39] text-white font-medium text-xs font-telemetry hover:border-[#00e5ff]/40"
            >
              <span>VIEW PROGRESS LOGS</span>
              <ArrowRight className="w-4 h-4 text-[#00e5ff]" />
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};
