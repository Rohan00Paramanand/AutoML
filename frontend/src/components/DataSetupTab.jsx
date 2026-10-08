import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Upload,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Play,
  Sliders,
  AlertTriangle,
  FileText,
  Search,
  Database,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import MetricCard from './MetricCard';

const CLASSIFICATION_MODELS = [
  'Logistic Regression',
  'Random Forest Classifier',
  'Gradient Boosting Classifier',
  'Extra Trees Classifier',
  'AdaBoost Classifier',
  'Decision Tree Classifier',
  'K-Nearest Neighbors Classifier',
];

const REGRESSION_MODELS = [
  'Ridge Regression',
  'Lasso Regression',
  'Random Forest Regressor',
  'Gradient Boosting Regressor',
  'Extra Trees Regressor',
  'AdaBoost Regressor',
  'Decision Tree Regressor',
  'K-Nearest Neighbors Regressor',
];

export default function DataSetupTab({
  dataset,
  onLoadSample,
  onUploadFile,
  heuristics,
  setHeuristics,
  targetCol,
  setTargetCol,
  taskType = 'auto',
  setTaskType,
  selectedModel = 'auto',
  setSelectedModel,
  onRunAutoML,
  isRunningAutoML,
  loadingStep,
}) {
  const [activeSubTab, setActiveSubTab] = useState('preview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleSampleClick = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#6366f1', '#38bdf8', '#10b981'],
    });
    onLoadSample();
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUploadFile(e.target.files[0]);
    }
  };

  // Filter preview records
  const filteredPreview = dataset?.preview
    ? dataset.preview.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-800 p-6 sm:p-8 shadow-sm backdrop-blur-xl"
      >
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-300 uppercase tracking-wider mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Next-Gen Transparent AutoML
          </div>
          <h1 className="font-sans text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Transparent Heuristics & Explainable ML Pipelines
          </h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Upload any tabular CSV file or load our sample dataset. The AutoML engine cleans, imputes, encodes, and benchmarks candidate estimators while recording an exhaustive chronicle for grounded AI explanations.
          </p>
        </div>
      </motion.div>

      {/* Dataset Ingestion Dropzone & Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
          className={`relative col-span-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
            isDragOver
              ? 'border-brand-400 bg-brand-500/10 scale-[0.99]'
              : 'border-white/[0.1] bg-[#101728]/60 hover:border-brand-500/40 hover:bg-[#131b2e]/80'
          }`}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
            id="csv-file-input"
          />
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-3 shadow-sm">
            <Upload className="h-6 w-6" />
          </div>
          <div className="font-sans text-sm font-bold text-white">
            Drag & Drop CSV File here or <span className="text-brand-400 underline">Browse</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Supports tabular CSV files with numerical and categorical features
          </p>
        </div>

        {/* Quick Sample Dataset Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#101728]/80 p-6 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <FileSpreadsheet className="h-4 w-4" /> Quick Demonstration
            </div>
            <h3 className="mt-2 font-sans text-base font-bold text-white">
              Titanic Synthetic Dataset
            </h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Contains missing ages, high-missingness cabins, categorical ports, and unique IDs.
            </p>
          </div>

          <button
            onClick={handleSampleClick}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 px-4 text-xs font-bold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" /> Load Sample Dataset
          </button>
        </div>
      </div>

      {/* Dataset Profiling Section */}
      {dataset ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-sans text-lg font-bold text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-brand-400" />
                Dataset Health & Profiling
              </h2>
              <p className="text-xs text-slate-400">
                Automated statistical summary and structural schema
              </p>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              ✓ Ready for AutoML
            </span>
          </div>

          {/* 5-Card Metric Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard
              title="Total Rows"
              value={dataset.total_rows.toLocaleString()}
              subtitle="Data samples"
              color="brand"
              delay={0.05}
            />
            <MetricCard
              title="Total Columns"
              value={dataset.total_columns}
              subtitle="Features + Target"
              color="cyan"
              delay={0.1}
            />
            <MetricCard
              title="Missing Cells"
              value={dataset.missing_cells.toLocaleString()}
              subtitle={`${dataset.missing_pct}% of cells`}
              color={dataset.missing_pct > 20 ? 'rose' : 'emerald'}
              delay={0.15}
            />
            <MetricCard
              title="Duplicate Rows"
              value={dataset.duplicate_rows.toLocaleString()}
              subtitle="Exact duplicates"
              color="amber"
              delay={0.2}
            />
            <MetricCard
              title="Memory Size"
              value={`${dataset.memory_kb} KB`}
              subtitle="In-memory footprint"
              color="brand"
              delay={0.25}
            />
          </div>

          {/* Table Preview & Schema Viewer */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#101728]/80 p-5 backdrop-blur-md shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSubTab('preview')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    activeSubTab === 'preview'
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  Raw Data Preview ({dataset.preview?.length || 0} rows)
                </button>
                <button
                  onClick={() => setActiveSubTab('schema')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    activeSubTab === 'schema'
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  Column Schema ({dataset.schema?.length || 0} features)
                </button>
              </div>

              {activeSubTab === 'preview' && (
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search in table..."
                    className="w-full rounded-lg border border-white/[0.08] bg-[#0c1222] py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* SubTab Content */}
            <div className="mt-4 overflow-x-auto">
              {activeSubTab === 'preview' ? (
                <div className="max-h-72 overflow-y-auto rounded-lg border border-white/[0.04]">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="sticky top-0 bg-[#162038] text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">
                      <tr>
                        {dataset.columns.map((col) => (
                          <th key={col} className="px-3.5 py-2.5">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] bg-[#0c1222]">
                      {filteredPreview.map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          {dataset.columns.map((col) => (
                            <td key={col} className="px-3.5 py-2 font-mono text-[0.78rem]">
                              {row[col] === null || row[col] === undefined ? (
                                <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-rose-400 text-[0.7rem]">
                                  null
                                </span>
                              ) : (
                                String(row[col])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Schema Table */
                <div className="max-h-72 overflow-y-auto rounded-lg border border-white/[0.04]">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="sticky top-0 bg-[#162038] text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-4 py-2.5">Column Name</th>
                        <th className="px-4 py-2.5">Data Type</th>
                        <th className="px-4 py-2.5">Missing %</th>
                        <th className="px-4 py-2.5">Unique Values</th>
                        <th className="px-4 py-2.5">Min / Max</th>
                        <th className="px-4 py-2.5">Mean / Top Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] bg-[#0c1222]">
                      {dataset.schema.map((item) => (
                        <tr key={item.column} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-2 font-semibold text-white">
                            {item.column}
                          </td>
                          <td className="px-4 py-2">
                            <span className="rounded-md border border-brand-500/20 bg-brand-500/10 px-2 py-0.5 font-mono text-[0.72rem] text-brand-300">
                              {item.dtype}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-mono">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[0.72rem] ${
                                item.missing_pct > 50
                                  ? 'bg-rose-500/10 text-rose-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {item.missing_pct}%
                            </span>
                          </td>
                          <td className="px-4 py-2 font-mono text-slate-400">
                            {item.unique_values}
                          </td>
                          <td className="px-4 py-2 font-mono text-slate-400 text-[0.72rem]">
                            {item.min !== null ? `${item.min} / ${item.max}` : '-'}
                          </td>
                          <td className="px-4 py-2 font-mono text-slate-400 text-[0.72rem]">
                            {item.mean !== null ? item.mean : (item.top_value ? `${item.top_value} (x${item.top_freq})` : '-')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Heuristics & Execution Controls */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#101728]/80 p-6 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-4 mb-5">
              <Sliders className="h-5 w-5 text-brand-400" />
              <div>
                <h3 className="font-sans text-base font-bold text-white">
                  AutoML Pipeline Heuristics & Target Configuration
                </h3>
                <p className="text-xs text-slate-400">
                  Configure preprocessing thresholds and target variable to predict
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Missing Drop Threshold */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Missing Drop Threshold</span>
                  <span className="font-mono text-brand-400">
                    {Math.round(heuristics.missingThreshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  step="5"
                  value={heuristics.missingThreshold * 100}
                  onChange={(e) =>
                    setHeuristics({
                      ...heuristics,
                      missingThreshold: parseFloat(e.target.value) / 100,
                    })
                  }
                  className="mt-2 w-full accent-brand-500"
                />
                <p className="mt-1 text-[0.72rem] text-slate-400">
                  <strong className="text-white">What it does:</strong> Removes columns that have too much missing data. If set to 60%, any column missing more than 60% of its values is dropped.
                </p>
              </div>

              {/* Cardinality Threshold */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Max One-Hot Cardinality</span>
                  <span className="font-mono text-cyan-400">
                    {heuristics.cardinalityThreshold} unique
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={heuristics.cardinalityThreshold}
                  onChange={(e) =>
                    setHeuristics({
                      ...heuristics,
                      cardinalityThreshold: parseInt(e.target.value),
                    })
                  }
                  className="mt-2 w-full accent-cyan-500"
                />
                <p className="mt-1 text-[0.72rem] text-slate-400">
                  <strong className="text-white">What it does:</strong> Categories below this limit use <em>One-Hot Encoding</em> (best for accuracy). Above this, they use <em>Ordinal Encoding</em> (saves memory).
                </p>
              </div>

              {/* Holdout Test Split */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Holdout Test Split</span>
                  <span className="font-mono text-emerald-400">
                    {Math.round(heuristics.testSize * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="40"
                  step="5"
                  value={heuristics.testSize * 100}
                  onChange={(e) =>
                    setHeuristics({
                      ...heuristics,
                      testSize: parseFloat(e.target.value) / 100,
                    })
                  }
                  className="mt-2 w-full accent-emerald-500"
                />
                <p className="mt-1 text-[0.72rem] text-slate-400">
                  <strong className="text-white">What it does:</strong> Reserves this percentage of your data to test the model at the very end to ensure it didn't just memorize the answers.
                </p>
              </div>
            </div>

            {/* Target Variable, Task Formulation & Model Selection */}
            <div className="mt-8 border-t border-white/[0.08] pt-6">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-400" />
                  Target Variable & Estimator Architecture
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose your prediction target, select problem formulation, and either benchmark all candidate models or isolate a specific algorithm.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* 1. Target Column Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Target Variable to Predict
                  </label>
                  <select
                    value={targetCol}
                    onChange={(e) => setTargetCol(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-[#0c1222] py-2.5 px-3 text-xs font-bold text-white focus:border-brand-500 focus:outline-none"
                  >
                    {dataset.columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[0.72rem] text-slate-400">
                    Ground-truth label column to be optimized by the pipeline.
                  </p>
                </div>

                {/* 2. Task Formulation */}
                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Task Formulation
                  </label>
                  <select
                    value={taskType}
                    onChange={(e) => {
                      setTaskType(e.target.value);
                      setSelectedModel('auto');
                    }}
                    className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-[#0c1222] py-2.5 px-3 text-xs font-bold text-white focus:border-brand-500 focus:outline-none"
                  >
                    <option value="auto">⚡ Auto-Detect (Pipeline Decides)</option>
                    <option value="classification">🎯 Classification (Discrete Classes)</option>
                    <option value="regression">📈 Regression (Continuous Values)</option>
                  </select>
                  <p className="mt-1 text-[0.72rem] text-slate-400">
                    {taskType === 'auto'
                      ? 'Heuristics evaluate unique ratio & dtype.'
                      : taskType === 'classification'
                      ? 'Optimizes cross-entropy, Accuracy & F1.'
                      : 'Optimizes continuous MSE, RMSE & R².'}
                  </p>
                </div>

                {/* 3. Model Architecture Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Model Selection
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-[#0c1222] py-2.5 px-3 text-xs font-bold text-white focus:border-brand-500 focus:outline-none"
                  >
                    <option value="auto">
                      🏆 Auto (Benchmark All & Pick Best)
                    </option>

                    {taskType === 'classification' && (
                      <optgroup label="Classification Algorithms (7 Models)">
                        {CLASSIFICATION_MODELS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {taskType === 'regression' && (
                      <optgroup label="Regression Algorithms (8 Models)">
                        {REGRESSION_MODELS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {taskType === 'auto' && (
                      <>
                        <optgroup label="Classification Algorithms">
                          {CLASSIFICATION_MODELS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Regression Algorithms">
                          {REGRESSION_MODELS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </optgroup>
                      </>
                    )}
                  </select>
                  <p className="mt-1 text-[0.72rem] text-slate-400">
                    {selectedModel === 'auto'
                      ? 'Full multi-model exploration & leaderboard ranking.'
                      : `Trains solely ${selectedModel}.`}
                  </p>
                </div>
              </div>

              {/* Execution Action Bar */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-[#0c1222]/80 p-4">
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-white">Execution Mode:</span>{' '}
                  {selectedModel === 'auto' ? (
                    <span className="inline-flex items-center gap-1.5 text-brand-300 font-medium">
                      <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
                      Full Multi-Model Benchmark ({taskType === 'regression' ? '8 Regression' : taskType === 'classification' ? '7 Classification' : '7–8'} Candidates)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-cyan-300 font-medium">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                      Targeted Single-Model Training ({selectedModel})
                    </span>
                  )}
                </div>

                <button
                  disabled={isRunningAutoML}
                  onClick={onRunAutoML}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-brand-500/30 py-3 px-8 text-sm font-extrabold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {isRunningAutoML ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>{loadingStep || 'Executing Pipeline...'}</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-white" />
                      <span>
                        {selectedModel === 'auto'
                          ? 'Run Transparent AutoML'
                          : `Train & Evaluate ${selectedModel}`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-[#101728]/40 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-slate-500 mb-4">
            <FileSpreadsheet className="h-7 w-7" />
          </div>
          <h3 className="font-sans text-base font-bold text-white">
            No Dataset Ingested Yet
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-400 leading-relaxed">
            Upload your CSV file above or click "Load Sample Dataset" to inspect schema statistics and execute AutoML.
          </p>
        </div>
      )}
    </div>
  );
}
