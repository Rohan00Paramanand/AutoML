# Transparent AutoML & RAG-Assisted Data Tool 🔍🤖

A glass-box Automated Machine Learning (AutoML) web application built with **Streamlit**, **Scikit-Learn**, **LangChain**, **ChromaDB**, and **Google Gemini API** / **Ollama**.

Unlike black-box AutoML systems, this tool explicitly logs every heuristic decision (data cleaning, missing value imputations, categorical encodings, model benchmarks, and feature importance). It then indexes this execution chronicle into a local RAG vector store, allowing users to chat directly with an AI assistant that explains every step of the pipeline with concrete numbers and 100% factual grounding.

---

## 🚀 Quickstart Guide

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Choose Your AI Provider

#### Option A: Google Gemini (Recommended for Instant Speed & Cloud Deployment)
1. Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Set it as an environment variable or enter it in the app sidebar:
   ```bash
   set GOOGLE_API_KEY="your-api-key-here"
   ```
   *Responses stream in ~1-2 seconds with zero local CPU load!*

#### Option B: Local Ollama (100% Offline Mode)
1. Ensure Ollama is running (`ollama serve`).
2. Pull your preferred model (e.g., `ollama pull qwen2.5:7b` or lightweight `ollama pull llama3.2:3b`).

---

### 3. Launch the Streamlit App
```bash
streamlit run app.py
```

---

## 📁 Project Structure

```
├── requirements.txt         # Project dependencies (Streamlit, Scikit-Learn, LangChain, ChromaDB, Gemini, Ollama)
├── automl_engine.py         # Transparent AutoML engine with 8-step chronological audit trail
├── rag_chat.py              # Multi-provider RAG engine (Gemini & Ollama with streaming)
├── app.py                   # Streamlit 3-tab user interface with AI provider selection
└── README.md                # Project documentation
```

---

## 🌐 Deploying to Streamlit Cloud / HuggingFace Spaces

When deploying to Streamlit Community Cloud:
1. Push this repository to GitHub.
2. Connect the repository to [share.streamlit.io](https://share.streamlit.io).
3. Under **App Settings > Secrets**, add your Gemini API key:
   ```toml
   GOOGLE_API_KEY = "your-api-key-here"
   ```
4. Click **Deploy**. The app will run smoothly on free cloud hosting with no GPU or memory bottlenecks.
