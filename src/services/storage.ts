import { AssessmentSession, HistoricalStats, DailyProgressPoint, CalibrationSettings } from '../types';

const SESSIONS_KEY = 'postureai_sessions_v1';
const SETTINGS_KEY = 'postureai_calibration_v1';

export const DEFAULT_SETTINGS: CalibrationSettings = {
  soundAlertsEnabled: true,
  alertThresholdSeconds: 3,
  sensitivity: 'medium',
  viewMode: 'front',
  targetPostureDuration: 30
};

// Seed sample historical sessions so graphs look rich and realistic on first launch
const SEED_SESSIONS: AssessmentSession[] = [
  {
    id: 'seed-1',
    timestamp: Date.now() - 5 * 86400000,
    durationSeconds: 30,
    overallScore: 74,
    rating: 'acceptable',
    metrics: {
      forwardHeadAngle: 15.2,
      shoulderTiltAngle: 4.1,
      torsoSlouchAngle: 8.8,
      symmetryScore: 78,
      timeInGoodPosturePercent: 68
    },
    timeInGoodPosturePercent: 68,
    flaggedIssues: ['Mild Forward Head Drift', 'Elevated Right Shoulder'],
    recommendations: [
      'Raise monitor 2 inches to reduce cervical flexion.',
      'Relax right mouse arm and balance shoulder girdle.'
    ],
    aiSummary: 'Baseline session identified moderate forward head protrusion and right acromial elevation typical of mouse reach.',
    focusArea: 'Cervical Plumbline',
    cameraView: 'front'
  },
  {
    id: 'seed-2',
    timestamp: Date.now() - 3 * 86400000,
    durationSeconds: 45,
    overallScore: 81,
    rating: 'acceptable',
    metrics: {
      forwardHeadAngle: 11.4,
      shoulderTiltAngle: 2.8,
      torsoSlouchAngle: 6.5,
      symmetryScore: 85,
      timeInGoodPosturePercent: 82
    },
    timeInGoodPosturePercent: 82,
    flaggedIssues: ['Occasional Cervical Drift'],
    recommendations: [
      'Good shoulder leveling observed. Continue practicing chin retractions.'
    ],
    aiSummary: 'Noticeable symmetry improvement. Thoracic stack maintained steady throughout the 45-second window.',
    focusArea: 'Thoracic Stability',
    cameraView: 'front'
  },
  {
    id: 'seed-3',
    timestamp: Date.now() - 1 * 86400000,
    durationSeconds: 60,
    overallScore: 89,
    rating: 'optimal',
    metrics: {
      forwardHeadAngle: 8.1,
      shoulderTiltAngle: 1.6,
      torsoSlouchAngle: 4.2,
      symmetryScore: 94,
      timeInGoodPosturePercent: 91
    },
    timeInGoodPosturePercent: 91,
    flaggedIssues: [],
    recommendations: [
      'High alignment fidelity. Maintain this workstation distance and sit-bone weight distribution.'
    ],
    aiSummary: 'Excellent posture endurance. Head centered within 8° vertical tolerance and shoulders level within 2°.',
    focusArea: 'Posture Stamina',
    cameraView: 'front'
  }
];

export function getSavedSessions(): AssessmentSession[] {
  if (typeof window === 'undefined') return SEED_SESSIONS;
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(SEED_SESSIONS));
      return SEED_SESSIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return SEED_SESSIONS;
  }
}

export function saveAssessmentSession(session: AssessmentSession): void {
  try {
    const current = getSavedSessions();
    const updated = [session, ...current];
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save assessment session:', e);
  }
}

export function deleteAssessmentSession(id: string): AssessmentSession[] {
  try {
    const current = getSavedSessions();
    const updated = current.filter(s => s.id !== id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}

export function clearAllSessions(): void {
  try {
    localStorage.removeItem(SESSIONS_KEY);
  } catch (e) {}
}

export function getCalibrationSettings(): CalibrationSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveCalibrationSettings(settings: CalibrationSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {}
}

export function computeHistoricalStats(sessions: AssessmentSession[]): HistoricalStats {
  if (sessions.length === 0) {
    return {
      totalAssessments: 0,
      averageScore: 0,
      totalTrackingMinutes: 0,
      currentStreakDays: 0,
      bestScore: 0
    };
  }

  const totalScore = sessions.reduce((acc, s) => acc + s.overallScore, 0);
  const totalDurationSec = sessions.reduce((acc, s) => acc + (s.durationSeconds || 30), 0);
  const bestScore = Math.max(...sessions.map(s => s.overallScore));

  // Compute streak (unique calendar days)
  const days = new Set(
    sessions.map(s => new Date(s.timestamp).toISOString().split('T')[0])
  );

  return {
    totalAssessments: sessions.length,
    averageScore: Math.round(totalScore / sessions.length),
    totalTrackingMinutes: Math.round((totalDurationSec / 60) * 10) / 10,
    currentStreakDays: Math.min(days.size, 14),
    bestScore,
    lastSessionDate: new Date(sessions[0].timestamp).toLocaleDateString()
  };
}

export function getDailyProgressSeries(sessions: AssessmentSession[]): DailyProgressPoint[] {
  // Group by day of week or date
  const map = new Map<string, { totalScore: number; count: number; durationSec: number }>();

  // Sort ascending by time
  const sorted = [...sessions].sort((a, b) => a.timestamp - b.timestamp);

  sorted.forEach(s => {
    const d = new Date(s.timestamp);
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const existing = map.get(label) || { totalScore: 0, count: 0, durationSec: 0 };
    existing.totalScore += s.overallScore;
    existing.count += 1;
    existing.durationSec += s.durationSeconds || 30;
    map.set(label, existing);
  });

  return Array.from(map.entries()).map(([date, data]) => ({
    date,
    score: Math.round(data.totalScore / data.count),
    sessionsCount: data.count,
    durationMinutes: Math.round((data.durationSec / 60) * 10) / 10
  }));
}
