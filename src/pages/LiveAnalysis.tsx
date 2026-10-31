import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  Settings,
  CheckCircle2,
  Video,
  Eye,
  Activity,
  UserX,
  Maximize2,
  Sliders
} from 'lucide-react';
import {
  NormalizedLandmark,
  PostureMetrics,
  AssessmentSession,
  CameraViewMode,
  ActivityClassification,
  TrackingStatus,
  UserBodyCalibration
} from '../types';
import {
  getPoseLandmarker,
  detectPose,
  detectPoseWithCount,
  generateSyntheticPose,
  DemoPoseType
} from '../posture/poseDetector';
import { analyzePosture, evaluateTrackingQuality, validateViewModeMatch, ViewValidationResult } from '../posture/angles';
import { classifyActivity, activityClassifier } from '../posture/activityClassifier';
import { drawPoseHUD } from '../posture/drawer';
import { PostureHUD } from '../components/PostureHUD';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { CalibrationModal } from '../components/CalibrationModal';
import { DeveloperDebugPanel } from '../components/DeveloperDebugPanel';
import { playPostureAlertChime, playAlignmentRestoredChime } from '../utils/audio';
import { getCalibrationSettings, saveCalibrationSettings, saveAssessmentSession } from '../services/storage';
import { fetchPostureAISummary, StructuredPosturePayload } from '../services/gemini';

interface LiveAnalysisProps {
  onCompleteAssessment: (session: AssessmentSession) => void;
}

export const LiveAnalysis: React.FC<LiveAnalysisProps> = ({ onCompleteAssessment }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);

  // Settings & modes
  const [settings, setSettings] = useState(getCalibrationSettings());
  const [cameraView, setCameraView] = useState<CameraViewMode>(settings.viewMode);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoPoseType, setDemoPoseType] = useState<DemoPoseType>('dynamic');
  const [isMirror, setIsMirror] = useState(true);
  const [showPlumbline, setShowPlumbline] = useState(true);

  // Camera and model state
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unsupported'>('idle');
  const [cameraErrorKind, setCameraErrorKind] = useState<
    'denied' | 'not_found' | 'in_use' | 'disconnected' | 'unsupported' | 'closed' | 'generic' | null
  >(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Tracking quality state
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('tracking');
  const [statusMessage, setStatusMessage] = useState<string>('Tracking Active');
  const [statusSubMessage, setStatusSubMessage] = useState<string | undefined>(undefined);

  // Live metrics and activity
  const [metrics, setMetrics] = useState<PostureMetrics | null>(null);
  const [currentActivity, setCurrentActivity] = useState<ActivityClassification>({
    activity: 'unknown',
    label: 'Analyzing...',
    confidence: 0,
    stability: 'transitional',
    details: 'Initializing',
    reasons: []
  });
  const [fps, setFps] = useState(30);

  // Calibration and developer telemetry state
  const latestLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const multiplePeopleSinceRef = useRef<number | null>(null);
  const [currentLandmarks, setCurrentLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [calibration, setCalibration] = useState<UserBodyCalibration | null>(null);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [viewValidation, setViewValidation] = useState<ViewValidationResult>({
    isMatch: true,
    detectedView: 'front'
  });

  // Assessment tracking
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentDuration, setAssessmentDuration] = useState(30);
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const assessmentDataRef = useRef<{
    scores: number[];
    headAngles: number[];
    shoulderTilts: number[];
    hipTilts: number[];
    torsoAngles: number[];
    slouchedFrames: number;
    totalFrames: number;
    flaggedIssuesSet: Set<string>;
    startTime: number;
  }>({
    scores: [],
    headAngles: [],
    shoulderTilts: [],
    hipTilts: [],
    torsoAngles: [],
    slouchedFrames: 0,
    totalFrames: 0,
    flaggedIssuesSet: new Set(),
    startTime: 0
  });

  // Slouch audio alert state
  const slouchStartTimeRef = useRef<number | null>(null);
  const lastAlertTimeRef = useRef<number>(0);
  const wasSlouchingRef = useRef(false);

  // FPS calculation
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());

  // Initialize MediaPipe model
  useEffect(() => {
    isMountedRef.current = true;
    setIsLoadingModel(true);

    getPoseLandmarker()
      .then(() => {
        if (isMountedRef.current) setIsLoadingModel(false);
      })
      .catch((err) => {
        console.warn('Pose landmarker load issue:', err);
        if (isMountedRef.current) setIsLoadingModel(false);
      });

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Safe camera stop
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_e) {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('idle');
  }, []);

  // Request Camera Stream with thorough error classification
  const startCamera = useCallback(async () => {
    // Avoid double requesting
    if (cameraState === 'requesting') return;

    // First ensure any previous stream is completely stopped
    stopCamera();

    setCameraState('requesting');
    setCameraError(null);
    setCameraErrorKind(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState('unsupported');
        setCameraErrorKind('unsupported');
        setCameraError('Camera API is not supported in this browser environment.');
        return;
      }

      // Explicit requirements: video: true, audio: false
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      // Listen for camera disconnection
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (isMountedRef.current) {
            setCameraState('denied');
            setCameraErrorKind('disconnected');
            setCameraError('Camera disconnected. Please reconnect your webcam.');
          }
        };
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (!isMountedRef.current) return;
          videoRef.current?.play().catch(() => {});
          setCameraState('active');
          setIsDemoMode(false);
        };
      }
    } catch (err: any) {
      console.warn('Camera stream request error:', err);
      if (!isMountedRef.current) return;

      setCameraState('denied');

      const errName = err?.name || '';
      const errMsg = err?.message || '';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraErrorKind('denied');
        setCameraError('Camera access is required for posture analysis.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraErrorKind('not_found');
        setCameraError('No camera found. Please connect a webcam.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraErrorKind('in_use');
        setCameraError('Camera already in use by another application. Please close other video apps.');
      } else if (errName === 'AbortError') {
        setCameraErrorKind('closed');
        setCameraError('Camera access is required for posture analysis.');
      } else if (errName === 'OverconstrainedError') {
        setCameraErrorKind('generic');
        setCameraError('Requested camera resolution not supported by device.');
      } else {
        setCameraErrorKind('generic');
        setCameraError('Camera access is required for posture analysis.');
      }
    }
  }, [cameraState, stopCamera]);

  // Switch to synthetic demo mode
  const activateDemoMode = useCallback(() => {
    stopCamera();
    setIsDemoMode(true);
    setCameraState('active');
    setTrackingStatus('tracking');
    setStatusMessage('Synthetic Biomechanical Tracking Active');
    setStatusSubMessage(undefined);
  }, [stopCamera]);

  // Auto-start camera once on mount, ensure tracks cleaned up on unmount
  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main Detection Loop
  useEffect(() => {
    let animationFrameId: number;
    const startTime = performance.now();

    const loop = async () => {
      const now = performance.now();

      // FPS tracking
      frameCountRef.current += 1;
      if (now - lastFpsUpdateRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;
      }

      let landmarks: NormalizedLandmark[] | null = null;
      let personCount = 0;

      if (isDemoMode) {
        // Generate simulated poses
        const elapsedSec = (now - startTime) / 1000;
        landmarks = generateSyntheticPose(elapsedSec, demoPoseType);
        personCount = 1;
      } else if (cameraState === 'active' && videoRef.current && videoRef.current.readyState >= 2) {
        try {
          const landmarker = await getPoseLandmarker();
          const detection = detectPoseWithCount(landmarker, videoRef.current, now);
          landmarks = detection.landmarks;
          personCount = detection.poseCount;
        } catch (_e) {
          // Frame skip
        }
      }

      // Check Tracking Quality & Framing
      let currentQualityResult: {
        status: TrackingStatus;
        message: string;
        subMessage?: string;
      } = {
        status: 'no_person',
        message: 'Person not detected',
        subMessage: 'Position yourself in front of the camera to begin posture tracking.'
      };

      if (isDemoMode && landmarks) {
        currentQualityResult = {
          status: 'tracking',
          message: 'Simulation Active',
          subMessage: undefined
        };
      } else if (cameraState === 'active') {
        currentQualityResult = evaluateTrackingQuality(landmarks);
      }

      setTrackingStatus(currentQualityResult.status);
      setStatusMessage(currentQualityResult.message);
      setStatusSubMessage(currentQualityResult.subMessage);

      latestLandmarksRef.current = landmarks;

      // Run Activity Classification Layer
      
if (!isDemoMode && personCount > 1) {
  if (multiplePeopleSinceRef.current === null) {
    multiplePeopleSinceRef.current = now;
  }
} else {
  multiplePeopleSinceRef.current = null;
}

const confirmedPersonCount =
  !isDemoMode &&
  personCount > 1 &&
  multiplePeopleSinceRef.current !== null &&
  now - multiplePeopleSinceRef.current >= 800
    ? personCount
    : personCount > 1
      ? 1
      : personCount;

const activityResult = classifyActivity(
  landmarks,
  now,
  confirmedPersonCount
);
setCurrentActivity(activityResult);

      // Validate camera view orientation match
      // Normalized landmark x/y values must be corrected for the actual video aspect ratio.
      const video = videoRef.current;
      const aspectRatio = video && video.videoHeight > 0
        ? video.videoWidth / video.videoHeight
        : 1;

      if (landmarks && currentQualityResult.status === 'tracking') {
        const vValidation = validateViewModeMatch(landmarks, cameraView, aspectRatio);
        setViewValidation(vValidation);
      }

      // If landmarks are tracked and reliable, compute posture angles and render HUD on canvas
      if (landmarks && canvasRef.current && currentQualityResult.status === 'tracking') {
        const currentMetrics = analyzePosture(landmarks, cameraView, activityResult.activity, aspectRatio);
        setMetrics(currentMetrics);

        // Render skeleton on Canvas
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth || 640;
            canvas.height = canvas.clientHeight || 480;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          drawPoseHUD(ctx, landmarks, currentMetrics, canvas.width, canvas.height, {
            showPlumbline,
            showAngles: true,
            mirror: isMirror
          });
        }

        // Slouch Audio Alert Logic
        if (
          settings.soundAlertsEnabled &&
          activityResult.activity !== 'walking' &&
          activityResult.activity !== 'running'
        ) {
          const isCurrentlySlouching = currentMetrics.rating === 'deviated';

          if (isCurrentlySlouching) {
            if (!slouchStartTimeRef.current) {
              slouchStartTimeRef.current = now;
            } else if (now - slouchStartTimeRef.current >= settings.alertThresholdSeconds * 1000) {
              if (now - lastAlertTimeRef.current >= 4000) {
                playPostureAlertChime();
                lastAlertTimeRef.current = now;
              }
            }
            wasSlouchingRef.current = true;
          } else {
            if (wasSlouchingRef.current && slouchStartTimeRef.current && now - slouchStartTimeRef.current > 2000) {
              playAlignmentRestoredChime();
            }
            slouchStartTimeRef.current = null;
            wasSlouchingRef.current = false;
          }
        }

        // Assessment Accumulator
        if (isAssessing) {
          const data = assessmentDataRef.current;
          data.scores.push(currentMetrics.overallScore);
          data.headAngles.push(currentMetrics.forwardHeadAngle);
          data.shoulderTilts.push(currentMetrics.shoulderTiltAngle);
          data.hipTilts.push(currentMetrics.hipTiltAngle || 0);
          data.torsoAngles.push(currentMetrics.torsoSlouchAngle);
          data.totalFrames += 1;

          if (currentMetrics.rating === 'optimal' || currentMetrics.rating === 'acceptable') {
            // Good frame
          } else {
            data.slouchedFrames += 1;
          }

          currentMetrics.flaggedIssues.forEach((issue) => data.flaggedIssuesSet.add(issue));
        }
      } else if (canvasRef.current && currentQualityResult.status !== 'tracking') {
        // Clear canvas if person not detected
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    requestRef.current = animationFrameId;

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    cameraState,
    isDemoMode,
    demoPoseType,
    cameraView,
    showPlumbline,
    isMirror,
    settings,
    isAssessing
  ]);

  // Assessment Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAssessing && secondsRemaining > 0) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (isAssessing && secondsRemaining === 0) {
      finishAssessment();
    }
    return () => clearInterval(timer);
  }, [isAssessing, secondsRemaining]);

  const startTimedAssessment = (durationSec: number = 30) => {
    setAssessmentDuration(durationSec);
    setSecondsRemaining(durationSec);
    assessmentDataRef.current = {
      scores: [],
      headAngles: [],
      shoulderTilts: [],
      hipTilts: [],
      torsoAngles: [],
      slouchedFrames: 0,
      totalFrames: 0,
      flaggedIssuesSet: new Set(),
      startTime: Date.now()
    };
    setIsAssessing(true);
  };

  const finishAssessment = async () => {
    setIsAssessing(false);
    const data = assessmentDataRef.current;

    const avgScore =
      data.scores.length > 0
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        : metrics?.overallScore ?? 0;

    const avgHead =
      data.headAngles.length > 0
        ? Number((data.headAngles.reduce((a, b) => a + b, 0) / data.headAngles.length).toFixed(1))
        : metrics?.forwardHeadAngle ?? 0;

    const avgShoulder =
      data.shoulderTilts.length > 0
        ? Number((data.shoulderTilts.reduce((a, b) => a + b, 0) / data.shoulderTilts.length).toFixed(1))
        : metrics?.shoulderTiltAngle ?? 0;

    const avgHip =
      data.hipTilts.length > 0
        ? Number((data.hipTilts.reduce((a, b) => a + b, 0) / data.hipTilts.length).toFixed(1))
        : metrics?.hipTiltAngle ?? 0;

    const avgTorso =
      data.torsoAngles.length > 0
        ? Number((data.torsoAngles.reduce((a, b) => a + b, 0) / data.torsoAngles.length).toFixed(1))
        : metrics?.torsoSlouchAngle ?? 0;

    const goodPercent =
      data.totalFrames > 0
        ? Math.round(((data.totalFrames - data.slouchedFrames) / data.totalFrames) * 100)
        : (metrics && metrics.overallScore >= 75 ? 100 : 0);

    const flaggedList: string[] = Array.from(data.flaggedIssuesSet) as string[];

    // Pass structured results to coaching endpoint.
    // Local posture engine has already computed actual measurements.
    const structuredPayload: StructuredPosturePayload = {
      postureScore: avgScore,
      activity: currentActivity.activity,
      shoulderAlignment: avgShoulder < 3.5 ? 'optimal' : avgShoulder < 5.0 ? 'good' : 'needs_improvement',
      hipAlignment: avgHip < 3.0 ? 'optimal' : avgHip < 4.5 ? 'good' : 'needs_improvement',
      headPosition: avgHead < 10 ? 'optimal' : avgHead < 14 ? 'good' : 'needs_improvement',
      torsoAlignment: avgTorso < 6 ? 'optimal' : avgTorso < 9 ? 'good' : 'needs_improvement',
      headAngle: avgHead,
      shoulderTilt: avgShoulder,
      hipTilt: avgHip,
      torsoSlouch: avgTorso,
      sessionDurationSeconds: assessmentDuration,
      timeInGoodPosturePercent: goodPercent,
      flaggedIssues: flaggedList,
      cameraView
    };

    // If Gemini is unavailable (e.g. 503), fetchPostureAISummary returns deterministic coaching gracefully
    const aiResult = await fetchPostureAISummary(structuredPayload);

    const newSession: AssessmentSession = {
      id: `session-${Date.now()}`,
      timestamp: Date.now(),
      durationSeconds: assessmentDuration,
      overallScore: avgScore,
      rating: avgScore >= 82 ? 'optimal' : avgScore >= 65 ? 'acceptable' : 'deviated',
      metrics: {
        forwardHeadAngle: avgHead,
        shoulderTiltAngle: avgShoulder,
        hipTiltAngle: avgHip,
        torsoSlouchAngle: avgTorso,
        symmetryScore: Math.max(40, 100 - avgShoulder * 6),
        timeInGoodPosturePercent: goodPercent
      },
      timeInGoodPosturePercent: goodPercent,
      flaggedIssues: flaggedList,
      recommendations: aiResult.recommendations,
      aiSummary: aiResult.summary,
      focusArea: aiResult.focusArea,
      encouragement: aiResult.encouragement,
      aiExplanationUnavailable: aiResult.aiExplanationUnavailable,
      source: aiResult.source,
      cameraView
    };

    saveAssessmentSession(newSession);
    onCompleteAssessment(newSession);
  };

  const toggleSoundAlerts = () => {
    const updated = { ...settings, soundAlertsEnabled: !settings.soundAlertsEnabled };
    setSettings(updated);
    saveCalibrationSettings(updated);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0e1321] text-[#dee2f6] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#252a39] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00e5ff] animate-pulse" />
              <h1 className="text-2xl font-bold font-sans text-white">Live Posture Assessment</h1>
            </div>
            <p className="text-xs text-[#949eb5] mt-0.5 font-telemetry">
              MediaPipe 33-point neural landmark tracking with real-time trigonometric kinematics
            </p>
          </div>

          {/* Top Quick Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg bg-[#161b2a] border border-[#252a39] p-0.5 text-xs font-telemetry">
              <button
                onClick={() => setCameraView('front')}
                className={`px-3 py-1 rounded-md transition-all ${
                  cameraView === 'front' ? 'bg-[#00e5ff]/20 text-[#00e5ff] font-bold' : 'text-[#949eb5]'
                }`}
              >
                Front View
              </button>
              <button
                onClick={() => setCameraView('side')}
                className={`px-3 py-1 rounded-md transition-all ${
                  cameraView === 'side' ? 'bg-[#00e5ff]/20 text-[#00e5ff] font-bold' : 'text-[#949eb5]'
                }`}
              >
                Profile View
              </button>
            </div>

            {/* Sound Alerts Toggle */}
            <button
              onClick={toggleSoundAlerts}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
                settings.soundAlertsEnabled
                  ? 'bg-[#1a1f2e] border-[#00e5ff]/40 text-[#00e5ff]'
                  : 'bg-[#161b2a] border-[#252a39] text-[#78829d]'
              }`}
              title={settings.soundAlertsEnabled ? 'Audio alerts enabled' : 'Audio alerts muted'}
            >
              {settings.soundAlertsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Calibration Trigger Button */}
            <button
              id="btn-calibrate-sensors"
              onClick={() => {
                setCurrentLandmarks(latestLandmarksRef.current);
                setIsCalibrationOpen(true);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-telemetry flex items-center gap-1.5 transition-all ${
                calibration?.isCalibrated
                  ? 'bg-[#4edea3]/20 border-[#4edea3]/40 text-[#4edea3]'
                  : 'bg-[#1a1f2e] border-[#00e5ff]/40 text-[#00e5ff] hover:bg-[#00e5ff]/15'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{calibration?.isCalibrated ? 'CALIBRATED' : 'CALIBRATE'}</span>
            </button>

            {/* Debug Telemetry Toggle */}
            <button
              id="btn-toggle-debug"
              onClick={() => setIsDebugOpen(!isDebugOpen)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-telemetry transition-all ${
                isDebugOpen
                  ? 'bg-[#00e5ff]/20 border-[#00e5ff] text-[#00e5ff] font-bold'
                  : 'bg-[#161b2a] border-[#252a39] text-[#949eb5] hover:text-white'
              }`}
              title="Toggle kinematic telemetry and evaluation features"
            >
              DEBUG
            </button>

            {/* Demo Mode Toggle */}
            <button
              onClick={() => {
                if (isDemoMode) {
                  startCamera();
                } else {
                  activateDemoMode();
                }
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-telemetry transition-all ${
                isDemoMode
                  ? 'bg-[#ffb95f]/20 border-[#ffb95f]/40 text-[#ffb95f] font-bold'
                  : 'bg-[#1a1f2e] border-[#252a39] text-[#949eb5] hover:text-white'
              }`}
            >
              {isDemoMode ? 'SIMULATION MODE' : 'TRY DEMO SKELETON'}
            </button>
          </div>
        </div>

        {/* Explicit Camera Permission Error State with "Allow Camera" and "Try Again" buttons */}
        {cameraState === 'denied' && !isDemoMode && (
          <div className="rounded-xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#ff6b6b]/20 flex items-center justify-center shrink-0 text-[#ff6b6b]">
                <CameraOff className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-white text-sm block">
                  Camera access is required for posture analysis.
                </span>
                <span className="text-[#c5cce0] block">
                  {cameraError || 'Please allow webcam access in your browser to run live posture tracking.'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                id="allow-camera-btn"
                onClick={startCamera}
                className="px-4 py-2 rounded-lg bg-[#00e5ff] text-[#0e1321] text-xs font-bold hover:bg-[#c3f5ff] transition-all"
              >
                Allow Camera
              </button>
              <button
                id="try-again-btn"
                onClick={startCamera}
                className="px-4 py-2 rounded-lg bg-[#252a39] text-white text-xs font-semibold hover:bg-[#303444] transition-all"
              >
                Try Again
              </button>
              <button
                id="switch-demo-btn"
                onClick={activateDemoMode}
                className="px-3.5 py-2 rounded-lg bg-[#ffb95f]/20 border border-[#ffb95f]/40 text-[#ffb95f] text-xs font-bold hover:bg-[#ffb95f]/30 transition-all"
              >
                Switch to Demo Mode
              </button>
            </div>
          </div>
        )}

        {/* Demo Mode Controls Bar */}
        {isDemoMode && (
          <div className="rounded-xl bg-[#ffb95f]/10 border border-[#ffb95f]/30 p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-telemetry">
            <div className="flex items-center gap-2 text-[#ffb95f]">
              <span className="w-2 h-2 rounded-full bg-[#ffb95f] animate-pulse" />
              <span>SYNTHETIC SKELETON SIMULATOR</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[#949eb5] mr-1">Activity & Posture:</span>
              <button
                onClick={() => {
                  activityClassifier.reset();
                  setDemoPoseType('standing');
                }}
                className={`px-2.5 py-1 rounded text-[11px] ${
                  demoPoseType === 'standing'
                    ? 'bg-[#4edea3] text-[#0e1321] font-bold'
                    : 'bg-[#1a1f2e] text-[#949eb5] hover:text-white'
                }`}
              >
                🧍 Standing
              </button>
              <button
                onClick={() => {
                  activityClassifier.reset();
                  setDemoPoseType('sitting');
                }}
                className={`px-2.5 py-1 rounded text-[11px] ${
                  demoPoseType === 'sitting'
                    ? 'bg-[#4edea3] text-[#0e1321] font-bold'
                    : 'bg-[#1a1f2e] text-[#949eb5] hover:text-white'
                }`}
              >
                🪑 Sitting
              </button>
              <button
                onClick={() => {
                  activityClassifier.reset();
                  setDemoPoseType('walking');
                }}
                className={`px-2.5 py-1 rounded text-[11px] ${
                  demoPoseType === 'walking'
                    ? 'bg-[#00e5ff] text-[#0e1321] font-bold'
                    : 'bg-[#1a1f2e] text-[#949eb5] hover:text-white'
                }`}
              >
                🚶 Walking
              </button>
              <button
                onClick={() => {
                  activityClassifier.reset();
                  setDemoPoseType('running');
                }}
                className={`px-2.5 py-1 rounded text-[11px] ${
                  demoPoseType === 'running'
                    ? 'bg-[#00e5ff] text-[#0e1321] font-bold'
                    : 'bg-[#1a1f2e] text-[#949eb5] hover:text-white'
                }`}
              >
                🏃 Running
              </button>
              <div className="h-4 w-px bg-[#252a39] mx-1" />
              <button
                onClick={() => {
                  activityClassifier.reset();
                  setDemoPoseType('dynamic');
                }}
                className={`px-2.5 py-1 rounded text-[11px] ${
                  demoPoseType === 'dynamic'
                    ? 'bg-[#00e5ff] text-[#0e1321] font-bold'
                    : 'bg-[#1a1f2e] text-[#949eb5] hover:text-white'
                }`}
              >
                Work Cycle
              </button>
              <button
                onClick={() => {
                  activityClassifier.reset();
                  setDemoPoseType('slouch');
                }}
                className={`px-2.5 py-1 rounded text-[11px] ${
                  demoPoseType === 'slouch'
                    ? 'bg-[#ff6b6b] text-[#0e1321] font-bold'
                    : 'bg-[#1a1f2e] text-[#949eb5] hover:text-white'
                }`}
              >
                Slouch
              </button>
              <button
                onClick={() => {
                  activityClassifier.reset();
                  setDemoPoseType('tilt');
                }}
                className={`px-2.5 py-1 rounded text-[11px] ${
                  demoPoseType === 'tilt'
                    ? 'bg-[#ffb95f] text-[#0e1321] font-bold'
                    : 'bg-[#1a1f2e] text-[#949eb5] hover:text-white'
                }`}
              >
                Tilt
              </button>
              <button
                onClick={() => {
                  activityClassifier.reset();
                  setDemoPoseType('ideal');
                }}
                className={`px-2.5 py-1 rounded text-[11px] ${
                  demoPoseType === 'ideal'
                    ? 'bg-[#4edea3] text-[#0e1321] font-bold'
                    : 'bg-[#1a1f2e] text-[#949eb5] hover:text-white'
                }`}
              >
                Ideal
              </button>
            </div>
          </div>
        )}

        {/* Main Split View: Viewport + Telemetry Panel wrapped in Error Boundaries */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Viewport (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <ErrorBoundary>
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#090e1c] border border-[#252a39] shadow-2xl group">
                {/* Actual Video Element: Horizontally mirrored with CSS scale-x-[-1] */}
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`absolute inset-0 w-full h-full object-cover ${isMirror ? 'scale-x-[-1]' : ''} ${
                    isDemoMode ? 'opacity-0' : 'opacity-80'
                  }`}
                />

                {/* Demo Mode Background Grid */}
                {isDemoMode && (
                  <div className="absolute inset-0 hud-grid opacity-80 flex items-center justify-center">
                    <div className="text-center space-y-2 pointer-events-none opacity-40">
                      <Eye className="w-12 h-12 text-[#00e5ff] mx-auto" />
                      <span className="font-telemetry text-xs uppercase tracking-widest text-[#949eb5] block">
                        33-Point Synthetic Biomechanical Simulator
                      </span>
                    </div>
                  </div>
                )}

                {/* HUD Canvas Overlay for Skeleton & Kinematics (NOT mirrored with CSS; landmark X coords are mirrored mathematically) */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {/* Loading Indicator */}
                {isLoadingModel && (
                  <div className="absolute inset-0 bg-[#0e1321]/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-30">
                    <div className="w-10 h-10 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-telemetry uppercase tracking-widest text-[#00e5ff]">
                      INITIALIZING MEDIAPIPE TASKS VISION...
                    </span>
                  </div>
                )}

                {/* Top Viewport Telemetry Badges */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-[#0e1321]/85 border border-[#252a39] text-[11px] font-telemetry text-white shadow-md">
                      STATUS:{' '}
                      <span
                        className={
                          trackingStatus === 'tracking'
                            ? 'text-[#4edea3]'
                            : trackingStatus === 'no_person'
                            ? 'text-[#ff6b6b]'
                            : 'text-[#ffb95f]'
                        }
                      >
                        {trackingStatus === 'tracking'
                          ? 'TRACKING'
                          : trackingStatus === 'no_person'
                          ? 'NO PERSON'
                          : 'CALIBRATING'}
                      </span>
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-[#0e1321]/85 border border-[#252a39] text-[11px] font-telemetry text-[#00e5ff] shadow-md flex items-center gap-1.5">
                      <Activity className="w-3 h-3 text-[#00e5ff]" />
                      <span>ACTIVITY: {currentActivity.label.toUpperCase()}</span>
                      {currentActivity.confidence > 0 && (
                        <span className="text-[#4edea3] font-bold">({currentActivity.confidence}%)</span>
                      )}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-[#0e1321]/85 border border-[#252a39] text-[11px] font-telemetry text-[#949eb5] shadow-md hidden sm:inline-flex">
                      {cameraView.toUpperCase()} VIEW
                    </span>
                  </div>

                  {isAssessing && (
                    <div className="px-3 py-1 rounded-md bg-[#ff6b6b]/20 border border-[#ff6b6b]/50 text-xs font-telemetry text-white flex items-center gap-2 shadow-lg animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-[#ff6b6b]" />
                      <span>REC: {secondsRemaining}s</span>
                    </div>
                  )}
                </div>

                {/* Multi-Person and No-Person Warnings */}
                {cameraState === 'active' && !isDemoMode && currentActivity.activity === 'no_person' && (
                  <div className="absolute inset-x-4 top-16 mx-auto max-w-sm bg-[#ff6b6b]/90 border border-white/20 text-white text-xs font-telemetry px-3 py-2 rounded-xl backdrop-blur-md text-center shadow-lg pointer-events-none z-20 flex items-center justify-center gap-2 animate-pulse">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
                    <span>Person not detected — Step into camera frame</span>
                  </div>
                )}
                {cameraState === 'active' && !isDemoMode && currentActivity.activity === 'multiple_people' && (
                  <div className="absolute inset-x-4 top-16 mx-auto max-w-sm bg-[#ffb95f]/95 border border-white/20 text-[#0e1321] text-xs font-telemetry font-bold px-3 py-2 rounded-xl backdrop-blur-md text-center shadow-lg pointer-events-none z-20 flex items-center justify-center gap-2 animate-pulse">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#0e1321]" />
                    <span>Multiple People Detected — Single person required</span>
                  </div>
                )}

                {/* View Mode Orientation Mismatch Warning */}
                {cameraState === 'active' && !isDemoMode && trackingStatus === 'tracking' && !viewValidation.isMatch && (
                  <div className="absolute inset-x-4 top-16 mx-auto max-w-md bg-[#ffb95f]/95 border border-white/20 text-[#0e1321] text-xs font-telemetry font-bold px-3.5 py-2 rounded-xl backdrop-blur-md text-center shadow-lg z-20 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-[#0e1321]" />
                      <span>{viewValidation.promptMessage}</span>
                    </div>
                    <button
                      onClick={() => setCameraView(viewValidation.detectedView)}
                      className="px-2.5 py-1 rounded bg-[#0e1321] text-white text-[10px] font-bold uppercase hover:bg-black transition-all shrink-0"
                    >
                      Switch View
                    </button>
                  </div>
                )}

                {/* Bottom Quick Overlay Controls */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-20">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsMirror(!isMirror)}
                      className="px-2.5 py-1 rounded bg-[#0e1321]/80 border border-[#252a39] text-[11px] font-telemetry text-[#949eb5] hover:text-white backdrop-blur-sm"
                    >
                      Mirror: {isMirror ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => setShowPlumbline(!showPlumbline)}
                      className="px-2.5 py-1 rounded bg-[#0e1321]/80 border border-[#252a39] text-[11px] font-telemetry text-[#949eb5] hover:text-white backdrop-blur-sm"
                    >
                      Plumbline: {showPlumbline ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>
            </ErrorBoundary>

            {/* Assessment Session Launcher Card */}
            <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="font-telemetry font-bold text-white text-sm">
                  {isAssessing ? 'ASSESSMENT IN PROGRESS' : 'CALIBRATED POSTURAL ASSESSMENT'}
                </h3>
                <p className="text-xs text-[#949eb5]">
                  {isAssessing
                    ? 'Maintain your ordinary focus while the local kinematics engine records posture metrics.'
                    : 'Record a standardized timed window to calculate your posture score and receive ergonomic coaching.'}
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                {!isAssessing ? (
                  <>
                    <button
                      id="start-assessment-15s-btn"
                      onClick={() => startTimedAssessment(15)}
                      className="px-3 py-2 rounded-xl bg-[#1a1f2e] border border-[#252a39] text-xs font-telemetry hover:border-[#00e5ff]/50 hover:text-white text-[#949eb5]"
                    >
                      15s Quick
                    </button>
                    <button
                      id="start-assessment-30s-btn"
                      onClick={() => startTimedAssessment(30)}
                      className="px-5 py-2.5 rounded-xl bg-[#00e5ff] text-[#0e1321] text-xs font-bold font-telemetry tracking-wider transition-all hover:bg-[#c3f5ff] hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] active:scale-95"
                    >
                      START 30S ASSESSMENT
                    </button>
                    <button
                      id="start-assessment-60s-btn"
                      onClick={() => startTimedAssessment(60)}
                      className="px-3 py-2 rounded-xl bg-[#1a1f2e] border border-[#252a39] text-xs font-telemetry hover:border-[#00e5ff]/50 hover:text-white text-[#949eb5]"
                    >
                      60s Deep
                    </button>
                  </>
                ) : (
                  <button
                    onClick={finishAssessment}
                    className="px-6 py-2.5 rounded-xl bg-[#ff6b6b] text-white text-xs font-bold font-telemetry tracking-wider transition-all hover:bg-[#ff8585]"
                  >
                    FINISH EARLY ({secondsRemaining}s remaining)
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Telemetry Column (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <ErrorBoundary>
              <PostureHUD
                metrics={metrics}
                fps={fps}
                isAssessing={isAssessing}
                assessmentSecondsLeft={secondsRemaining}
                activityResult={currentActivity}
                trackingStatus={trackingStatus}
                statusMessage={statusMessage}
                statusSubMessage={statusSubMessage}
              />
            </ErrorBoundary>

            {/* Seating & Workstation Calibration Checklist */}
            <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-5 space-y-3">
              <h4 className="text-xs font-bold font-telemetry uppercase tracking-wider text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4edea3]" />
                Ergonomic Setup Guide
              </h4>
              <ul className="space-y-2 text-xs text-[#949eb5]">
                <li className="flex items-start gap-2">
                  <span className="text-[#00e5ff] font-bold">•</span>
                  <span>
                    <strong>Camera Distance:</strong> Position webcam approximately arm's length (60-80cm).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00e5ff] font-bold">•</span>
                  <span>
                    <strong>Eye Level:</strong> Top 1/3 of display screen should align with horizontal gaze.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00e5ff] font-bold">•</span>
                  <span>
                    <strong>Arms & Shoulders:</strong> Elbows relaxed at roughly 90°, forearms supported.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Developer Kinematic & Activity Telemetry Panel */}
        <DeveloperDebugPanel
          activityResult={currentActivity}
          metrics={metrics}
          trackingStatus={trackingStatus}
          calibration={calibration}
          fps={fps}
          isOpen={isDebugOpen}
          onToggle={() => setIsDebugOpen(!isDebugOpen)}
        />

        {/* Biomechanical Calibration Modal */}
        <CalibrationModal
          isOpen={isCalibrationOpen}
          onClose={() => setIsCalibrationOpen(false)}
          currentLandmarks={latestLandmarksRef.current}
          currentViewMode={cameraView}
          existingCalibration={calibration}
          onCalibrationComplete={(cal) => {
            setCalibration(cal);
            activityClassifier.setCalibration(cal);
            if (cal.viewMode !== cameraView) {
              setCameraView(cal.viewMode);
            }
          }}
        />
      </div>
    </div>
  );
};
