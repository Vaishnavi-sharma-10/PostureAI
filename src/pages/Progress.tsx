import React, { useState, useEffect } from 'react';
import { AssessmentSession, HistoricalStats, DailyProgressPoint } from '../types';
import { getSavedSessions, computeHistoricalStats, getDailyProgressSeries, deleteAssessmentSession, clearAllSessions } from '../services/storage';
import { BarChart3, TrendingUp, Calendar, Clock, Award, Trash2, ArrowUpRight, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface ProgressProps {
  onStartAssessment: () => void;
  onSelectSession: (session: AssessmentSession) => void;
}

export const Progress: React.FC<ProgressProps> = ({ onStartAssessment, onSelectSession }) => {
  const [sessions, setSessions] = useState<AssessmentSession[]>([]);
  const [stats, setStats] = useState<HistoricalStats>({
    totalAssessments: 0,
    averageScore: 0,
    totalTrackingMinutes: 0,
    currentStreakDays: 0,
    bestScore: 0
  });
  const [chartData, setChartData] = useState<DailyProgressPoint[]>([]);

  const loadData = () => {
    const loaded = getSavedSessions();
    setSessions(loaded);
    setStats(computeHistoricalStats(loaded));
    setChartData(getDailyProgressSeries(loaded));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteAssessmentSession(id);
    setSessions(updated);
    setStats(computeHistoricalStats(updated));
    setChartData(getDailyProgressSeries(updated));
  };

  const handleClear = () => {
    if (window.confirm('Clear all stored posture assessment history?')) {
      clearAllSessions();
      loadData();
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0e1321] text-[#dee2f6] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#252a39] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3]" />
              <h1 className="text-2xl font-bold font-sans text-white">Posture Progress & Trends</h1>
            </div>
            <p className="text-xs text-[#949eb5] mt-0.5 font-telemetry">
              Longitudinal biomechanical endurance tracking and session history
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="px-3 py-1.5 rounded-lg bg-[#161b2a] border border-[#252a39] text-xs font-telemetry text-[#949eb5] hover:text-[#ff6b6b]"
            >
              Clear Data
            </button>
            <button
              onClick={onStartAssessment}
              className="px-4 py-2 rounded-lg bg-[#00e5ff] text-[#0e1321] text-xs font-bold font-telemetry tracking-wider hover:bg-[#c3f5ff]"
            >
              NEW ASSESSMENT
            </button>
          </div>
        </div>

        {/* 4 Top KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-5 space-y-1">
            <div className="flex items-center justify-between text-[#949eb5]">
              <span className="text-xs font-telemetry uppercase">Average Alignment</span>
              <TrendingUp className="w-4 h-4 text-[#00e5ff]" />
            </div>
            <div className="text-3xl font-extrabold font-telemetry text-white">
              {stats.averageScore}
              <span className="text-xs text-[#78829d] font-normal"> / 100</span>
            </div>
            <span className="text-[11px] text-[#4edea3] font-telemetry">
              {stats.averageScore >= 80 ? 'Optimal ergonomic stamina' : 'Moderate slouch tendency'}
            </span>
          </div>

          <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-5 space-y-1">
            <div className="flex items-center justify-between text-[#949eb5]">
              <span className="text-xs font-telemetry uppercase">Assessments Logged</span>
              <Award className="w-4 h-4 text-[#ffb95f]" />
            </div>
            <div className="text-3xl font-extrabold font-telemetry text-white">
              {stats.totalAssessments}
            </div>
            <span className="text-[11px] text-[#949eb5] font-telemetry">
              Best: {stats.bestScore}/100
            </span>
          </div>

          <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-5 space-y-1">
            <div className="flex items-center justify-between text-[#949eb5]">
              <span className="text-xs font-telemetry uppercase">Active Daily Streak</span>
              <Calendar className="w-4 h-4 text-[#4edea3]" />
            </div>
            <div className="text-3xl font-extrabold font-telemetry text-[#4edea3]">
              {stats.currentStreakDays} <span className="text-sm font-normal text-white">Days</span>
            </div>
            <span className="text-[11px] text-[#949eb5] font-telemetry">
              Consistency build habits
            </span>
          </div>

          <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-5 space-y-1">
            <div className="flex items-center justify-between text-[#949eb5]">
              <span className="text-xs font-telemetry uppercase">Total Monitored Time</span>
              <Clock className="w-4 h-4 text-[#00e5ff]" />
            </div>
            <div className="text-3xl font-extrabold font-telemetry text-white">
              {stats.totalTrackingMinutes} <span className="text-sm font-normal text-white">Min</span>
            </div>
            <span className="text-[11px] text-[#949eb5] font-telemetry">
              Camera tracking minutes
            </span>
          </div>
        </div>

        {/* Alignment Trend Chart */}
        <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-telemetry font-bold text-white text-base">
                Alignment Index Over Time
              </h3>
              <p className="text-xs text-[#949eb5]">
                Daily aggregated posture performance and alignment scores
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#0e1321] text-[11px] font-telemetry text-[#00e5ff] border border-[#252a39]">
              TARGET THRESHOLD: 80+
            </span>
          </div>

          <div className="h-64 w-full pt-4">
            <ErrorBoundary>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#00e5ff" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#252a39" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#78829d"
                      tick={{ fill: '#949eb5', fontSize: 11 }}
                    />
                    <YAxis
                      domain={[40, 100]}
                      stroke="#78829d"
                      tick={{ fill: '#949eb5', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0e1321',
                        border: '1px solid #252a39',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#ffffff'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#00e5ff"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#scoreGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#78829d]">
                  No assessments logged yet.
                </div>
              )}
            </ErrorBoundary>
          </div>
        </div>

        {/* Historical Sessions Table */}
        <div className="rounded-2xl bg-[#161b2a] border border-[#252a39] overflow-hidden">
          <div className="p-5 border-b border-[#252a39] flex items-center justify-between">
            <h3 className="font-telemetry font-bold text-white text-base">
              Logged Sessions ({sessions.length})
            </h3>
            <span className="text-xs text-[#949eb5]">Click any session row to inspect</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-telemetry">
              <thead className="bg-[#0e1321] text-[#949eb5] uppercase tracking-wider border-b border-[#252a39]">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Head Angle</th>
                  <th className="py-3 px-4">Shoulder Tilt</th>
                  <th className="py-3 px-4">Good Posture</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252a39] text-[#c5cce0]">
                {sessions.map(s => {
                  const isOpt = s.rating === 'optimal';
                  const isAcc = s.rating === 'acceptable';
                  const dStr = new Date(s.timestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr
                      key={s.id}
                      onClick={() => onSelectSession(s)}
                      className="hover:bg-[#1f2536] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-white font-medium">{dStr}</td>
                      <td className="py-3 px-4">
                        <span className="text-base font-bold text-white">{s.overallScore}</span>/100
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            isOpt
                              ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/30'
                              : isAcc
                              ? 'bg-[#ffb95f]/15 text-[#ffb95f] border-[#ffb95f]/30'
                              : 'bg-[#ff6b6b]/15 text-[#ff6b6b] border-[#ff6b6b]/30'
                          }`}
                        >
                          {s.rating}
                        </span>
                      </td>
                      <td className="py-3 px-4">{s.metrics.forwardHeadAngle}°</td>
                      <td className="py-3 px-4">{s.metrics.shoulderTiltAngle}°</td>
                      <td className="py-3 px-4 text-[#4edea3] font-bold">{s.timeInGoodPosturePercent}%</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => handleDelete(s.id, e)}
                          className="p-1.5 rounded hover:bg-[#ff6b6b]/20 text-[#78829d] hover:text-[#ff6b6b] transition-colors"
                          title="Delete session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
