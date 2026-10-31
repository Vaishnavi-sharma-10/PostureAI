import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Maximize2,
  Sun,
  Eye,
  Camera,
  X
} from 'lucide-react';
import {
  NormalizedLandmark,
  CameraViewMode,
  UserBodyCalibration
} from '../types';
import { extractNormalizedMeasurements } from '../ai/activityClassifier';
import { detectCameraOrientation } from '../posture/angles';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLandmarks: NormalizedLandmark[] | null;
  currentViewMode: CameraViewMode;
  onCalibrationComplete: (calibration: UserBodyCalibration) => void;
  existingCalibration: UserBodyCalibration | null;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  currentLandmarks,
  currentViewMode,
  onCalibrationComplete,
  existingCalibration
}) => {
  const [step, setStep] = useState<'checklist' | 'capturing' | 'complete'>('checklist');
  const [selectedView, setSelectedView] = useState<CameraViewMode>(currentViewMode);
  const [countdown, setCountdown] = useState(3);
  const [samples, setSamples] = useState<{
    torsoLengths: number[];
    shoulderWidths: number[];
    hipWidths: number[];
    heights: number[];
  }>({
    torsoLengths: [],
    shoulderWidths: [],
    hipWidths: [],
    heights: []
  });

  const [calibratedData, setCalibratedData] = useState<UserBodyCalibration | null>(existingCalibration);
  const isCapturingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setStep('checklist');
      setSelectedView(currentViewMode);
      setCountdown(3);
      setSamples({ torsoLengths: [], shoulderWidths: [], hipWidths: [], heights: [] });
    }
  }, [isOpen, currentViewMode]);

  // Calibration capture loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'capturing') {
      isCapturingRef.current = true;
      let remaining = 3;
      setCountdown(3);

      timer = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);

        if (remaining <= 0) {
          clearInterval(timer);
          isCapturingRef.current = false;
          finalizeCalibration();
        }
      }, 1000);
    } else {
      isCapturingRef.current = false;
    }

    return () => {
      clearInterval(timer);
      isCapturingRef.current = false;
    };
  }, [step]);

  // Ingest frames while capturing
  useEffect(() => {
    if (step === 'capturing' && currentLandmarks && currentLandmarks.length >= 25) {
      const m = extractNormalizedMeasurements(currentLandmarks);
      setSamples((prev) => ({
        torsoLengths: [...prev.torsoLengths, m.torsoLength],
        shoulderWidths: [...prev.shoulderWidths, m.shoulderWidth],
        hipWidths: [...prev.hipWidths, m.hipWidth],
        heights: [...prev.heights, m.bodyHeightEst]
      }));
    }
  }, [step, currentLandmarks]);

  const finalizeCalibration = () => {
    const avg = (arr: number[], fallback: number) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : fallback;

    const baselineTorsoLength = Number(avg(samples.torsoLengths, 0.32).toFixed(3));
    const baselineShoulderWidth = Number(avg(samples.shoulderWidths, 0.22).toFixed(3));
    const baselineHipWidth = Number(avg(samples.hipWidths, 0.16).toFixed(3));
    const baselineStandingHeight = Number(avg(samples.heights, 0.88).toFixed(3));

    const calibration: UserBodyCalibration = {
      timestamp: Date.now(),
      isCalibrated: true,
      baselineTorsoLength,
      baselineShoulderWidth,
      baselineHipWidth,
      baselineStandingHeight,
      viewMode: selectedView
    };

    setCalibratedData(calibration);
    setStep('complete');
    onCalibrationComplete(calibration);
  };

  if (!isOpen) return null;

  // View validation
  const detectedOrientation = currentLandmarks ? detectCameraOrientation(currentLandmarks) : 'front';
  const orientationMatches =
    selectedView === 'front' ? detectedOrientation === 'front' : detectedOrientation === 'side';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#161b2a] border border-[#252a39] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0 text-[#dee2f6]">
        {/* Header */}
        <div className="p-5 border-b border-[#252a39] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00e5ff]/20 border border-[#00e5ff]/40 flex items-center justify-center text-[#00e5ff]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Biomechanical Calibration</h3>
              <p className="text-xs text-[#949eb5] font-telemetry">
                Establish body-relative scale for invariant accuracy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#949eb5] hover:text-white hover:bg-[#252a39] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {step === 'checklist' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-telemetry uppercase text-[#00e5ff] tracking-wider block">
                  Step 1: Framing & Environmental Verification
                </span>
                <p className="text-xs text-[#949eb5]">
                  Please ensure the following conditions are met before taking a 3-second baseline capture:
                </p>
              </div>

              {/* View Selection */}
              <div className="space-y-1.5 bg-[#0e1321]/60 p-3.5 rounded-xl border border-[#252a39]">
                <label className="text-xs font-telemetry text-white font-semibold block">
                  Select Target Camera Angle:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedView('front')}
                    className={`py-2 px-3 rounded-lg text-xs font-telemetry font-bold border transition-all ${
                      selectedView === 'front'
                        ? 'bg-[#00e5ff]/20 border-[#00e5ff] text-[#00e5ff]'
                        : 'bg-[#1a1f2e] border-[#252a39] text-[#949eb5]'
                    }`}
                  >
                    Front View (Bilateral)
                  </button>
                  <button
                    onClick={() => setSelectedView('side')}
                    className={`py-2 px-3 rounded-lg text-xs font-telemetry font-bold border transition-all ${
                      selectedView === 'side'
                        ? 'bg-[#00e5ff]/20 border-[#00e5ff] text-[#00e5ff]'
                        : 'bg-[#1a1f2e] border-[#252a39] text-[#949eb5]'
                    }`}
                  >
                    Profile View (Sagittal)
                  </button>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#0e1321]/60 border border-[#252a39]">
                  <Sun className="w-4 h-4 text-[#ffb95f] shrink-0" />
                  <span>
                    <strong>Adequate Lighting:</strong> Face the light source; avoid bright backlight.
                  </span>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#0e1321]/60 border border-[#252a39]">
                  <Maximize2 className="w-4 h-4 text-[#00e5ff] shrink-0" />
                  <span>
                    <strong>Camera Distance:</strong> Keep head, shoulders, torso, and hips inside the frame.
                  </span>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#0e1321]/60 border border-[#252a39]">
                  <Eye className="w-4 h-4 text-[#4edea3] shrink-0" />
                  <span>
                    <strong>Natural Stance:</strong> Hold your normal upright standing or seated posture.
                  </span>
                </div>
              </div>

              {/* Live Framing Check Warning */}
              {currentLandmarks && !orientationMatches && (
                <div className="p-3 rounded-lg bg-[#ffb95f]/15 border border-[#ffb95f]/30 text-xs text-[#ffb95f] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Detected orientation is <strong>{detectedOrientation.toUpperCase()}</strong>. Please face{' '}
                    {selectedView === 'front' ? 'directly forward' : 'sideways in profile'}.
                  </span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#1a1f2e] border border-[#252a39] text-xs font-telemetry text-[#949eb5] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep('capturing')}
                  className="px-5 py-2 rounded-xl bg-[#00e5ff] text-[#0e1321] text-xs font-bold font-telemetry hover:bg-[#c3f5ff] transition-all"
                >
                  START 3-SEC CAPTURE
                </button>
              </div>
            </div>
          )}

          {step === 'capturing' && (
            <div className="text-center py-6 space-y-4">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-[#00e5ff]/20 animate-ping" />
                <div className="w-20 h-20 rounded-full bg-[#00e5ff]/15 border-2 border-[#00e5ff] flex items-center justify-center">
                  <span className="text-4xl font-extrabold font-telemetry text-[#00e5ff]">
                    {countdown}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">Calibrating Body Measurements...</h4>
                <p className="text-xs text-[#949eb5] max-w-xs mx-auto">
                  Hold still in your natural posture while the optical sensor records baseline geometry.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0e1321] border border-[#252a39] text-[11px] font-telemetry text-[#00e5ff]">
                CAPTURING FRAMES: {samples.torsoLengths.length} SAMPLES RECORDED
              </div>
            </div>
          )}

          {step === 'complete' && calibratedData && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#4edea3]/15 border border-[#4edea3]/30 text-[#4edea3]">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="font-bold text-white text-sm">Calibration Complete</h4>
                  <p className="text-xs text-[#b8f5d7]">
                    Baseline body geometry successfully registered. Measurements are normalized to your scale.
                  </p>
                </div>
              </div>

              {/* Telemetry Baseline Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs font-telemetry">
                <div className="p-3 rounded-xl bg-[#0e1321] border border-[#252a39]">
                  <span className="text-[#949eb5] block">Torso Scale:</span>
                  <span className="text-white font-bold text-sm">
                    {calibratedData.baselineTorsoLength} norm units
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0e1321] border border-[#252a39]">
                  <span className="text-[#949eb5] block">Shoulder Width:</span>
                  <span className="text-white font-bold text-sm">
                    {calibratedData.baselineShoulderWidth} norm units
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0e1321] border border-[#252a39]">
                  <span className="text-[#949eb5] block">Pelvic Hip Width:</span>
                  <span className="text-white font-bold text-sm">
                    {calibratedData.baselineHipWidth} norm units
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0e1321] border border-[#252a39]">
                  <span className="text-[#949eb5] block">Target View:</span>
                  <span className="text-[#00e5ff] font-bold text-sm uppercase">
                    {calibratedData.viewMode}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={() => setStep('checklist')}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1f2e] border border-[#252a39] text-xs font-telemetry text-[#949eb5] hover:text-white flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Recalibrate
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-[#00e5ff] text-[#0e1321] text-xs font-bold font-telemetry hover:bg-[#c3f5ff] transition-all"
                >
                  APPLY CALIBRATION
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
