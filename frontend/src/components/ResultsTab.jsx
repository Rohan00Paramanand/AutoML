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



  const barColors = [
    '#38bdf8', // sky
    '#818cf8', // indigo
    '#c084fc', // purple
    '#34d399', // emerald
    '#f59e0b', // amber
    '#f472b6', // pink
    '#2dd4bf', // teal
    '#fb7185', // rose
  ];

  const targetColorPalette = [
    { stroke: '#38bdf8', from: '#38bdf8', to: '#0284c7' }, // Sky
    { stroke: '#a855f7', from: '#c084fc', to: '#7e22ce' }, // Purple
    { stroke: '#34d399', from: '#34d399', to: '#059669' }, // Emerald
    { stroke: '#fbbf24', from: '#fcd34d', to: '#d97706' }, // Amber
    { stroke: '#f472b6', from: '#f472b6', to: '#db2777' }, // Pink
    { stroke: '#818cf8', from: '#a5b4fc', to: '#4f46e5' }, // Indigo
    { stroke: '#2dd4bf', from: '#5eead4', to: '#0d9488' }, // Teal
    { stroke: '#fb7185', from: '#fda4af', to: '#e11d48' }, // Rose
  ];



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

          <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#0a1020]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="sticky top-0 bg-[#131b2e] text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2">Rank & Model</th>
                  <th className="px-3 py-2 text-right">{isClassification ? 'Accuracy' : 'R² Score'}</th>
                  <th className="px-3 py-2 text-right">{isClassification ? 'F1-Score' : 'RMSE Loss'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {leaderboard.map((row, idx) => {
                  const isWinner = idx === 0;
                  const rankBadge =
                    idx === 0
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                      : idx === 1
                      ? 'bg-slate-300/10 text-slate-300 border-slate-400/20'
                      : idx === 2
                      ? 'bg-amber-700/20 text-amber-400 border-amber-700/30'
                      : 'bg-white/[0.04] text-slate-400 border-white/[0.06]';

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isWinner ? 'bg-brand-500/[0.04]' : ''
                      }`}
                    >
                      <td className="px-3 py-2 font-semibold text-white flex items-center gap-2">
                        <span
                          className={`inline-flex items-center justify-center h-4.5 min-w-[20px] px-1.5 rounded text-[0.65rem] font-mono font-bold border ${rankBadge}`}
                        >
                          #{idx + 1}
                        </span>
                        <span className="truncate">{row.Model}</span>
                        {isWinner && (
                          <span className="hidden sm:inline-flex rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[0.62rem] font-bold text-emerald-400">
                            Winner
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-cyan-300 font-bold">
                        {(row.Accuracy ?? row.R2_Score)?.toFixed?.(4) ?? row.Accuracy ?? row.R2_Score}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-300 font-bold">
                        {(row.F1_Score ?? row.RMSE)?.toFixed?.(4) ?? row.F1_Score ?? row.RMSE}
                      </td>
                    </tr>
                  );
                })}
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
                    radius={[0, 6, 6, 0]}
                  >
                    {feature_importances.slice(0, 6).map((entry, index) => (
                      <Cell
                        key={`cell-feat-${index}`}
                        fill={barColors[index % barColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Feature importance not available for this model type
            </div>
          )}

          {/* Mini Table with Progress Bars */}
          <div className="mt-4 max-h-44 overflow-y-auto rounded-lg border border-white/[0.04]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="sticky top-0 bg-[#162038] text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2">Feature</th>
                  <th className="px-3 py-2 text-right">Contribution %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] bg-[#0c1222]">
                {feature_importances.map((row, idx) => {
                  const pct = row.Importance_Percentage || 0;
                  const color = barColors[idx % barColors.length];
                  return (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 py-1.5 font-semibold text-white flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="truncate max-w-[140px]">{row.Feature}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono">
                        <div className="inline-flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(4, pct))}%`, backgroundColor: color }}
                            />
                          </div>
                          <span className="text-cyan-300 font-bold">{pct.toFixed(2)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

      </div>



      {/* Exploratory Data Analysis & Diagnostics */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* 1. Target Distribution (EDA) Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#101728]/80 p-5 backdrop-blur-md shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-emerald-400" />
              <div>
                <h3 className="font-sans text-sm font-bold text-white">
                  Target Distribution (EDA)
                </h3>
                <p className="text-[0.7rem] text-slate-400">
                  Frequency of classes / target intervals in the dataset
                </p>
              </div>
            </div>
            {target_distribution.length > 0 && (
              <span className="self-start sm:self-auto rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[0.7rem] font-mono font-bold text-emerald-400">
                {target_distribution.reduce((acc, d) => acc + (Number(d.count) || 0), 0).toLocaleString()} samples
              </span>
            )}
          </div>

          {target_distribution.length > 0 ? (
            <>
              <div className="h-60 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={target_distribution} margin={{ top: 15, right: 15, left: -20, bottom: 10 }}>
                    <defs>
                      {target_distribution.map((entry, index) => {
                        const pal = targetColorPalette[index % targetColorPalette.length];
                        return (
                          <linearGradient
                            key={`target-grad-${index}`}
                            id={`target-grad-${index}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor={pal.from} stopOpacity={0.95} />
                            <stop offset="100%" stopColor={pal.to} stopOpacity={0.4} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      allowDecimals={false}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255, 255, 255, 0.04)', radius: 6 }}
                      content={<CustomChartTooltip unit=" samples" />}
                    />
                    <Bar dataKey="count" name="Frequency" radius={[8, 8, 2, 2]} maxBarSize={85}>
                      {target_distribution.map((entry, index) => {
                        const pal = targetColorPalette[index % targetColorPalette.length];
                        return (
                          <Cell
                            key={`cell-target-${index}`}
                            fill={`url(#target-grad-${index})`}
                            stroke={pal.stroke}
                            strokeWidth={1.5}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Class Breakdown Chips */}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.04] pt-3">
                {target_distribution.map((entry, index) => {
                  const pal = targetColorPalette[index % targetColorPalette.length];
                  const total = target_distribution.reduce((acc, d) => acc + (Number(d.count) || 0), 0);
                  const pct = total > 0 ? ((entry.count / total) * 100).toFixed(1) : 0;
                  return (
                    <div
                      key={`pill-${index}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c1426] px-2.5 py-1 text-xs transition-colors hover:border-white/[0.15]"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full shadow-[0_0_6px_currentColor]"
                        style={{ backgroundColor: pal.stroke, color: pal.stroke }}
                      />
                      <span className="font-mono font-bold text-white">Class {entry.label}</span>
                      <span className="font-mono font-bold" style={{ color: pal.stroke }}>
                        {entry.count}
                      </span>
                      <span className="text-[0.68rem] text-slate-500">({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Target distribution not available
            </div>
          )}
          <p className="mt-3 text-xs text-slate-400 leading-relaxed">
            <strong>Why it matters:</strong> If the distribution is heavily skewed, accuracy alone is misleading, and the model might simply predict the majority class.
          </p>
        </div>

        {/* 2. Confusion Matrix Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#101728]/80 p-5 backdrop-blur-md shadow-sm">
          {(() => {
            const matrixLabels = confusion_matrix?.labels || [];
            const matrixData = confusion_matrix?.matrix || [];
            const hasData = matrixLabels.length > 0 && matrixData.length > 0;
            const totalHoldout = hasData ? matrixData.flat().reduce((a, b) => a + (Number(b) || 0), 0) : 0;
            const correctHoldout = hasData ? matrixData.reduce((acc, row, i) => acc + (Number(row[i]) || 0), 0) : 0;
            const errorHoldout = totalHoldout - correctHoldout;
            const accuracyHoldout = totalHoldout > 0 ? ((correctHoldout / totalHoldout) * 100).toFixed(1) : '0';

            return (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-3 mb-4">
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
                  {hasData && (
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[0.7rem] font-mono font-bold text-emerald-400">
                        Accuracy: {accuracyHoldout}%
                      </span>
                      <span className="rounded-lg bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 text-[0.7rem] font-mono text-slate-400">
                        {totalHoldout} samples
                      </span>
                    </div>
                  )}
                </div>

                {hasData ? (
                  <>
                    <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0a1020] shadow-inner">
                      <table className="w-full min-w-[360px] border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#131b2e] border-b border-white/[0.08]">
                            <th className="w-32 border-r border-white/[0.08] p-3 text-left bg-[#0e1628]">
                              <div className="flex items-center justify-between text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
                                <span>Actual ↓</span>
                                <span className="text-brand-400">Pred →</span>
                              </div>
                            </th>
                            {matrixLabels.map((label) => (
                              <th
                                key={`col-head-${label}`}
                                className="p-3 text-center"
                              >
                                <div className="inline-flex items-center gap-1 rounded-md bg-white/[0.05] border border-white/[0.08] px-2.5 py-1 font-mono text-xs font-bold text-white">
                                  <span className="text-slate-400 font-normal text-[0.68rem]">Pred</span>
                                  <span>{label}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06]">
                          {matrixData.map((row, rowIndex) => (
                            <tr key={`matrix-row-${matrixLabels[rowIndex] || rowIndex}`} className="hover:bg-white/[0.01]">
                              <th className="border-r border-white/[0.08] bg-[#0e1628] p-3 text-left">
                                <div className="inline-flex items-center gap-1 rounded-md bg-white/[0.05] border border-white/[0.08] px-2.5 py-1 font-mono text-xs font-bold text-white">
                                  <span className="text-slate-400 font-normal text-[0.68rem]">True</span>
                                  <span>{matrixLabels[rowIndex]}</span>
                                </div>
                              </th>
                              {row.map((value, colIndex) => {
                                const isCorrect = rowIndex === colIndex;
                                const numericValue = Number(value) || 0;
                                const cellPct = totalHoldout > 0 ? ((numericValue / totalHoldout) * 100).toFixed(1) : '0';

                                return (
                                  <td
                                    key={`cell-${rowIndex}-${colIndex}`}
                                    className="p-2 text-center align-middle"
                                  >
                                    <div
                                      className={`flex flex-col items-center justify-center rounded-xl p-3 min-h-[72px] border transition-all duration-200 ${
                                        isCorrect
                                          ? 'bg-emerald-500/[0.08] border-emerald-500/25 shadow-[inset_0_0_16px_rgba(16,185,129,0.08)] hover:bg-emerald-500/[0.15] hover:border-emerald-400/50 hover:scale-[1.01]'
                                          : numericValue > 0
                                          ? 'bg-amber-500/[0.06] border-amber-500/20 shadow-[inset_0_0_16px_rgba(245,158,11,0.06)] hover:bg-amber-500/[0.12] hover:border-amber-400/40 hover:scale-[1.01]'
                                          : 'bg-white/[0.015] border-white/[0.05] text-slate-500'
                                      }`}
                                    >
                                      <span
                                        className={`font-mono text-2xl font-black tabular-nums tracking-tight ${
                                          isCorrect
                                            ? 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                                            : numericValue > 0
                                            ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.25)]'
                                            : 'text-slate-600'
                                        }`}
                                      >
                                        {numericValue}
                                      </span>
                                      <span
                                        className={`mt-1 text-[0.65rem] font-bold uppercase tracking-wider ${
                                          isCorrect
                                            ? 'text-emerald-400/90'
                                            : numericValue > 0
                                            ? 'text-amber-400/80'
                                            : 'text-slate-600'
                                        }`}
                                      >
                                        {isCorrect ? '✓ Correct' : numericValue > 0 ? '✕ Error' : 'Zero'}
                                      </span>
                                      <span className="text-[0.62rem] font-mono text-slate-400 opacity-70">
                                        {cellPct}%
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

                    {/* Summary Footer */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#0e1628]/60 border border-white/[0.05] px-3.5 py-2 text-xs">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                          <span className="text-slate-300 font-medium">Correct:</span>
                          <span className="font-mono font-bold text-emerald-300">{correctHoldout}</span>
                          <span className="text-[0.7rem] text-slate-500">({accuracyHoldout}%)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                          <span className="text-slate-300 font-medium">Errors:</span>
                          <span className="font-mono font-bold text-amber-300">{errorHoldout}</span>
                          <span className="text-[0.7rem] text-slate-500">({totalHoldout > 0 ? ((errorHoldout / totalHoldout) * 100).toFixed(1) : '0'}%)</span>
                        </div>
                      </div>
                      <span className="font-mono text-[0.68rem] text-slate-500">
                        Rows = Actual · Columns = Predicted
                      </span>
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
              </>
            );
          })()}
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
