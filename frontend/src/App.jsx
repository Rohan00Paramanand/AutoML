import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DataSetupTab from './components/DataSetupTab';
import ResultsTab from './components/ResultsTab';
import ChatTab from './components/ChatTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('data');

  // Dataset State
  const [dataset, setDataset] = useState(null);
  const [targetCol, setTargetCol] = useState('');

  // Heuristic Thresholds
  const [heuristics, setHeuristics] = useState({
    missingThreshold: 0.60,
    cardinalityThreshold: 10,
    testSize: 0.20,
  });

  // AI Configuration
  const [aiConfig, setAiConfig] = useState({
    provider: 'gemini',
    geminiApiKey: '',
    geminiModel: 'gemini-3.6-flash',
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: 'qwen2.5:7b',
  });

  const [ollamaStatus, setOllamaStatus] = useState(null);

  // AutoML Execution State
  const [isRunningAutoML, setIsRunningAutoML] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [automlResults, setAutomlResults] = useState(null);

  // Chat State
  const [chatHistory, setChatHistory] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingText, setCurrentStreamingText] = useState('');

  // Holdout Predictions State
  const [isScoring, setIsScoring] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);

  const [isBackendOnline, setIsBackendOnline] = useState(true);

  // Check Backend Health on Mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('/api/health');
        setIsBackendOnline(res.ok);
      } catch {
        setIsBackendOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load Sample Dataset Handler
  const handleLoadSample = async () => {
    try {
      const res = await fetch('/api/dataset/sample', { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server returned status ${res.status}`);
      }
      const data = await res.json();
      setDataset(data);
      if (data.columns && data.columns.length > 0) {
        setTargetCol(data.columns[data.columns.length - 1]);
      }
      setAutomlResults(null);
      setPredictionResult(null);
      setIsBackendOnline(true);
    } catch (err) {
      setIsBackendOnline(false);
      alert(`Backend Connection Note:\n${err.message}.\n\nPlease ensure the FastAPI server is running in a terminal with:\npython server.py`);
    }
  };

  // Upload Dataset Handler
  const handleUploadFile = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/dataset/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server returned status ${res.status}`);
      }
      const data = await res.json();
      setDataset(data);
      if (data.columns && data.columns.length > 0) {
        setTargetCol(data.columns[data.columns.length - 1]);
      }
      setAutomlResults(null);
      setPredictionResult(null);
      setIsBackendOnline(true);
    } catch (err) {
      setIsBackendOnline(false);
      alert(`Upload Failed:\n${err.message}.\n\nPlease ensure the FastAPI backend is running with:\npython server.py`);
    }
  };

  // Check Ollama Server
  const handleCheckOllama = async () => {
    try {
      const res = await fetch('/api/ollama/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: aiConfig.ollamaBaseUrl,
          model: aiConfig.ollamaModel,
        }),
      });
      const data = await res.json();
      setOllamaStatus(data);
    } catch (err) {
      setOllamaStatus({ connected: false, has_target_model: false });
    }
  };

  // Run AutoML Pipeline
  const handleRunAutoML = async () => {
    if (!dataset || !targetCol) return;
    setIsRunningAutoML(true);
    setLoadingStep('Ingesting & Cleaning Data...');

    try {
      setTimeout(() => setLoadingStep('Preprocessing & Encoding Features...'), 1000);
      setTimeout(() => setLoadingStep('Benchmarking Candidate Estimators...'), 2000);
      setTimeout(() => setLoadingStep('Indexing Chronicle into ChromaDB...'), 3500);

      const res = await fetch('/api/automl/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_col: targetCol,
          missing_threshold: heuristics.missingThreshold,
          cardinality_threshold: heuristics.cardinalityThreshold,
          test_size: heuristics.testSize,
          provider: aiConfig.provider,
          gemini_api_key: aiConfig.geminiApiKey,
          gemini_model: aiConfig.geminiModel,
          ollama_base_url: aiConfig.ollamaBaseUrl,
          ollama_model: aiConfig.ollamaModel,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'AutoML execution failed');
      }

      const resultsData = await res.json();
      setAutomlResults(resultsData);
      setChatHistory([]);
      setActiveTab('results');
    } catch (err) {
      alert(`Pipeline Failed: ${err.message}`);
    } finally {
      setIsRunningAutoML(false);
      setLoadingStep('');
    }
  };

  // Run Holdout Predictions
  const handleRunPredictions = async (file) => {
    setIsScoring(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/automl/predict', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Scoring failed');
      }
      const data = await res.json();
      setPredictionResult(data);
    } catch (err) {
      alert(`Prediction Error: ${err.message}`);
    } finally {
      setIsScoring(false);
    }
  };

  // Send Chat Message with SSE Streaming
  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || isStreaming) return;

    // Add user message to history
    setChatHistory((prev) => [...prev, { role: 'user', content: messageText }]);
    setIsStreaming(true);
    setCurrentStreamingText('');

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          provider: aiConfig.provider,
          gemini_api_key: aiConfig.geminiApiKey,
          gemini_model: aiConfig.geminiModel,
          ollama_base_url: aiConfig.ollamaBaseUrl,
          ollama_model: aiConfig.ollamaModel,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server error (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let sources = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              if (eventData.type === 'token') {
                accumulatedText += eventData.content;
                setCurrentStreamingText(accumulatedText);
              } else if (eventData.type === 'done') {
                sources = eventData.sources || [];
              } else if (eventData.type === 'error') {
                accumulatedText += `\n\n⚠️ ${eventData.content}`;
                setCurrentStreamingText(accumulatedText);
              }
            } catch (pErr) {
              // Ignore partial JSON parse errors
            }
          }
        }
      }

      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: accumulatedText, sources },
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Failed to get explanation: ${err.message}. Please verify your API key or provider settings in the header.`,
          sources: [],
        },
      ]);
    } finally {
      setIsStreaming(false);
      setCurrentStreamingText('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-100 flex flex-col selection:bg-brand-500/30 selection:text-brand-100">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        aiConfig={aiConfig}
        setAiConfig={setAiConfig}
        onCheckOllama={handleCheckOllama}
        ollamaStatus={ollamaStatus}
      />

      {/* Backend Disconnected Alert Banner */}
      {!isBackendOnline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-center text-xs text-amber-300 flex items-center justify-center gap-2">
          <span>⚠️</span>
          <span>
            FastAPI Backend is currently offline. Please run <strong><code className="bg-black/30 px-1.5 py-0.5 rounded font-mono text-amber-200">python server.py</code></strong> in a terminal to enable AutoML and dataset uploads.
          </span>
        </div>
      )}

      <main className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        {activeTab === 'data' && (
          <DataSetupTab
            dataset={dataset}
            onLoadSample={handleLoadSample}
            onUploadFile={handleUploadFile}
            heuristics={heuristics}
            setHeuristics={setHeuristics}
            targetCol={targetCol}
            setTargetCol={setTargetCol}
            onRunAutoML={handleRunAutoML}
            isRunningAutoML={isRunningAutoML}
            loadingStep={loadingStep}
          />
        )}

        {activeTab === 'results' && (
          <ResultsTab
            results={automlResults}
            onRunPredictions={handleRunPredictions}
            isScoring={isScoring}
            predictionResult={predictionResult}
            onGoToChat={() => setActiveTab('chat')}
          />
        )}

        {activeTab === 'chat' && (
          <ChatTab
            chatHistory={chatHistory}
            onSendMessage={handleSendMessage}
            isStreaming={isStreaming}
            currentStreamingText={currentStreamingText}
            aiConfig={aiConfig}
            hasRunAutoML={!!automlResults}
          />
        )}
      </main>
    </div>
  );
}
