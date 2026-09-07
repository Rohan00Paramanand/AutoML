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
# 1. Page Configuration & Custom Modern Minimalist CSS
# ==============================================================================
st.set_page_config(
    page_title="Transparent AutoML & AI Assistant",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded",
)

CUSTOM_CSS = """
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
    
    /* ---------------- Global Reset & Typography ---------------- */
    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        color: #f1f5f9;
        -webkit-font-smoothing: antialiased;
    }

    /* Container Spacing */
    .block-container {
        padding-top: 1.5rem !important;
        padding-bottom: 3rem !important;
        padding-left: 1.8rem !important;
        padding-right: 1.8rem !important;
        max-width: 1400px;
    }

    /* ---------------- Modern Minimalist Hero Banner ---------------- */
    .hero-container {
        position: relative;
        background: linear-gradient(135deg, rgba(19, 27, 46, 0.9) 0%, rgba(10, 14, 26, 0.95) 100%);
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-radius: 16px;
        padding: 28px 32px;
        margin-bottom: 24px;
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(12px);
        overflow: hidden;
    }
    
    .hero-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, #6366f1, #38bdf8, #a855f7, #6366f1);
        background-size: 200% auto;
    }

    .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(99, 102, 241, 0.12);
        border: 1px solid rgba(99, 102, 241, 0.3);
        color: #a5b4fc;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 4px 12px;
        border-radius: 9999px;
        margin-bottom: 12px;
    }

    .hero-title {
        font-size: 2rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        background: linear-gradient(135deg, #ffffff 30%, #cbd5e1 70%, #93c5fd 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
        line-height: 1.25;
    }

    .hero-subtitle {
        color: #94a3b8;
        font-size: 0.95rem;
        line-height: 1.6;
        margin-top: 8px;
        margin-bottom: 0;
        max-width: 900px;
    }

    /* ---------------- Sleek Minimalist Metric Cards ---------------- */
    .metric-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 14px;
        margin-bottom: 20px;
    }

    .metric-card {
        background: rgba(19, 27, 46, 0.75);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 18px 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(8px);
        transition: all 0.2s ease-in-out;
        position: relative;
        overflow: hidden;
    }

    .metric-card:hover {
        border-color: rgba(99, 102, 241, 0.4);
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.35);
    }

    .metric-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background: linear-gradient(90deg, #6366f1, #38bdf8);
        opacity: 0.6;
    }

    .metric-title {
        color: #94a3b8;
        font-size: 0.76rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }

    .metric-value {
        color: #f8fafc;
        font-size: 1.65rem;
        font-weight: 700;
        font-family: 'Plus Jakarta Sans', sans-serif;
        margin-top: 6px;
        letter-spacing: -0.01em;
    }

    .metric-sub {
        color: #38bdf8;
        font-size: 0.78rem;
        font-weight: 500;
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    /* ---------------- Status & Info Pills ---------------- */
    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    
    .status-badge-active {
        background: rgba(16, 185, 129, 0.12);
        border: 1px solid rgba(16, 185, 129, 0.3);
        color: #34d399;
    }

    .pulse-dot {
        width: 7px;
        height: 7px;
        background-color: #10b981;
        border-radius: 50%;
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
        }
        70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
        }
        100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
        }
    }

    /* ---------------- Streamlit Tabs Modernization ---------------- */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        background-color: rgba(15, 23, 42, 0.6);
        padding: 6px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        margin-bottom: 24px;
        overflow-x: auto;
        white-space: nowrap;
    }

    .stTabs [data-baseweb="tab"] {
        height: 42px;
        border-radius: 8px;
        padding: 0 18px;
        color: #94a3b8;
        font-weight: 600;
        font-size: 0.88rem;
        border: none !important;
        background: transparent;
        transition: all 0.2s ease;
    }

    .stTabs [data-baseweb="tab"]:hover {
        color: #f8fafc;
        background: rgba(255, 255, 255, 0.04);
    }

    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #6366f1, #4f46e5) !important;
        color: #ffffff !important;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
    }

    /* ---------------- Modern Glass Cards & Onboarding ---------------- */
    .glass-card {
        background: rgba(19, 27, 46, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 24px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(10px);
        margin-bottom: 20px;
    }

    .onboarding-card {
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.6));
        border: 1px dashed rgba(99, 102, 241, 0.4);
        border-radius: 16px;
        padding: 36px 24px;
        text-align: center;
        margin: 20px 0;
    }

    .onboarding-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #f1f5f9;
        margin-bottom: 8px;
    }

    .onboarding-text {
        font-size: 0.9rem;
        color: #94a3b8;
        max-width: 540px;
        margin: 0 auto 20px auto;
        line-height: 1.5;
    }

    /* ---------------- Terminal Execution Log Box ---------------- */
    .log-box {
        background-color: #060911;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 18px 20px;
        font-family: 'JetBrains Mono', 'Consolas', monospace;
        font-size: 0.82rem;
        color: #e2e8f0;
        line-height: 1.6;
        white-space: pre-wrap;
        max-height: 480px;
        overflow-y: auto;
        box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
    }

    /* Custom slim scrollbar */
    .log-box::-webkit-scrollbar, ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }
    .log-box::-webkit-scrollbar-track, ::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
    }
    .log-box::-webkit-scrollbar-thumb, ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 4px;
    }
    .log-box::-webkit-scrollbar-thumb:hover, ::-webkit-scrollbar-thumb:hover {
        background: rgba(99, 102, 241, 0.5);
    }

    /* ---------------- Chat Experience Modernization ---------------- */
    .quick-chip-header {
        font-size: 0.82rem;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 10px;
    }

    /* Streamlit Button Tweaks */
    div.stButton > button {
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.88rem;
        transition: all 0.2s ease;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    div.stButton > button:hover {
        border-color: rgba(99, 102, 241, 0.5);
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    }

    /* Primary button sleek gradient */
    div.stButton > button[kind="primary"] {
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
        border: none !important;
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4) !important;
    }

    div.stButton > button[kind="primary"]:hover {
        background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%) !important;
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6) !important;
        transform: translateY(-1px);
    }

    /* ---------------- Mobile Responsive Media Queries ---------------- */
    @media (max-width: 768px) {
        .block-container {
            padding-top: 1rem !important;
            padding-left: 0.8rem !important;
            padding-right: 0.8rem !important;
            padding-bottom: 2rem !important;
        }

        .hero-container {
            padding: 20px 16px;
            border-radius: 12px;
            margin-bottom: 16px;
        }

        .hero-title {
            font-size: 1.45rem;
        }

        .hero-subtitle {
            font-size: 0.85rem;
            line-height: 1.45;
        }

        .metric-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }

        .metric-card {
            padding: 14px 12px;
        }

        .metric-value {
            font-size: 1.35rem;
        }

        .metric-title {
            font-size: 0.7rem;
        }

        .stTabs [data-baseweb="tab"] {
            padding: 0 12px;
            font-size: 0.8rem;
            height: 38px;
        }

        .log-box {
            font-size: 0.75rem;
            padding: 12px;
            max-height: 350px;
        }

        .glass-card {
            padding: 16px;
        }
    }

    @media (max-width: 480px) {
        .metric-grid {
            grid-template-columns: 1fr;
        }
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
    st.markdown(
        """
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <div style="background: linear-gradient(135deg, #6366f1, #38bdf8); padding: 8px; border-radius: 10px; display: flex;">
                <span style="font-size: 1.3rem;">⚡</span>
            </div>
            <div>
                <div style="font-weight: 700; font-size: 1.15rem; color: #ffffff; letter-spacing: -0.01em;">AutoML Studio</div>
                <div style="font-size: 0.75rem; color: #94a3b8;">Transparent & Explainable</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.markdown("---")
    st.markdown("#### 🤖 AI Backend Engine")

    provider_choice = st.radio(
        "AI Provider:",
        options=["⚡ Google Gemini (Cloud / Fast)", "🦙 Local Ollama (Offline)"],
        index=0,
        label_visibility="collapsed",
        help="Google Gemini responds in ~1-2s and is ready for cloud deployment. Ollama runs 100% locally on your machine.",
    )

    is_gemini = "Gemini" in provider_choice
    selected_provider = "gemini" if is_gemini else "ollama"

    if is_gemini:
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
            "Model Version",
            options=["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.5-flash", "gemini-3-flash-preview"],
            index=0,
            help="gemini-3.6-flash provides blazing fast (1-2s) responses with exceptional reasoning quality.",
        )
        st.markdown("[🔑 Get Free Gemini Key](https://aistudio.google.com/app/apikey)")
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
                st.success(f" Connected (`{ollama_model}` ready)")
            elif stat["connected"]:
                st.warning(f"⚠️ Connected, but model `{ollama_model}` missing.\nRun: `ollama pull {ollama_model}`")
            else:
                st.error(f"❌ Cannot reach Ollama at {ollama_url}.")

    st.markdown("---")
    st.markdown("#### ⚙️ Pipeline Heuristics")

    missing_thresh = st.slider(
        "Missing Drop Threshold (%)",
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
    st.caption("✨ Built with Streamlit • Scikit-Learn • ChromaDB • LangChain")


# ==============================================================================
# 5. Main Hero Banner
# ==============================================================================
st.markdown(
    """
    <div class="hero-container">
        <div class="hero-badge">
            <span>✨</span> Transparent AutoML & Explainable RAG
        </div>
        <h1 class="hero-title">Automate Machine Learning with Glass-Box Clarity</h1>
        <p class="hero-subtitle">
            End-to-end data profiling, heuristic cleaning, multi-estimator benchmarking, and retrieval-augmented AI explanations with zero black-box obscurity.
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
    col_upload, col_sample = st.columns([3, 1])

    with col_upload:
        uploaded_file = st.file_uploader("Upload CSV Dataset", type=["csv"], help="Upload your structured tabular CSV file.")
        if uploaded_file is not None:
            try:
                st.session_state["df"] = pd.read_csv(uploaded_file)
                st.toast(f"Loaded '{uploaded_file.name}' ({len(st.session_state['df']):,} rows)", icon="📊")
            except Exception as e:
                st.error(f"Error reading CSV: {e}")

    with col_sample:
        st.markdown("<div style='height: 28px;'></div>", unsafe_allow_html=True)
        if st.button("✨ Load Sample Data", use_container_width=True, help="Load synthetic Titanic-style dataset with missing values, categories, and numerical features."):
            st.session_state["df"] = create_sample_dataset()
            st.toast("Loaded synthetic sample dataset!", icon="🚀")

    if st.session_state["df"] is not None:
        df = st.session_state["df"]

        st.markdown("---")
        st.markdown("### 📊 Dataset Profiling Overview")

        # Responsive Metric Grid
        null_count = int(df.isnull().sum().sum())
        null_pct = (null_count / (df.size or 1)) * 100
        dup_count = int(df.duplicated().sum())
        mem_kb = df.memory_usage(deep=True).sum() / 1024

        st.markdown(
            f"""
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-title">Total Rows</div>
                    <div class="metric-value">{len(df):,}</div>
                    <div class="metric-sub">✓ {len(df)} samples</div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Columns</div>
                    <div class="metric-value">{df.shape[1]}</div>
                    <div class="metric-sub">Features + Target</div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Missing Cells</div>
                    <div class="metric-value">{null_count:,}</div>
                    <div class="metric-sub">{null_pct:.1f}% missing</div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Duplicate Rows</div>
                    <div class="metric-value">{dup_count:,}</div>
                    <div class="metric-sub">Exact duplicates</div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Memory Footprint</div>
                    <div class="metric-value">{mem_kb:.1f} <span style="font-size: 1rem; font-weight: 500;">KB</span></div>
                    <div class="metric-sub">In-memory size</div>
                </div>
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
        st.markdown("### 🎯 Target Selection & Pipeline Execution")

        col_target, col_btn = st.columns([2, 1])
        with col_target:
            target_col = st.selectbox(
                "Choose the Target Column to Predict:",
                options=list(df.columns),
                index=len(df.columns) - 1,
                help="Select the column you want the machine learning model to predict.",
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
        st.markdown(
            """
            <div class="onboarding-card">
                <div style="font-size: 2.2rem; margin-bottom: 12px;">📁</div>
                <div class="onboarding-title">No Dataset Loaded</div>
                <div class="onboarding-text">
                    Upload a custom CSV file above or click <strong>"Load Sample Data"</strong> to experiment with a ready-to-use tabular dataset.
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )


# ==============================================================================
# TAB 2: AUTOML RESULTS
# ==============================================================================
with tab_results:
    if st.session_state["automl_engine"] is None:
        st.markdown(
            """
            <div class="onboarding-card">
                <div style="font-size: 2.2rem; margin-bottom: 12px;">⚡</div>
                <div class="onboarding-title">No AutoML Run Available</div>
                <div class="onboarding-text">
                    Configure your dataset and run the AutoML engine in <strong>Tab 1: Data & Setup</strong> to view performance leaderboards and feature importance.
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    else:
        engine: TransparentAutoML = st.session_state["automl_engine"]
        metrics = engine.get_metrics()
        leaderboard = engine.get_leaderboard()
        feature_imp = engine.get_feature_importances()

        st.markdown("### 🏆 Winning Model Overview")

        primary_score = metrics.get("Accuracy", metrics.get("R2_Score", 0.0))
        metric_label = "Holdout Accuracy" if engine.task_type == "classification" else "Holdout R² Score"
        secondary_score = metrics.get("F1_Score", metrics.get("RMSE", 0.0))
        sec_label = "F1-Score (Macro)" if engine.task_type == "classification" else "RMSE"

        st.markdown(
            f"""
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-title">Winning Estimator</div>
                    <div class="metric-value" style="font-size: 1.35rem; color: #38bdf8;">{engine.best_model_name}</div>
                    <div class="metric-sub">★ Top performer</div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Task Formulation</div>
                    <div class="metric-value">{engine.task_type.capitalize()}</div>
                    <div class="metric-sub">Target: {engine.target_col}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">{metric_label}</div>
                    <div class="metric-value">{primary_score:.4f}</div>
                    <div class="metric-sub">Test set evaluation</div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">{sec_label}</div>
                    <div class="metric-value">{secondary_score:.4f}</div>
                    <div class="metric-sub">Validation metric</div>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.markdown("---")

        col_lead, col_imp = st.columns([1, 1])

        with col_lead:
            st.markdown("#### 📊 Candidate Model Benchmarks")
            st.dataframe(leaderboard, use_container_width=True)
            if not leaderboard.empty:
                chart_metric = "Accuracy" if engine.task_type == "classification" else "R2_Score"
                st.bar_chart(data=leaderboard.set_index("Model")[[chart_metric]])

        with col_imp:
            st.markdown("#### ⭐ Feature Importance Ranking")
            if not feature_imp.empty:
                st.dataframe(feature_imp.head(10), use_container_width=True)
                chart_data = feature_imp.head(10).set_index("Feature")["Importance_Percentage"]
                st.bar_chart(chart_data)
            else:
                st.info("Feature importance is not directly available for this estimator.")

        st.markdown("---")

        st.markdown("### 📜 Transparent Pipeline Execution Chronicle")
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

        st.markdown("### 🔮 Run Predictions on New CSV")
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
                    use_container_width=True,
                )
            except Exception as pe:
                st.error(f"Prediction error: {pe}")


# ==============================================================================
# TAB 3: AI ASSISTANT (RAG CHAT)
# ==============================================================================
with tab_chat:
    active_provider_name = f"Google Gemini ({gemini_model})" if is_gemini else f"Ollama ({ollama_model})"

    st.markdown(
        f"""
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
            <div>
                <h3 style="margin: 0; font-size: 1.3rem; font-weight: 700;">💬 AI Pipeline Explainability Assistant</h3>
                <p style="margin: 4px 0 0 0; font-size: 0.88rem; color: #94a3b8;">
                    Ask questions grounded directly in the transparent execution chronicle.
                </p>
            </div>
            <div class="status-badge status-badge-active">
                <span class="pulse-dot"></span>
                <span>{active_provider_name}</span>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if st.session_state["automl_engine"] is None or not st.session_state.get("execution_log"):
        st.markdown(
            """
            <div class="onboarding-card">
                <div style="font-size: 2.2rem; margin-bottom: 12px;">💬</div>
                <div class="onboarding-title">AI Assistant Ready for Pipeline</div>
                <div class="onboarding-text">
                    Run the AutoML pipeline in <strong>Tab 1: Data & Setup</strong> to index the execution log into the ChromaDB vector database for RAG chat.
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
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
            "Give me a detailed breakdown of each step in this pipeline.",
            "Why did you drop any columns?",
            "How were missing values imputed and encoded?",
            "What were the most important features driving predictions?",
        ]

        selected_prompt = None
        for i, col in enumerate(q_cols):
            with col:
                if st.button(sample_questions[i], key=f"quick_q_{i}", use_container_width=True):
                    selected_prompt = sample_questions[i]

        st.markdown("<div style='height: 12px;'></div>", unsafe_allow_html=True)

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
