"""
server.py
---------
FastAPI Backend for Transparent AutoML & Explainable RAG AI Assistant.

Provides REST and Server-Sent Event (SSE) endpoints for dataset ingestion,
AutoML pipeline benchmarking, holdout predictions, and real-time streaming RAG chat.
"""

from typing import Dict, Any, List, Optional
import os
import io
import json
import numpy as np
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse

from automl_engine import TransparentAutoML
from rag_chat import AutoMLRAGAssistant, check_ollama_status

app = FastAPI(
    title="Transparent AutoML Backend API",
    description="REST & SSE API for Transparent AutoML and AI Explainability Assistant",
    version="1.0.0",
)

# Enable full Cross-Origin Resource Sharing (CORS) for Vite, Streamlit, and local/cloud clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8501",
        "http://127.0.0.1:8501",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Global in-memory workspace state
WORKSPACE_STATE: Dict[str, Any] = {
    "df": None,
    "automl_engine": None,
    "rag_assistant": None,
    "execution_log": "",
    "target_col": None,
}


def _create_sample_dataset() -> pd.DataFrame:
    """Generate synthetic Titanic-style dataset with missingness, unique keys, and categorical features."""
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


def _build_dataset_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """Extract schema, profiling stats, and clean preview records for JSON responses."""
    null_count = int(df.isnull().sum().sum())
    total_cells = df.size or 1
    null_pct = round((null_count / total_cells) * 100, 2)
    dup_count = int(df.duplicated().sum())
    mem_kb = round(df.memory_usage(deep=True).sum() / 1024, 1)

    schema = []
    for col in df.columns:
        col_null = int(df[col].isnull().sum())
        schema.append({
            "column": str(col),
            "dtype": str(df[col].dtype),
            "missing_count": col_null,
            "missing_pct": round((col_null / len(df)) * 100, 2),
            "unique_values": int(df[col].nunique(dropna=True)),
        })

    # Replace NaNs with None so JSON serialization works seamlessly
    preview_df = df.head(25).replace({np.nan: None})
    preview_records = preview_df.to_dict(orient="records")

    return {
        "total_rows": len(df),
        "total_columns": int(df.shape[1]),
        "columns": list(df.columns),
        "missing_cells": null_count,
        "missing_pct": null_pct,
        "duplicate_rows": dup_count,
        "memory_kb": mem_kb,
        "schema": schema,
        "preview": preview_records,
    }


@app.get("/api/health")
def get_health():
    """Health check endpoint."""
    return {"status": "ok", "service": "Transparent AutoML Engine & RAG API", "version": "1.0.0"}


@app.post("/api/dataset/sample")
def load_sample_dataset():
    """Generate and return synthetic sample dataset with profiling metrics."""
    df = _create_sample_dataset()
    WORKSPACE_STATE["df"] = df
    WORKSPACE_STATE["automl_engine"] = None
    WORKSPACE_STATE["rag_assistant"] = None
    WORKSPACE_STATE["execution_log"] = ""
    return _build_dataset_summary(df)


@app.post("/api/dataset/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Parse uploaded CSV dataset and return summary profiling."""
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        if df.empty:
            raise HTTPException(status_code=400, detail="The uploaded CSV file is empty.")
        WORKSPACE_STATE["df"] = df
        WORKSPACE_STATE["automl_engine"] = None
        WORKSPACE_STATE["rag_assistant"] = None
        WORKSPACE_STATE["execution_log"] = ""
        return _build_dataset_summary(df)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")


@app.post("/api/automl/run")
def run_automl_pipeline(payload: Dict[str, Any] = Body(...)):
    """
    Execute Transparent AutoML pipeline and auto-initialize RAG Assistant.
    """
    if WORKSPACE_STATE["df"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload or load sample data first.")

    target_col = payload.get("target_col")
    if not target_col or target_col not in WORKSPACE_STATE["df"].columns:
        raise HTTPException(status_code=400, detail=f"Target column '{target_col}' not found in dataset.")

    missing_thresh = float(payload.get("missing_threshold", 0.60))
    cardinality_thresh = int(payload.get("cardinality_threshold", 10))
    test_size = float(payload.get("test_size", 0.20))
    provider = payload.get("provider", "gemini")
    gemini_api_key = payload.get("gemini_api_key", os.getenv("GOOGLE_API_KEY", ""))
    gemini_model = payload.get("gemini_model", "gemini-3.6-flash")
    ollama_url = payload.get("ollama_base_url", "http://localhost:11434")
    ollama_model = payload.get("ollama_model", "qwen2.5:7b")

    try:
        df = WORKSPACE_STATE["df"]
        engine = TransparentAutoML(
            missing_threshold=missing_thresh,
            cardinality_threshold=cardinality_thresh,
            test_size=test_size,
            random_state=42,
        )
        engine.fit(df, target_col=target_col)

        exec_log = engine.get_execution_log()
        WORKSPACE_STATE["automl_engine"] = engine
        WORKSPACE_STATE["execution_log"] = exec_log
        WORKSPACE_STATE["target_col"] = target_col

        leaderboard_df = engine.get_leaderboard()
        leaderboard_records = leaderboard_df.replace({np.nan: None}).to_dict(orient="records") if not leaderboard_df.empty else []

        feature_imp_df = engine.get_feature_importances()
        feature_imp_records = feature_imp_df.replace({np.nan: None}).to_dict(orient="records") if not feature_imp_df.empty else []

        # Auto-initialize RAG Assistant in background
        rag_error = None
        try:
            rag = AutoMLRAGAssistant(
                execution_log=exec_log,
                provider=provider,
                gemini_api_key=gemini_api_key,
                gemini_model=gemini_model,
                ollama_base_url=ollama_url,
                ollama_model=ollama_model,
            )
            WORKSPACE_STATE["rag_assistant"] = rag
        except Exception as r_err:
            rag_error = str(r_err)

        return {
            "success": True,
            "best_model_name": engine.best_model_name,
            "task_type": engine.task_type,
            "target_col": engine.target_col,
            "metrics": engine.get_metrics(),
            "leaderboard": leaderboard_records,
            "feature_importances": feature_imp_records,
            "execution_log": exec_log,
            "rag_initialized": WORKSPACE_STATE["rag_assistant"] is not None,
            "rag_error": rag_error,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AutoML Pipeline Execution Failed: {str(e)}")


@app.post("/api/automl/predict")
async def run_predictions(file: UploadFile = File(...)):
    """Score a holdout dataset using the trained champion pipeline."""
    if WORKSPACE_STATE["automl_engine"] is None:
        raise HTTPException(status_code=400, detail="No trained AutoML model available. Run AutoML first.")

    try:
        engine: TransparentAutoML = WORKSPACE_STATE["automl_engine"]
        contents = await file.read()
        new_df = pd.read_csv(io.BytesIO(contents))
        preds = engine.predict(new_df)

        scored_df = new_df.copy()
        pred_col_name = f"Predicted_{engine.target_col}"
        scored_df[pred_col_name] = preds

        csv_buffer = io.StringIO()
        scored_df.to_csv(csv_buffer, index=False)
        csv_text = csv_buffer.getvalue()

        preview_records = scored_df.head(20).replace({np.nan: None}).to_dict(orient="records")

        return {
            "total_scored": len(scored_df),
            "prediction_column": pred_col_name,
            "preview": preview_records,
            "csv_data": csv_text,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")


@app.post("/api/ollama/check")
def check_ollama(payload: Dict[str, Any] = Body(...)):
    """Check connectivity to local Ollama server and target model."""
    url = payload.get("url", "http://localhost:11434")
    model = payload.get("model", "qwen2.5:7b")
    return check_ollama_status(url, model)


@app.post("/api/chat/stream")
def chat_stream(payload: Dict[str, Any] = Body(...)):
    """
    Stream RAG explainability tokens using Server-Sent Events (SSE).
    """
    message = payload.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    exec_log = WORKSPACE_STATE.get("execution_log", "")
    if not exec_log:
        raise HTTPException(status_code=400, detail="No execution log available. Please run AutoML first.")

    provider = payload.get("provider", "gemini")
    gemini_api_key = payload.get("gemini_api_key", os.getenv("GOOGLE_API_KEY", ""))
    gemini_model = payload.get("gemini_model", "gemini-3.6-flash")
    ollama_url = payload.get("ollama_base_url", "http://localhost:11434")
    ollama_model = payload.get("ollama_model", "qwen2.5:7b")

    # Initialize or recreate RAG assistant if needed
    rag = WORKSPACE_STATE.get("rag_assistant")
    if rag is None or getattr(rag, "provider", "") != provider:
        try:
            rag = AutoMLRAGAssistant(
                execution_log=exec_log,
                provider=provider,
                gemini_api_key=gemini_api_key,
                gemini_model=gemini_model,
                ollama_base_url=ollama_url,
                ollama_model=ollama_model,
            )
            WORKSPACE_STATE["rag_assistant"] = rag
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to initialize RAG Assistant: {str(e)}")

    def event_generator():
        # 1. Retrieve grounding context sources
        source_contents = []
        try:
            if rag.retriever:
                docs = rag.retriever.invoke(message)
                source_contents = [d.page_content for d in docs]
        except Exception:
            pass

        # 2. Stream tokens in real-time
        try:
            for token in rag.ask_stream(message):
                event_data = json.dumps({"type": "token", "content": token})
                yield f"data: {event_data}\n\n"
        except Exception as stream_err:
            err_data = json.dumps({"type": "error", "content": f"Streaming error: {str(stream_err)}"})
            yield f"data: {err_data}\n\n"

        # 3. Send final completion event with source chunks
        done_data = json.dumps({"type": "done", "sources": source_contents})
        yield f"data: {done_data}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
