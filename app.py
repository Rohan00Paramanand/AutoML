"""
app.py
------
Streamlit Web Application for Transparent AutoML & RAG-Assisted Data Tool.

Features:
- Tab 1: Data Ingestion, Profiling, & AutoML Execution
- Tab 2: AutoML Results, Metrics Leaderboard, Feature Importance, & Prediction Export
- Tab 3: AI Assistant (Multi-Provider: Google Gemini API & Local Ollama RAG with Streaming)
"""

import streamlit as st
import pandas as pd
import numpy as np
import io
import os
from dotenv import load_dotenv

# Automatically load environment variables from .env file
load_dotenv()

from automl_engine import TransparentAutoML
from rag_chat import AutoMLRAGAssistant, check_ollama_status


# ==============================================================================
# 1. Page Configuration & Custom CSS
# ==============================================================================
st.set_page_config(
    page_title="Transparent AutoML & RAG Assistant",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded",
)

CUSTOM_CSS = """
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    .metric-card {
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8));
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 18px 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(8px);
        margin-bottom: 12px;
    }
    .metric-title {
        color: #94a3b8;
        font-size: 0.82rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .metric-value {
        color: #f8fafc;
        font-size: 1.6rem;
        font-weight: 700;
        margin-top: 4px;
    }
    .metric-sub {
        color: #38bdf8;
        font-size: 0.78rem;
        margin-top: 2px;
    }

    .hero-banner {
        background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #172554 100%);
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 24px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }
    .hero-title {
        font-size: 1.8rem;
        font-weight: 700;
        background: linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
    }
    .hero-subtitle {
        color: #94a3b8;
        font-size: 0.95rem;
        margin-top: 6px;
        line-height: 1.5;
    }

    .log-box {
        background-color: #0b0f19;
        border: 1px solid #1e293b;
        border-radius: 10px;
        padding: 16px;
        font-family: 'Consolas', 'Courier New', monospace;
        font-size: 0.85rem;
        color: #e2e8f0;
        line-height: 1.5;
        white-space: pre-wrap;
        max-height: 500px;
        overflow-y: auto;
    }

    .quick-chip-header {
        font-size: 0.85rem;
        font-weight: 600;
        color: #cbd5e1;
        margin-bottom: 8px;
    }
</style>
"""
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)


# ==============================================================================
# 2. Session State Initialization
# ==============================================================================
if "df" not in st.session_state:
    st.session_state["df"] = None
if "automl_engine" not in st.session_state:
    st.session_state["automl_engine"] = None
if "rag_assistant" not in st.session_state:
    st.session_state["rag_assistant"] = None
if "chat_history" not in st.session_state:
    st.session_state["chat_history"] = []
if "ollama_status" not in st.session_state:
    st.session_state["ollama_status"] = None


# ==============================================================================
# 3. Helper Functions
# ==============================================================================
def create_sample_dataset() -> pd.DataFrame:
    """
    Generate a rich synthetic dataset mimicking real-world data with missing values,
    categorical features of varied cardinality, unique IDs, and a classification target.
    """
    np.random.seed(42)
    n_samples = 300

    passenger_ids = [f"ID_{i:04d}" for i in range(1, n_samples + 1)]  # 100% Unique ID (Pruned)
    age = np.random.normal(32, 14, size=n_samples).round(1)
    age[age < 1] = 1.0
    mask_age_missing = np.random.rand(n_samples) < 0.15
    age[mask_age_missing] = np.nan

    fare = np.random.exponential(scale=35, size=n_samples).round(2) + 7.5
    family_size = np.random.choice([1, 2, 3, 4, 5, 6], size=n_samples, p=[0.55, 0.2, 0.12, 0.08, 0.03, 0.02])
    
    embarked = np.random.choice(["Southampton", "Cherbourg", "Queenstown", np.nan], size=n_samples, p=[0.70, 0.18, 0.08, 0.04])
    pclass = np.random.choice([1, 2, 3], size=n_samples, p=[0.25, 0.25, 0.50])
    gender = np.random.choice(["male", "female"], size=n_samples, p=[0.60, 0.40])
    
    # High missingness column (> 60% missing - Pruned)
    cabin_deck = np.random.choice(["Deck_A", "Deck_B", "Deck_C", np.nan], size=n_samples, p=[0.05, 0.10, 0.08, 0.77])
    
    # Constant column (Zero variance - Pruned)
    safety_gear = ["Standard_Vest"] * n_samples

    # Target variable (Survived: 0 or 1) with realistic non-deterministic noise
    prob_survive = (
        0.20
        + 0.35 * (gender == "female")
        + 0.20 * (pclass == 1)
        + 0.10 * (fare > 40)
        - 0.10 * (family_size > 4)
    )
    prob_survive = np.clip(prob_survive, 0.10, 0.90)
    survived = (np.random.rand(n_samples) < prob_survive).astype(int)

    return pd.DataFrame({
        "Passenger_ID": passenger_ids,
        "Gender": gender,
        "Age": age,
        "Fare": fare,
        "Pclass": pclass,
        "Family_Size": family_size,
        "Embarked_Port": embarked,
        "Cabin_Deck": cabin_deck,
        "Safety_Gear": safety_gear,
        "Survived": survived,
    })


# ==============================================================================
# 4. Sidebar Controls & AI Provider Selection
# ==============================================================================
with st.sidebar:
    st.image("https://img.icons8.com/isometric/100/artificial-intelligence.png", width=60)
    st.title("AutoML Controls")
    st.caption("Transparent Heuristics & Explainable RAG")

    st.markdown("---")
    st.subheader("🤖 AI Backend Provider")

    provider_choice = st.radio(
        "Choose AI Engine:",
        options=["⚡ Google Gemini (Fast & Deployable)", "🦙 Local Ollama (Offline)"],
        index=0,
        help="Google Gemini responds in ~1-2 seconds and is ready for cloud deployment. Ollama runs 100% locally on your machine.",
    )

    is_gemini = "Gemini" in provider_choice
    selected_provider = "gemini" if is_gemini else "ollama"

    if is_gemini:
        # Default to environment variable (.env) or streamlit secrets if present
        env_key = os.getenv("GOOGLE_API_KEY", "")
        try:
            if not env_key and hasattr(st, "secrets") and "GOOGLE_API_KEY" in st.secrets:
                env_key = st.secrets["GOOGLE_API_KEY"]
        except Exception:
            pass

        gemini_api_key = st.text_input(
            "Gemini API Key",
            value=env_key,
            type="password",
            placeholder="Paste your Gemini API key...",
            help="Loaded automatically from .env or entered here.",
        )
        gemini_model = st.selectbox(
            "Gemini Model",
            options=["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.5-flash", "gemini-3-flash-preview"],
            index=0,
            help="gemini-3.6-flash provides blazing fast (1-2s) responses with exceptional reasoning quality.",
        )
        st.markdown("[🔑 Get Free Gemini API Key](https://aistudio.google.com/app/apikey)")
        ollama_url = "http://localhost:11434"
        ollama_model = "qwen2.5:7b"
    else:
        gemini_api_key = ""
        gemini_model = "gemini-3.6-flash"
        ollama_url = st.text_input("Ollama Base URL", value="http://localhost:11434")
        ollama_model = st.text_input(
            "Ollama Model Name",
            value="qwen2.5:7b",
            help="For faster local CPU execution, consider smaller models like 'llama3.2:3b' or 'qwen2.5:1.5b'.",
        )

        if st.button("🔄 Test Ollama Connection", use_container_width=True):
            with st.spinner("Checking Ollama server..."):
                status = check_ollama_status(ollama_url, ollama_model)
                st.session_state["ollama_status"] = status

        if st.session_state["ollama_status"]:
            stat = st.session_state["ollama_status"]
            if stat["connected"] and stat["has_target_model"]:
                st.success(f" Connected to Ollama (`{ollama_model}` ready)")
            elif stat["connected"]:
                st.warning(f"⚠️ Connected, but model `{ollama_model}` was not found.\nRun: `ollama pull {ollama_model}`")
            else:
                st.error(f"❌ Cannot reach Ollama at {ollama_url}.\nEnsure Ollama is running.")

    st.markdown("---")
    st.subheader("⚙️ Pipeline Heuristics")

    missing_thresh = st.slider(
        "Missing Value Drop Threshold (%)",
        min_value=20,
        max_value=90,
        value=60,
        step=5,
        help="Columns with missing percentage exceeding this threshold will be pruned.",
    ) / 100.0

    cardinality_thresh = st.number_input(
        "Max One-Hot Cardinality",
        min_value=2,
        max_value=30,
        value=10,
        help="Categorical columns with distinct unique values <= this threshold will use One-Hot Encoding, else Ordinal Encoding.",
    )

    test_size_val = st.slider(
        "Holdout Test Split (%)",
        min_value=10,
        max_value=40,
        value=20,
        step=5,
    ) / 100.0

    st.markdown("---")
    st.caption("Built with Streamlit • Scikit-Learn • LangChain • ChromaDB • Gemini & Ollama")


# ==============================================================================
# 5. Main Hero Banner
# ==============================================================================
st.markdown(
    """
    <div class="hero-banner">
        <h1 class="hero-title">Transparent AutoML & RAG-Assisted Data Tool</h1>
        <p class="hero-subtitle">
            Automate machine learning pipeline creation with full glass-box observability. Every heuristic,
            column pruning, missing-value imputation, and model benchmark is explicitly logged and indexed into a local RAG vector store for instant, explainable AI chat.
        </p>
    </div>
    """,
    unsafe_allow_html=True,
)


# ==============================================================================
# 6. Tab Navigation
# ==============================================================================
tab_setup, tab_results, tab_chat = st.tabs([
    "📊 1. Data & Setup",
    "🏆 2. AutoML Results",
    "💬 3. AI Assistant (RAG Chat)",
])


# ==============================================================================
# TAB 1: DATA & SETUP
# ==============================================================================
with tab_setup:
    st.subheader("1. Ingest Dataset")

    col_upload, col_sample = st.columns([3, 1])

    with col_upload:
        uploaded_file = st.file_uploader("Upload a CSV file for Machine Learning", type=["csv"])
        if uploaded_file is not None:
            try:
                st.session_state["df"] = pd.read_csv(uploaded_file)
                st.success(f"Successfully loaded '{uploaded_file.name}' with {len(st.session_state['df']):,} rows.")
            except Exception as e:
                st.error(f"Error reading CSV: {e}")

    with col_sample:
        st.markdown("<div style='height: 28px;'></div>", unsafe_allow_html=True)
        if st.button("✨ Load Sample Dataset", use_container_width=True, help="Load synthetic Titanic-style dataset with missing values and categories."):
            st.session_state["df"] = create_sample_dataset()
            st.toast("Loaded synthetic sample dataset!", icon="🚀")

    if st.session_state["df"] is not None:
        df = st.session_state["df"]

        st.markdown("---")
        st.subheader("2. Dataset Profiling")

        m1, m2, m3, m4, m5 = st.columns(5)
        with m1:
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="metric-title">Total Rows</div>
                    <div class="metric-value">{len(df):,}</div>
                    <div class="metric-sub">Samples</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        with m2:
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="metric-title">Total Columns</div>
                    <div class="metric-value">{df.shape[1]}</div>
                    <div class="metric-sub">Features + Target</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        with m3:
            null_count = df.isnull().sum().sum()
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="metric-title">Missing Cells</div>
                    <div class="metric-value">{null_count:,}</div>
                    <div class="metric-sub">{((null_count / (df.size or 1)) * 100):.1f}% of data</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        with m4:
            dup_count = df.duplicated().sum()
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="metric-title">Duplicate Rows</div>
                    <div class="metric-value">{dup_count:,}</div>
                    <div class="metric-sub">Exact matches</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        with m5:
            mem_kb = df.memory_usage(deep=True).sum() / 1024
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="metric-title">Memory</div>
                    <div class="metric-value">{mem_kb:.1f} KB</div>
                    <div class="metric-sub">In-memory footprint</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

        with st.expander("🔍 View Raw Data Preview & Column Schemas", expanded=True):
            tab_preview, tab_schema = st.tabs(["Data Table", "Column Statistics"])
            with tab_preview:
                st.dataframe(df.head(15), use_container_width=True)
            with tab_schema:
                schema_df = pd.DataFrame({
                    "Column": df.columns,
                    "Data Type": [str(t) for t in df.dtypes],
                    "Missing Count": df.isnull().sum().values,
                    "Missing %": (df.isnull().mean() * 100).round(2).values,
                    "Unique Values": df.nunique().values,
                })
                st.dataframe(schema_df, use_container_width=True)

        st.markdown("---")
        st.subheader("3. Select Target Variable & Execute AutoML")

        col_target, col_btn = st.columns([2, 1])
        with col_target:
            target_col = st.selectbox(
                "Choose the Target Column to Predict:",
                options=list(df.columns),
                index=len(df.columns) - 1,
            )

        with col_btn:
            st.markdown("<div style='height: 28px;'></div>", unsafe_allow_html=True)
            run_automl = st.button("🚀 Run Transparent AutoML", type="primary", use_container_width=True)

        if run_automl:
            with st.spinner("Executing Transparent AutoML Pipeline (Data Cleaning, Encoding, Multi-Model Benchmarking)..."):
                try:
                    engine = TransparentAutoML(
                        missing_threshold=missing_thresh,
                        cardinality_threshold=int(cardinality_thresh),
                        test_size=test_size_val,
                        random_state=42,
                    )
                    engine.fit(df, target_col=target_col)

                    st.session_state["automl_engine"] = engine
                    st.session_state["execution_log"] = engine.get_execution_log()
                    st.session_state["chat_history"] = []

                    # Auto-initialize RAG Assistant
                    with st.spinner(f"Indexing Execution Log into ChromaDB for AI Assistant ({selected_provider.upper()})..."):
                        try:
                            rag = AutoMLRAGAssistant(
                                execution_log=st.session_state["execution_log"],
                                provider=selected_provider,
                                gemini_api_key=gemini_api_key,
                                gemini_model=gemini_model,
                                ollama_base_url=ollama_url,
                                ollama_model=ollama_model,
                            )
                            st.session_state["rag_assistant"] = rag
                        except Exception as rag_err:
                            st.warning(f"AutoML completed, but AI Assistant setup note: {rag_err}")

                    st.success(f"🎉 AutoML Pipeline completed! Winning Model: **{engine.best_model_name}**")
                    st.info("👉 Switch to **Tab 2 (AutoML Results)** or **Tab 3 (AI Assistant)** to explore the run.")
                except Exception as e:
                    st.error(f"AutoML Pipeline Execution Failed: {str(e)}")
    else:
        st.info("👆 Please upload a CSV file or click **'Load Sample Dataset'** above to begin.")


# ==============================================================================
# TAB 2: AUTOML RESULTS
# ==============================================================================
with tab_results:
    if st.session_state["automl_engine"] is None:
        st.info("No AutoML run found. Please configure and run AutoML in **Tab 1: Data & Setup**.")
    else:
        engine: TransparentAutoML = st.session_state["automl_engine"]
        metrics = engine.get_metrics()
        leaderboard = engine.get_leaderboard()
        feature_imp = engine.get_feature_importances()

        st.subheader("🏆 Winning Model Overview")
        r1, r2, r3, r4 = st.columns(4)
        with r1:
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="metric-title">Best Model</div>
                    <div class="metric-value" style="font-size: 1.3rem; color: #38bdf8;">{engine.best_model_name}</div>
                    <div class="metric-sub">Top performer</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        with r2:
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="metric-title">Task Formulation</div>
                    <div class="metric-value">{engine.task_type.capitalize()}</div>
                    <div class="metric-sub">Target: {engine.target_col}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        with r3:
            primary_score = metrics.get("Accuracy", metrics.get("R2_Score", 0.0))
            metric_label = "Holdout Accuracy" if engine.task_type == "classification" else "Holdout R² Score"
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="metric-title">{metric_label}</div>
                    <div class="metric-value">{primary_score:.4f}</div>
                    <div class="metric-sub">Test set evaluation</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        with r4:
            secondary_score = metrics.get("F1_Score", metrics.get("RMSE", 0.0))
            sec_label = "F1-Score (Macro)" if engine.task_type == "classification" else "RMSE"
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="metric-title">{sec_label}</div>
                    <div class="metric-value">{secondary_score:.4f}</div>
                    <div class="metric-sub">Validation metric</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

        st.markdown("---")

        col_lead, col_imp = st.columns([1, 1])

        with col_lead:
            st.subheader("📊 Candidate Model Benchmarks")
            st.dataframe(leaderboard, use_container_width=True)
            if not leaderboard.empty:
                chart_metric = "Accuracy" if engine.task_type == "classification" else "R2_Score"
                st.bar_chart(data=leaderboard.set_index("Model")[[chart_metric]])

        with col_imp:
            st.subheader("⭐ Feature Importance Ranking")
            if not feature_imp.empty:
                st.dataframe(feature_imp.head(10), use_container_width=True)
                chart_data = feature_imp.head(10).set_index("Feature")["Importance_Percentage"]
                st.bar_chart(chart_data)
            else:
                st.info("Feature importance is not directly available for this estimator.")

        st.markdown("---")

        st.subheader("📜 Transparent Pipeline Execution Chronicle")
        st.caption("This exhaustive audit trail captures all decisions, heuristics, and benchmarks, and forms the knowledge base for the AI Assistant.")

        log_text = engine.get_execution_log()
        st.markdown(f'<div class="log-box">{log_text}</div>', unsafe_allow_html=True)

        st.download_button(
            label="📥 Download Pipeline Execution Log (.txt)",
            data=log_text,
            file_name="pipeline_execution_log.txt",
            mime="text/plain",
            use_container_width=True,
        )

        st.markdown("---")

        st.subheader("🔮 Run Predictions on New CSV")
        pred_upload = st.file_uploader("Upload Holdout or New CSV for Prediction", type=["csv"], key="pred_uploader")
        if pred_upload is not None:
            try:
                new_df = pd.read_csv(pred_upload)
                preds = engine.predict(new_df)
                scored_df = new_df.copy()
                scored_df[f"Predicted_{engine.target_col}"] = preds

                st.success(f"Generated predictions for {len(scored_df):,} rows.")
                st.dataframe(scored_df.head(10), use_container_width=True)

                csv_buffer = io.StringIO()
                scored_df.to_csv(csv_buffer, index=False)
                st.download_button(
                    label="📥 Download Scored Predictions CSV",
                    data=csv_buffer.getvalue(),
                    file_name="predictions_output.csv",
                    mime="text/csv",
                )
            except Exception as pe:
                st.error(f"Prediction error: {pe}")


# ==============================================================================
# TAB 3: AI ASSISTANT (RAG CHAT)
# ==============================================================================
with tab_chat:
    st.subheader("💬 AI AutoML Explainability Assistant")
    active_provider_name = f"Google Gemini ({gemini_model})" if is_gemini else f"Ollama ({ollama_model})"
    st.caption(f"Powered by **{active_provider_name}** with real-time streaming citations.")

    if st.session_state["automl_engine"] is None or not st.session_state.get("execution_log"):
        st.info("⚠️ Please run AutoML in **Tab 1: Data & Setup** first to generate the pipeline execution log.")
    else:
        # Check provider configuration
        provider_ready = True
        if is_gemini and not gemini_api_key:
            st.warning("⚠️ **Google Gemini API Key is required.** Please enter your free API key in the sidebar.")
            provider_ready = False
        elif not is_gemini:
            ollama_stat = check_ollama_status(ollama_url, ollama_model)
            if not ollama_stat["connected"]:
                st.error(f"❌ Cannot connect to Ollama at `{ollama_url}`. Please run `ollama serve` or switch to Google Gemini.")
                provider_ready = False

        # Auto-initialize RAG assistant if not already loaded or if provider changed
        if provider_ready:
            needs_init = (
                st.session_state["rag_assistant"] is None
                or getattr(st.session_state["rag_assistant"], "provider", "") != selected_provider
            )
            if needs_init:
                try:
                    with st.spinner(f"Connecting to {active_provider_name}..."):
                        st.session_state["rag_assistant"] = AutoMLRAGAssistant(
                            execution_log=st.session_state["execution_log"],
                            provider=selected_provider,
                            gemini_api_key=gemini_api_key,
                            gemini_model=gemini_model,
                            ollama_base_url=ollama_url,
                            ollama_model=ollama_model,
                        )
                except Exception as init_err:
                    st.error(f"Could not initialize AI Assistant: {init_err}")

        # Quick Suggested Questions
        st.markdown('<div class="quick-chip-header">💡 Suggested Questions:</div>', unsafe_allow_html=True)
        q_cols = st.columns(4)
        sample_questions = [
            "Give me a detailed breakdown of each and every step in this pipeline.",
            "Why did you drop any columns?",
            "How were missing values imputed and encoded?",
            "What were the most important features driving predictions?",
        ]

        selected_prompt = None
        for i, col in enumerate(q_cols):
            with col:
                if st.button(sample_questions[i], key=f"quick_q_{i}", use_container_width=True):
                    selected_prompt = sample_questions[i]

        # Display Chat History
        for msg in st.session_state["chat_history"]:
            with st.chat_message(msg["role"]):
                st.markdown(msg["content"])
                if msg.get("sources"):
                    with st.expander("🔎 View Grounding Context (Log Chunks)"):
                        for s_idx, src in enumerate(msg["sources"]):
                            st.markdown(f"**Chunk {s_idx + 1}:**\n```\n{src}\n```")

        # Handle Chat Input
        user_input = st.chat_input("Ask about pipeline decisions (e.g., 'Why was Logistic Regression chosen?')...")
        prompt_to_process = selected_prompt or user_input

        if prompt_to_process:
            st.session_state["chat_history"].append({"role": "user", "content": prompt_to_process})
            with st.chat_message("user"):
                st.markdown(prompt_to_process)

            with st.chat_message("assistant"):
                if st.session_state["rag_assistant"] is not None:
                    rag: AutoMLRAGAssistant = st.session_state["rag_assistant"]
                    # Stream response tokens in real-time
                    response_text = st.write_stream(rag.ask_stream(prompt_to_process))
                    sources = [doc for doc in (rag.retriever.invoke(prompt_to_process) if rag.retriever else [])]
                    source_contents = [d.page_content for d in sources]

                    if source_contents:
                        with st.expander("🔎 View Grounding Context (Log Chunks)"):
                            for s_idx, src in enumerate(source_contents):
                                st.markdown(f"**Chunk {s_idx + 1}:**\n```\n{src}\n```")
                else:
                    response_text = "⚠️ AI Assistant is not initialized. Please verify your API key or Ollama connection in the sidebar."
                    st.markdown(response_text)
                    source_contents = []

            st.session_state["chat_history"].append({
                "role": "assistant",
                "content": response_text,
                "sources": source_contents,
            })
