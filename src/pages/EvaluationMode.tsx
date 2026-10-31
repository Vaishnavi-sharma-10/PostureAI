import React, { useState } from 'react';
import {
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  Download,
  Info,
  BarChart3,
  Table,
  Sliders,
  Cpu,
  Layers
} from 'lucide-react';
import {
  EvaluationReport,
  EvaluationSample,
  ActivityType
} from '../types';
import {
  runModelEvaluation,
  createStandardBenchmarkDataset,
  EVALUATION_CLASSES
} from '../ai/evaluationEngine';

export const EvaluationMode: React.FC = () => {
  const [dataset, setDataset] = useState<EvaluationSample[]>(() => createStandardBenchmarkDataset());
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [selectedClassTab, setSelectedClassTab] = useState<ActivityType | 'all'>('all');

  const runEvaluation = async () => {
    setIsRunning(true);
    setProgress({ completed: 0, total: dataset.length });

    // Allow UI to render progress by using small timeouts or chunking
    setTimeout(() => {
      const result = runModelEvaluation(dataset, (completed, total) => {
        setProgress({ completed, total });
      });
      setReport(result);
      setIsRunning(false);
    }, 50);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].label && parsed[0].frames) {
          setDataset(parsed);
          setReport(null);
        } else {
          alert('Invalid dataset format. Expected an array of EvaluationSample objects.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const downloadDataset = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataset, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `postureai_benchmark_dataset_${dataset.length}_samples.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const resetToStandardBenchmark = () => {
    setDataset(createStandardBenchmarkDataset());
    setReport(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0e1321] text-[#dee2f6] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#252a39] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00e5ff]" />
              <h1 className="text-2xl font-bold font-sans text-white">
                Empirical Model Evaluation Suite
              </h1>
            </div>
            <p className="text-xs text-[#949eb5] mt-0.5 font-telemetry">
              Rigorous statistical validation of activity classification against ground-truth labeled sequences
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={downloadDataset}
              className="px-3 py-1.5 rounded-lg bg-[#161b2a] border border-[#252a39] text-xs font-telemetry text-[#949eb5] hover:text-white flex items-center gap-1.5"
              title="Download labeled test sequences JSON"
            >
              <Download className="w-3.5 h-3.5" />
              Export Dataset ({dataset.length})
            </button>
            <label className="px-3 py-1.5 rounded-lg bg-[#161b2a] border border-[#252a39] text-xs font-telemetry text-[#949eb5] hover:text-white flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Import Custom JSON
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={runEvaluation}
              disabled={isRunning}
              className="px-5 py-2 rounded-xl bg-[#00e5ff] text-[#0e1321] text-xs font-bold font-telemetry tracking-wider hover:bg-[#c3f5ff] transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-[0_0_20px_rgba(0,229,255,0.3)]"
            >
              <Play className="w-4 h-4 fill-current" />
              {isRunning ? 'EVALUATING MODEL...' : 'RUN BENCHMARK SUITE'}
            </button>
          </div>
        </div>

        {/* Scientific Transparency Notice */}
        <div className="p-4 rounded-xl bg-[#161b2a] border border-[#252a39] flex items-start gap-3">
          <Info className="w-5 h-5 text-[#00e5ff] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 text-[#949eb5]">
            <span className="font-bold text-white block">
              Empirical Accuracy vs Instantaneous Confidence
            </span>
            <p>
              In accordance with scientific standards, <strong>Accuracy</strong> is defined exclusively as
              the proportion of true ground-truth labeled samples correctly classified across an evaluation test set.
              Real-time video feeds report <strong>instantaneous confidence</strong> (the strength of evidence in the active temporal window),
              never theoretical accuracy. PostureAI is an educational assessment tool, not a medical diagnostic device.
            </p>
          </div>
        </div>

        {/* Progress Bar while evaluating */}
        {isRunning && (
          <div className="p-5 rounded-xl bg-[#161b2a] border border-[#00e5ff]/40 space-y-2 animate-pulse">
            <div className="flex justify-between text-xs font-telemetry text-white">
              <span>Evaluating sequence buffer through temporal classifier engine...</span>
              <span>{progress.completed} / {progress.total} samples</span>
            </div>
            <div className="w-full h-2 bg-[#0e1321] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00e5ff] transition-all duration-200"
                style={{ width: `${(progress.completed / Math.max(1, progress.total)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Report Overview */}
        {report ? (
          <div className="space-y-6">
            {/* Top Stat Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#161b2a] border border-[#252a39] space-y-1">
                <span className="text-xs font-telemetry uppercase text-[#949eb5]">
                  Overall Validation Accuracy
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-extrabold font-telemetry ${
                    report.overallAccuracy >= 90 ? 'text-[#4edea3]' : report.overallAccuracy >= 75 ? 'text-[#00e5ff]' : 'text-[#ffb95f]'
                  }`}>
                    {report.overallAccuracy}%
                  </span>
                  <span className="text-xs text-[#949eb5]">empirical</span>
                </div>
                <span className="text-[11px] text-[#78829d] block">
                  Tested on {report.totalSamples} labeled sequence samples
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-[#161b2a] border border-[#252a39] space-y-1">
                <span className="text-xs font-telemetry uppercase text-[#949eb5]">
                  Test Dataset Size
                </span>
                <div className="text-3xl font-extrabold font-telemetry text-white">
                  {report.totalSamples}
                </div>
                <span className="text-[11px] text-[#78829d] block">
                  5 target classes (Standing, Sitting, Walking, Running, Unknown)
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-[#161b2a] border border-[#252a39] space-y-1">
                <span className="text-xs font-telemetry uppercase text-[#949eb5]">
                  Temporal Window Tested
                </span>
                <div className="text-3xl font-extrabold font-telemetry text-[#00e5ff]">
                  2.2s
                </div>
                <span className="text-[11px] text-[#78829d] block">
                  Rolling buffer with kinematic hysteresis
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-[#161b2a] border border-[#252a39] space-y-1">
                <span className="text-xs font-telemetry uppercase text-[#949eb5]">
                  Edge Cases Included
                </span>
                <div className="text-3xl font-extrabold font-telemetry text-[#ffb95f]">
                  {report.classes.unknown?.totalSamples ?? 10}
                </div>
                <span className="text-[11px] text-[#78829d] block">
                  Low visibility, stand-to-sit transitions, noise
                </span>
              </div>
            </div>

            {/* Per-Class Metrics Table */}
            <div className="p-5 rounded-2xl bg-[#161b2a] border border-[#252a39] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-[#00e5ff]" />
                  <h3 className="font-bold text-white text-sm font-telemetry uppercase tracking-wider">
                    Per-Class Performance Breakdown
                  </h3>
                </div>
                <span className="text-xs text-[#949eb5] font-telemetry">
                  Precision • Recall • F1 Score
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] uppercase font-telemetry text-[#949eb5] border-b border-[#252a39]">
                    <tr>
                      <th className="py-2.5 px-3">Class</th>
                      <th className="py-2.5 px-3">Samples</th>
                      <th className="py-2.5 px-3">True Pos (TP)</th>
                      <th className="py-2.5 px-3">False Pos (FP)</th>
                      <th className="py-2.5 px-3">False Neg (FN)</th>
                      <th className="py-2.5 px-3">Precision</th>
                      <th className="py-2.5 px-3">Recall</th>
                      <th className="py-2.5 px-3">F1 Score</th>
                      <th className="py-2.5 px-3 text-right">Class Accuracy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252a39] font-telemetry">
                    {EVALUATION_CLASSES.map((c) => {
                      const m = report.classes[c];
                      if (!m) return null;
                      return (
                        <tr key={c} className="hover:bg-[#1a1f2e] transition-all">
                          <td className="py-3 px-3 font-bold text-white capitalize flex items-center gap-2">
                            <span>
                              {c === 'standing' ? '🧍' : c === 'sitting' ? '🪑' : c === 'walking' ? '🚶' : c === 'running' ? '🏃' : '⏳'}
                            </span>
                            <span>{c}</span>
                          </td>
                          <td className="py-3 px-3 text-[#c5cce0]">{m.totalSamples}</td>
                          <td className="py-3 px-3 text-[#4edea3] font-bold">{m.truePositives}</td>
                          <td className="py-3 px-3 text-[#ff6b6b]">{m.falsePositives}</td>
                          <td className="py-3 px-3 text-[#ffb95f]">{m.falseNegatives}</td>
                          <td className="py-3 px-3 text-white font-bold">{m.precision}%</td>
                          <td className="py-3 px-3 text-white font-bold">{m.recall}%</td>
                          <td className="py-3 px-3 text-[#00e5ff] font-bold">{m.f1Score}%</td>
                          <td className="py-3 px-3 text-right font-extrabold text-[#4edea3]">
                            {m.accuracy}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Confusion Matrix */}
            <div className="p-5 rounded-2xl bg-[#161b2a] border border-[#252a39] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#00e5ff]" />
                  <h3 className="font-bold text-white text-sm font-telemetry uppercase tracking-wider">
                    5×5 Empirical Confusion Matrix
                  </h3>
                </div>
                <span className="text-[11px] text-[#949eb5] font-telemetry">
                  Rows: Ground Truth • Columns: Model Prediction
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-telemetry text-center border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 border border-[#252a39] text-left text-[#949eb5] bg-[#0e1321]">
                        Ground Truth \ Predicted
                      </th>
                      {report.confusionMatrix.labels.map((l) => (
                        <th key={l} className="p-2.5 border border-[#252a39] uppercase text-white bg-[#0e1321] capitalize">
                          {l}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.confusionMatrix.labels.map((trueLabel, rIdx) => (
                      <tr key={trueLabel}>
                        <td className="p-2.5 border border-[#252a39] text-left font-bold text-white bg-[#0e1321] capitalize">
                          {trueLabel}
                        </td>
                        {report.confusionMatrix.matrix[rIdx].map((val, cIdx) => {
                          const isDiagonal = rIdx === cIdx;
                          return (
                            <td
                              key={cIdx}
                              className={`p-3 border border-[#252a39] font-bold transition-all ${
                                isDiagonal
                                  ? val > 0
                                    ? 'bg-[#4edea3]/20 text-[#4edea3] text-sm font-extrabold'
                                    : 'text-[#78829d]'
                                  : val > 0
                                  ? 'bg-[#ff6b6b]/20 text-[#ffb4ab] font-bold'
                                  : 'text-[#444c65]'
                              }`}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-[#161b2a] border border-[#252a39] text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-center justify-center mx-auto text-[#00e5ff]">
              <Cpu className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-bold text-white text-base">Benchmark Ready for Execution</h3>
              <p className="text-xs text-[#949eb5] leading-relaxed">
                The standard validation dataset contains {dataset.length} labeled sequences across standing, sitting,
                walking, running, and edge cases (low lighting, partial views, transitional phases).
              </p>
            </div>
            <button
              onClick={runEvaluation}
              disabled={isRunning}
              className="px-6 py-2.5 rounded-xl bg-[#00e5ff] text-[#0e1321] text-xs font-bold font-telemetry tracking-wider hover:bg-[#c3f5ff] transition-all"
            >
              RUN EMPIRICAL BENCHMARK NOW
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
