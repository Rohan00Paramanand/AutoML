import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  MessageSquare,
  Sparkles,
  Send,
  User,
  Bot,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function ChatTab({
  chatHistory,
  onSendMessage,
  isStreaming,
  currentStreamingText,
  hasRunAutoML,
}) {
  const [inputMessage, setInputMessage] = useState('');
  const [expandedSources, setExpandedSources] = useState({});
  const messagesEndRef = useRef(null);

  const samplePrompts = [
    'Give me a detailed breakdown of each step in this pipeline.',
    'Why did you drop any columns?',
    'How were missing values imputed and encoded?',
    'What were the most important features driving predictions?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, currentStreamingText]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isStreaming) return;
    onSendMessage(inputMessage.trim());
    setInputMessage('');
  };

  const handlePromptClick = (prompt) => {
    if (isStreaming) return;
    onSendMessage(prompt);
  };

  const toggleSource = (msgIndex) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgIndex]: !prev[msgIndex],
    }));
  };

  if (!hasRunAutoML) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-[#101728]/40 p-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] text-slate-500 mb-4">
          <MessageSquare className="h-8 w-8" />
        </div>
        <h3 className="font-sans text-lg font-bold text-white">
          AI Assistant Ready
        </h3>
        <p className="mt-1 max-w-md text-sm text-slate-400 leading-relaxed">
          Run the AutoML pipeline in <strong>1. Data & Setup</strong> first to analyze the pipeline execution log for grounded, explainable AI chat.
        </p>
      </div>
    );
  }

  // Markdown Custom Renderers
  const markdownComponents = {
    h1: ({ children }) => (
      <h1 className="font-sans text-lg font-bold text-white mt-4 mb-2 first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="font-sans text-base font-bold text-white mt-3.5 mb-2 first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-sans text-sm font-bold text-brand-300 mt-3 mb-1.5 first:mt-0">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-sm text-slate-200 leading-relaxed mb-2.5 last:mb-0">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="my-2 space-y-1.5 pl-4 text-sm text-slate-200 list-disc list-outside marker:text-cyan-400">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-2 space-y-1.5 pl-4 text-sm text-slate-200 list-decimal list-outside marker:text-brand-400">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">
        {children}
      </li>
    ),
    strong: ({ children }) => (
      <strong className="font-bold text-white">
        {children}
      </strong>
    ),
    code: ({ inline, children }) => (
      inline ? (
        <code className="rounded border border-white/[0.1] bg-[#090e1c] px-1.5 py-0.5 font-mono text-[0.82rem] text-cyan-300">
          {children}
        </code>
      ) : (
        <pre className="my-2 overflow-x-auto rounded-lg border border-white/[0.08] bg-[#060913] p-3 font-mono text-xs text-slate-300">
          <code>{children}</code>
        </pre>
      )
    ),
    hr: () => <hr className="my-3.5 border-white/[0.08]" />,
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto rounded-lg border border-white/[0.08]">
        <table className="w-full text-left text-xs text-slate-200 divide-y divide-white/[0.08]">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="bg-[#111827] px-3 py-2 text-[0.75rem] font-bold uppercase tracking-wider text-slate-300">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-1.5 font-mono text-xs">
        {children}
      </td>
    ),
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[580px] rounded-2xl border border-white/[0.08] bg-[#0c1222] shadow-2xl backdrop-blur-2xl overflow-hidden">
      {/* Top Chat Bar */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#111827]/80 px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 shadow-glow-brand">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-sans text-sm font-bold text-white">
              AI Explainability Assistant
            </h3>
            <p className="text-xs text-slate-400">
              Grounded exclusively in this run's data decisions & metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span>Online & Grounded</span>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="border-b border-white/[0.06] bg-[#0e1628]/60 px-6 py-2.5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[0.72rem] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            Suggested:
          </span>
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handlePromptClick(prompt)}
              disabled={isStreaming}
              className="shrink-0 rounded-lg border border-white/[0.08] bg-[#141f36] px-3.5 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-brand-500/40 hover:bg-[#1a2947] hover:text-white disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {chatHistory.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-3.5 shadow-glow-brand">
              <Bot className="h-7 w-7" />
            </div>
            <h4 className="font-sans text-base font-bold text-white">
              Ask anything about this AutoML run
            </h4>
            <p className="mt-1.5 max-w-md text-sm text-slate-400 leading-relaxed">
              Ask why specific columns were pruned, how features were imputed, or why the champion model outperformed others.
            </p>
          </div>
        )}

        {chatHistory.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 shadow-glow-brand text-white mt-1">
                <Bot className="h-5 w-5" />
              </div>
            )}

            <div
              className={`max-w-3xl rounded-2xl p-5 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-br-none shadow-glow-brand text-sm leading-relaxed'
                  : 'border border-white/[0.08] bg-[#111827]/95 text-slate-200 rounded-bl-none shadow-xl backdrop-blur-md'
              }`}
            >
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap font-sans text-sm">{msg.content}</div>
              ) : (
                <ReactMarkdown components={markdownComponents}>
                  {msg.content}
                </ReactMarkdown>
              )}

              {/* Source Grounding Context */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 border-t border-white/[0.08] pt-3">
                  <button
                    onClick={() => toggleSource(idx)}
                    className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:underline"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>
                      {expandedSources[idx] ? 'Hide' : 'View'} Grounding Evidence ({msg.sources.length} chunks)
                    </span>
                    {expandedSources[idx] ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedSources[idx] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2.5 space-y-2"
                      >
                        {msg.sources.map((chunk, cIdx) => (
                          <div
                            key={cIdx}
                            className="rounded-lg border border-white/[0.06] bg-[#080d1a] p-3 font-mono text-xs text-slate-300 leading-relaxed"
                          >
                            <div className="font-bold text-cyan-300 mb-1">
                              Evidence Chunk {cIdx + 1}:
                            </div>
                            <div className="whitespace-pre-wrap text-[0.78rem] text-slate-400">{chunk}</div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1e293b] text-slate-300 border border-white/[0.1] mt-1">
                <User className="h-5 w-5" />
              </div>
            )}
          </motion.div>
        ))}

        {/* Real-time Streaming Response Message */}
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3.5 justify-start"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 shadow-glow-brand text-white mt-1">
              <Bot className="h-5 w-5 animate-pulse" />
            </div>
            <div className="max-w-3xl rounded-2xl rounded-bl-none border border-brand-500/30 bg-[#111827]/95 p-5 text-slate-200 shadow-glow-brand">
              <ReactMarkdown components={markdownComponents}>
                {currentStreamingText || 'Analyzing execution decisions...'}
              </ReactMarkdown>
              <span className="inline-block h-3.5 w-2 bg-brand-400 animate-pulse ml-1 align-middle" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Field */}
      <div className="border-t border-white/[0.08] bg-[#111827]/80 p-4">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isStreaming}
            placeholder="Ask why a model won, why columns were dropped, or how features were encoded..."
            className="w-full rounded-xl border border-white/[0.1] bg-[#0c1222] py-3.5 pl-4 pr-12 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isStreaming}
            className="absolute right-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-glow-brand transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
