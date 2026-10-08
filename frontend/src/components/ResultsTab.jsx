import React, { useState } from 'react';

import { motion } from 'framer-motion';

import {

  Trophy,

  BarChart3,

  TrendingUp,

  FileCode,

  Download,

  Copy,

  Check,

  Search,

  Upload,

  Sparkles,

  ArrowRight,

  Zap,

  ListFilter,

  CheckCircle2,

  FileSpreadsheet,

} from 'lucide-react';

import {

  BarChart,

  Bar,

  XAxis,

  YAxis,

  Tooltip,

  ResponsiveContainer,

  Cell,

  CartesianGrid,

} from 'recharts';

import MetricCard from './MetricCard';



// Custom High-Contrast Tooltip Component

const CustomChartTooltip = ({ active, payload, label, unit = '' }) => {

  if (active && payload && payload.length) {

    const dataItem = payload[0];

    const value = typeof dataItem.value === 'number'

      ? (unit === '%' ? dataItem.value.toFixed(2) : dataItem.value.toFixed(4))

      : dataItem.value;



    return (

      <div className="rounded-xl border border-white/[0.15] bg-[#0c1322] p-3 shadow-sm backdrop-blur-xl">

        <p className="font-sans text-xs font-bold text-white mb-1">{label || dataItem.name}</p>

        <p className="font-mono text-xs font-semibold text-cyan-400">

          <span className="text-slate-400 font-normal">{dataItem.name || 'Score'}: </span>

          {value}{unit}

        </p>

      </div>

    );

  }

  return null;

};



export default function ResultsTab({

  results,

  dataset,

  onRunPredictions,

  isScoring,

  predictionResult,

  onGoToChat,

}) {

  const [copiedLog, setCopiedLog] = useState(false);

  const [logSearch, setLogSearch] = useState('');

  const [activeLogTab, setActiveLogTab] = useState('full');



  if (!results) {

    return (

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-[#101728]/40 p-16 text-center">

        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] text-slate-500 mb-4">

          <Trophy className="h-8 w-8" />

        </div>

        <h3 className="font-sans text-lg font-bold text-white">

          No AutoML Results Yet

        </h3>

        <p className="mt-1 max-w-md text-sm text-slate-400 leading-relaxed">

          Configure and execute the AutoML pipeline in <strong>1. Data & Setup</strong> to view candidate model benchmarks, feature rankings, and decision logs.

        </p>

      </div>

    );

  }



  const {

    best_model_name,

    task_type,

    target_col,

    metrics = {},

    leaderboard = [],

    feature_importances = [],

    target_distribution = [],

    confusion_matrix = null,

    execution_log = '',

  } = results;



  const isClassification = task_type === 'classification';

  const primaryMetric = isClassification

    ? metrics.Accuracy ?? 0

    : metrics.R2_Score ?? 0;

  const primaryLabel = isClassification ? 'Holdout Accuracy' : 'Holdout R² Score';



  const secondaryMetric = isClassification

    ? metrics.F1_Score ?? 0

    : metrics.RMSE ?? 0;

  const secondaryLabel = isClassification ? 'F1-Score (Macro)' : 'RMSE Loss';



  // Handle Copy Log

  const handleCopyLog = () => {

    navigator.clipboard.writeText(execution_log);

    setCopiedLog(true);

    setTimeout(() => setCopiedLog(false), 2000);

  };



  // Handle Download Log

  const handleDownloadLog = () => {

    const blob = new Blob([execution_log], { type: 'text/plain;charset=utf-8' });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;

    link.download = `pipeline_log_${target_col}.txt`;

    link.click();

    URL.revokeObjectURL(url);

  };



  // Filter Log lines

  const filteredLog = logSearch

    ? execution_log

      .split('n')

      .filter((line) => line.toLowerCase().includes(logSearch.toLowerCase()))

      .join('n')

    : execution_log;



  // Prediction File Upload

  const handlePredictionFile = (e) => {

    if (e.target.files && e.target.files[0]) {

      onRunPredictions(e.target.files[0]);

    }

  };



  const handleDownloadPredictions = () => {

    if (!predictionResult?.csv_data) return;

    const blob = new Blob([predictionResult.csv_data], {

      type: 'text/csv;charset=utf-8',

    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;

    link.download = `predictions_${target_col}.csv`;

    link.click();

    URL.revokeObjectURL(url);

  };



  const barColors = ['#6366f1', '#38bdf8', '#10b981', '#f59e0b', '#ec4899'];



  return (

    <div className="space-y-6">

      {/* Winning Model Hero Card */}

      <motion.div

        initial={{ opacity: 0, y: 15 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ duration: 0.3 }}

        className="relative overflow-hidden rounded-2xl border border-brand-500/30 bg-slate-800 p-6 sm:p-8 shadow-sm backdrop-blur-xl"

      >

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

          <div className="space-y-2">

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 uppercase tracking-wider">

              <Trophy className="h-3.5 w-3.5" /> Winning Model

            </div>

            <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-white">

              {best_model_name}

            </h1>

            <p className="text-xs text-slate-400">

              Task: <span className="font-semibold text-slate-200 uppercase">{task_type}</span> • Target Variable: <span className="font-semibold text-brand-400 font-mono">{target_col}</span>

            </p>

          </div>



          <button

            onClick={onGoToChat}

            className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-500 active:scale-95"

          >

            <span>Ask AI Why This Model Won</span>

            <ArrowRight className="h-4 w-4" />

          </button>

        </div>

      </motion.div>



      {/* 4-Card Overview Grid */}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

        <MetricCard

          title="Champion Model"

          value={best_model_name ? best_model_name.replace(' Classifier', '').replace(' Regressor', '') : 'Top Model'}

          subtitle="Best overall score"

          icon={Trophy}

          color="brand"

          delay={0.05}

        />

        <MetricCard

          title="Task Type"

          value={task_type ? task_type.charAt(0).toUpperCase() + task_type.slice(1).toLowerCase() : 'N/A'}

          subtitle={`Target: ${target_col}`}

          icon={Zap}

          color="cyan"

          delay={0.1}

        />

        <MetricCard

          title={primaryLabel}

          value={typeof primaryMetric === 'number' ? primaryMetric.toFixed(4) : primaryMetric}

          subtitle="Holdout test evaluation"

          icon={TrendingUp}

          color="emerald"

          delay={0.15}

        />

        <MetricCard

          title={secondaryLabel}

          value={typeof secondaryMetric === 'number' ? secondaryMetric.toFixed(4) : secondaryMetric}

          subtitle="Validation metric"

          icon={BarChart3}

          color="amber"

          delay={0.2}

        />

      </div>



      {/* Candidate Model Leaderboard & Feature Importance Section */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Leaderboard Chart & Table */}

        <div className="rounded-2xl border border-white/[0.08] bg-[#101728]/80 p-5 backdrop-blur-md shadow-sm">

          <div className="flex flex-col items-start justify-between border-b border-white/[0.06] pb-3 mb-4 md:flex-row md:items-center">

            <div className="flex items-center gap-2">

              <BarChart3 className="h-5 w-5 text-brand-400" />

              <div>

                <h3 className="font-sans text-sm font-bold text-white">

                  Candidate Model Benchmarks

                </h3>

                <p className="text-[0.7rem] text-slate-400">

                  Compares the performance of different algorithms on the holdout test set. Higher scores indicate better generalization.

                </p>

              </div>

            </div>

            <span className="text-[0.72rem] text-slate-400 mt-2 md:mt-0">

              Metric: <strong className="text-white">{isClassification ? 'Holdout Accuracy' : 'R² Score'}</strong>

            </span>

          </div>



          {/* Recharts Bar Chart with fixed dark tooltip & smooth cursor */}

          {leaderboard.length > 0 ? (

            <div className="h-60 w-full">

              <ResponsiveContainer width="100%" height="100%">

                <BarChart data={leaderboard} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

                  <XAxis

                    dataKey="Model"

                    tick={{ fill: '#94a3b8', fontSize: 10 }}

                    interval={0}

                    angle={-12}

                    textAnchor="end"

                  />

                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 'auto']} />

                  <Tooltip

                    cursor={{ fill: 'rgba(255, 255, 255, 0.04)', radius: 6 }}

                    content={<CustomChartTooltip unit="" />}

                  />

                  <Bar

                    dataKey={isClassification ? 'Accuracy' : 'R2_Score'}

                    name={isClassification ? 'Accuracy' : 'R² Score'}

                    radius={[6, 6, 0, 0]}

                  >

                    {leaderboard.map((entry, index) => (

                      <Cell

                        key={`cell-${index}`}

                        fill={barColors[index % barColors.length]}

                      />

                    ))}

                  </Bar>

                </BarChart>

              </ResponsiveContainer>

            </div>

          ) : (

            <div className="py-12 text-center text-xs text-slate-400">

              No leaderboard data available

            </div>

          )}



          {/* Mini Table */}

          <div className="mt-4 max-h-44 overflow-y-auto rounded-lg border border-white/[0.04]">

            <table className="w-full text-left text-xs text-slate-300">

              <thead className="sticky top-0 bg-[#162038] text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">

                <tr>

                  <th className="px-3 py-2">Model</th>

                  <th className="px-3 py-2">{isClassification ? 'Accuracy' : 'R²'}</th>

                  <th className="px-3 py-2">{isClassification ? 'F1' : 'RMSE'}</th>

                </tr>

              </thead>

              <tbody className="divide-y divide-white/[0.04] bg-[#0c1222]">

                {leaderboard.map((row, idx) => (

                  <tr key={idx} className="hover:bg-white/[0.02]">

                    <td className="px-3 py-1.5 font-semibold text-white">

                      {row.Model}

                    </td>

                    <td className="px-3 py-1.5 font-mono text-cyan-400">

                      {(row.Accuracy ?? row.R2_Score)?.toFixed?.(4) ?? row.Accuracy ?? row.R2_Score}

                    </td>

                    <td className="px-3 py-1.5 font-mono text-emerald-400">

                      {(row.F1_Score ?? row.RMSE)?.toFixed?.(4) ?? row.F1_Score ?? row.RMSE}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>



        {/* Feature Importance Chart & Table */}

        <div className="rounded-2xl border border-white/[0.08] bg-[#101728]/80 p-5 backdrop-blur-md shadow-sm">

          <div className="flex flex-col items-start justify-between border-b border-white/[0.06] pb-3 mb-4 md:flex-row md:items-center">

            <div className="flex items-center gap-2">

              <TrendingUp className="h-5 w-5 text-cyan-400" />

              <div>

                <h3 className="font-sans text-sm font-bold text-white">

                  Feature Importance Ranking

                </h3>

                <p className="text-[0.7rem] text-slate-400">

                  Exploratory Analysis (EDA): Shows which variables had the strongest influence on the champion model's decisions.

                </p>

              </div>

            </div>

            <span className="text-[0.72rem] text-slate-400 mt-2 md:mt-0">Contribution %</span>

          </div>



          {/* Horizontal Bar Chart with high-contrast tooltip */}

          {feature_importances.length > 0 ? (

            <div className="h-60 w-full">

              <ResponsiveContainer width="100%" height="100%">

                <BarChart

                  layout="vertical"

                  data={feature_importances.slice(0, 6)}

                  margin={{ top: 10, right: 25, left: 10, bottom: 5 }}

                >

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%" />

                  <YAxis

                    dataKey="Feature"

                    type="category"

                    tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 500 }}

                    width={150}

                    tickFormatter={(val) => (val && val.length > 20 ? `${val.substring(0, 19)}…` : val)}

                  />

                  <Tooltip

                    cursor={{ fill: 'rgba(255, 255, 255, 0.04)', radius: 6 }}

                    content={<CustomChartTooltip unit="%" />}

                  />

                  <Bar

                    dataKey="Importance_Percentage"

                    name="Importance"

                    fill="#38bdf8"

                    radius={[0, 6, 6, 0]}

                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          ) : (

            <div className="py-12 text-center text-xs text-slate-400">

              Feature importance not available for this model type

            </div>

          )}



          {/* Mini Table */}

          <div className="mt-4 max-h-44 overflow-y-auto rounded-lg border border-white/[0.04]">

            <table className="w-full text-left text-xs text-slate-300">

              <thead className="sticky top-0 bg-[#162038] text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">

                <tr>

                  <th className="px-3 py-2">Feature</th>

                  <th className="px-3 py-2">Contribution %</th>

                </tr>

              </thead>

              <tbody className="divide-y divide-white/[0.04] bg-[#0c1222]">

                {feature_importances.map((row, idx) => (

                  <tr key={idx} className="hover:bg-white/[0.02]">

                    <td className="px-3 py-1.5 font-semibold text-white">

                      {row.Feature}

                    </td>

                    <td className="px-3 py-1.5 font-mono text-cyan-400">

                      {row.Importance_Percentage?.toFixed(2)}%

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      </div>



      {/* Exploratory Data Analysis & Diagnostics */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <div className="rounded-2xl border border-white/[0.08] bg-[#101728]/80 p-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-emerald-400" />
              <h3 className="font-sans text-sm font-bold text-white">
                Target Distribution (EDA)
              </h3>
            </div>
          </div>
          {target_distribution.length > 0 ? (
            <div className="h-60 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={target_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.04)', radius: 6 }} content={<CustomChartTooltip unit="" />} />
                  <Bar dataKey="count" name="Count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Target distribution not available
            </div>
          )}
          <p className="mt-3 text-xs text-slate-400 leading-relaxed">
            <strong>Why it matters:</strong> If the distribution is heavily skewed, accuracy alone is misleading, and the model might simply predict the majority class.
          </p>
        </div>



        <div className="rounded-2xl border border-white/[0.08] bg-[#101728]/80 p-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-400" />
              <div>
                <h3 className="font-sans text-sm font-bold text-white">
                  Confusion Matrix
                </h3>
                <p className="text-[0.7rem] text-slate-400">
                  Winning model performance on the holdout test set
                </p>
              </div>
            </div>
          </div>

          {confusion_matrix?.labels?.length && confusion_matrix?.matrix?.length ? (
            <>
              <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0a1020] shadow-inner">
                <table className="w-full min-w-[420px] border-collapse text-xs text-slate-300">
                  <thead>
                    <tr className="bg-[#17223a]">
                      <th className="w-32 border-b border-r border-white/[0.08] px-4 py-3 text-left align-bottom">
                        <div className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-500">Actual</div>
                        <div className="mt-0.5 text-[0.7rem] font-semibold text-slate-300">Predicted</div>
                      </th>
                      {confusion_matrix.labels.map((label) => (
                        <th
                          key={label}
                          className="border-b border-white/[0.08] px-4 py-3 text-center text-[0.7rem] font-bold uppercase tracking-wider text-slate-300"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {confusion_matrix.matrix.map((row, rowIndex) => (
                      <tr key={confusion_matrix.labels[rowIndex]} className="group">
                        <th className="border-r border-b border-white/[0.08] bg-[#111a2d] px-4 py-4 text-left font-mono text-sm font-bold text-white text-center">
                          {confusion_matrix.labels[rowIndex]}
                        </th>
                        {row.map((value, colIndex) => {
                          const isCorrect = rowIndex === colIndex;
                          const numericValue = Number(value) || 0;
                          const intensity = Math.min(22, 7 + Math.round(Math.log10(numericValue + 1) * 8));

                          return (
                            <td
                              key={`${rowIndex} -${colIndex} `}
                              className={`border - b border - white / [0.08] p - 1 ${isCorrect ? 'bg-emerald-500/[0.04]' : 'bg-amber-500/[0.025]'
                                } `}
                            >
                              <div
                                className={`text-center font-bold text-2xl min - h - 16 items - center justify-center rounded - lg border transition - colors group - hover: brightness - 110 ${isCorrect
                                  ? 'border-emerald-400/15 bg-emerald-400/[0.06] hover:bg-emerald-400/[0.11]'
                                  : 'border-amber-400/10 bg-amber-400/[0.035] hover:bg-amber-400/[0.08]'
                                  } `}
                                style={{
                                  boxShadow: isCorrect
                                    ? `inset 0 0 ${intensity}px rgba(52, 211, 153, 0.08)`
                                    : `inset 0 0 ${intensity}px rgba(251, 191, 36, 0.06)`,
                                }}
                              >
                                <span
                                  className={`font - mono text - lg font - bold tabular - nums ${isCorrect ? 'text-emerald-400' : 'text-amber-400'
                                    } `}
                                >
                                  {value}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.68rem] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400/70" />
                  <span>Correct predictions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-400/70" />
                  <span>Classification errors</span>
                </div>
                <span className="ml-auto font-mono text-slate-600">Rows = actual · Columns = predicted</span>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Confusion matrix is available for classification tasks only.
            </div>
          )}

          <p className="mt-3 text-xs text-slate-400 leading-relaxed">
            <strong>Why it matters:</strong> Diagonal values are correct predictions; off-diagonal values are classification errors. The matrix is calculated from the winning model's actual holdout predictions.
          </p>
        </div>

      </div>



      {/* Pipeline Decisions & Log */}

      <div className="rounded-2xl border border-white/[0.08] bg-[#080d1a] p-6 shadow-sm backdrop-blur-xl">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-4 mb-4">

          <div>

            <div className="flex items-center gap-2">

              <FileCode className="h-5 w-5 text-brand-400" />

              <h3 className="font-sans text-base font-bold text-white">

                Pipeline Decisions & Log

              </h3>

            </div>

            <p className="text-xs text-slate-400">

              Full step-by-step audit trail indexed into vector memory for AI explanations

            </p>

          </div>



          <div className="flex items-center gap-2">

            <div className="relative w-48">

              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />

              <input

                type="text"

                value={logSearch}

                onChange={(e) => setLogSearch(e.target.value)}

                placeholder="Filter decisions..."

                className="w-full rounded-lg border border-white/[0.08] bg-[#111827] py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"

              />

            </div>



            <button

              onClick={handleCopyLog}

              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#131b2e] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#1e293b]"

            >

              {copiedLog ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}

              <span>{copiedLog ? 'Copied' : 'Copy'}</span>

            </button>



            <button

              onClick={handleDownloadLog}

              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-500"

            >

              <Download className="h-3.5 w-3.5" />

              <span>Download (.txt)</span>

            </button>

          </div>

        </div>



        {/* Clean Formatted Terminal Log */}

        <div className="max-h-96 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#040711] p-5 terminal-code text-[0.82rem] text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-brand-500/40">

          {filteredLog}

        </div>

      </div>



      {/* Test Model on New Data (Batch Predictions) */}

      <div className="rounded-2xl border border-white/[0.08] bg-[#101728]/80 p-6 backdrop-blur-md shadow-sm">

        <div className="flex flex-col gap-1 border-b border-white/[0.06] pb-4 mb-4">

          <div className="flex items-center gap-2">

            <FileSpreadsheet className="h-5 w-5 text-brand-400" />

            <h3 className="font-sans text-base font-bold text-white">

              Test Model on New Data (Batch Predictions)

            </h3>

          </div>

          <p className="text-xs text-slate-400">

            Upload any unlabelled CSV dataset with matching features to generate predictions using the trained champion pipeline.

          </p>

        </div>



        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">

          {/* Upload Drop Area */}

          <div className="md:col-span-2 relative">

            <input

              type="file"

              accept=".csv"

              onChange={handlePredictionFile}

              className="absolute inset-0 cursor-pointer opacity-0 z-10"

              id="pred-file-input"

            />

            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/[0.12] bg-[#0c1222] py-5 px-4 text-center transition-all hover:border-brand-500/50 hover:bg-[#0f172a]">

              <Upload className="h-5 w-5 text-brand-400 mb-1.5" />

              <span className="font-sans text-xs font-bold text-white">

                {isScoring ? 'Generating Predictions...' : 'Upload CSV for Batch Scoring'}

              </span>

              <span className="text-[0.7rem] text-slate-400 mt-0.5">

                Automatically formats, scales, and appends the <code className="text-cyan-400 font-mono">Predicted_{target_col}</code> column

              </span>

            </div>

          </div>



          {/* Action Result / Download */}

          <div className="flex flex-col justify-center">

            {predictionResult ? (

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">

                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">

                  <CheckCircle2 className="h-4 w-4" />

                  <span>Successfully scored {predictionResult.total_scored} rows!</span>

                </div>

                <button

                  onClick={handleDownloadPredictions}

                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 px-4 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition-all active:scale-95"

                >

                  <Download className="h-4 w-4" /> Download Scored CSV

                </button>

              </div>

            ) : (

              <div className="rounded-xl border border-white/[0.06] bg-[#080d1a] p-4 text-center">

                <p className="text-xs text-slate-400">

                  Select a CSV file to evaluate new rows and export the predicted outcomes.

                </p>

              </div>

            )}

          </div>

        </div>



        {/* Prediction Preview Table */}

        {predictionResult?.preview && (

          <div className="mt-5 space-y-2">

            <div className="flex items-center justify-between">

              <span className="text-xs font-bold text-white">

                Scored Data Preview (First 20 rows):

              </span>

              <span className="text-[0.7rem] font-mono text-cyan-400">

                Target Column: {predictionResult.prediction_column}

              </span>

            </div>

            <div className="max-h-56 overflow-y-auto rounded-lg border border-white/[0.06]">

              <table className="w-full text-left text-xs text-slate-300">

                <thead className="sticky top-0 bg-[#162038] text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">

                  <tr>

                    {Object.keys(predictionResult.preview[0] || {}).map((col) => (

                      <th key={col} className={`px-3 py-2 ${col.startsWith('Predicted_') ? 'text-cyan-300 bg-brand-950 font-extrabold' : ''}`}>

                        {col}

                      </th>

                    ))}

                  </tr>

                </thead>

                <tbody className="divide-y divide-white/[0.04] bg-[#0c1222]">

                  {predictionResult.preview.map((row, idx) => (

                    <tr key={idx} className="hover:bg-white/[0.02]">

                      {Object.entries(row).map(([k, v]) => (

                        <td key={k} className={`px-3 py-1.5 font-mono ${k.startsWith('Predicted_') ? 'font-bold text-cyan-300 bg-brand-950/40' : ''}`}>

                          {String(v)}

                        </td>

                      ))}

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        )}

      </div>

    </div>

  );

}
