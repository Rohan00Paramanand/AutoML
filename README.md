# Transparent AutoML Studio & RAG Assistant ⚡🤖

A next-generation, glass-box Automated Machine Learning (AutoML) platform with a modern, sleek **React + Vite** frontend, **FastAPI** backend, and **Streamlit** client support. Powered by **Scikit-Learn**, **LangChain**, **ChromaDB**, and **Google Gemini API** / **Local Ollama**.

---

## 🌟 Key Highlights

- 🎨 **Modern Minimalist UI**: Built with React 18, TailwindCSS, Motion.dev (Framer Motion) micro-animations, React Bits / KokonutUI glassmorphism design, and Blockit-style data visualizations with Recharts.
- 📱 **100% Mobile Responsive**: Fluid layouts, responsive metric grids, touch-friendly targets, and mobile navigation.
- 🔍 **100% Glass-Box Observability**: Explicitly logs every heuristic decision (data cleaning, identifier pruning, missing value imputation, categorical encoding, multi-estimator benchmarks, and feature importance rankings).
- 💬 **Explainable AI Assistant**: Indexes the complete execution chronicle into ChromaDB for instant, citation-grounded RAG explanations with real-time token streaming.
- ⚡ **Multi-Provider AI**: Instant ~1s responses with Google Gemini (`gemini-3.6-flash`, `gemini-3.7-flash`) or 100% local/offline execution with Ollama (`qwen2.5:7b`, `llama3.2:3b`).

---

## 🚀 Running the Application

### 1. Install Backend Dependencies
```bash
pip install -r requirements.txt
```

### 2. Launch the FastAPI Backend
```bash
python server.py
```
*API runs at `http://localhost:8000` (interactive documentation at `http://localhost:8000/docs`).*

### 3. Launch the React Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173` with instant hot-reloading and proxying to the backend.*

---

## 📁 Repository Architecture

```
├── server.py               # FastAPI backend with REST & SSE endpoints
├── automl_engine.py         # Transparent AutoML engine with 8-step chronological audit trail
├── rag_chat.py              # Multi-provider RAG engine (Gemini & Ollama with streaming)
├── app.py                   # Streamlit interface
├── test_server_api.py       # Integration tests for FastAPI endpoints
├── test_pipeline.py         # Unit tests for AutoML engine and RAG pipeline
├── requirements.txt         # Python dependencies
└── frontend/                # React 18 + Vite + Tailwind + Motion.dev frontend
    ├── src/
    │   ├── components/
    │   │   ├── Header.jsx         # Sleek nav bar with AI provider switcher & tabs
    │   │   ├── MetricCard.jsx     # Spotlight glassmorphism metric cards
    │   │   ├── DataSetupTab.jsx   # Ingestion, profiling, schema viewer & heuristics
    │   │   ├── ResultsTab.jsx     # Recharts leaderboards, feature rankings & log
    │   │   └── ChatTab.jsx        # KokonutUI-inspired RAG assistant with streaming
    │   ├── App.jsx                # Main application state & API coordinator
    │   └── index.css              # Custom design system & animations
    ├── vite.config.js
    └── tailwind.config.js
```
