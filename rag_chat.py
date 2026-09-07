"""
rag_chat.py
-----------
Retrieval-Augmented Generation (RAG) assistant for AutoML explainability.

Supports multi-provider LLM backends:
1. Google Gemini (e.g., gemini-3.6-flash, gemini-3.7-flash) - Blazing fast (1-2s), free tier, ideal for cloud deployment.
2. Local Ollama (e.g., qwen2.5:7b, llama3.2:3b) - 100% local and offline.

Features real-time streaming output (`ask_stream`) for instant typewriter UI responses.
"""

from typing import Dict, Any, List, Optional, Generator
import urllib.request
import json
import hashlib
import uuid
import os
from dotenv import load_dotenv

# Automatically load environment variables from .env file
load_dotenv()

from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_core.embeddings import Embeddings


EXPLAINABILITY_SYSTEM_PROMPT = """You are an Expert AutoML Explainability AI Assistant.
Your mission is to explain the decisions, mathematical formulations, data cleaning heuristics, feature transformations, model evaluations, and feature rankings recorded in the AutoML Pipeline Execution Chronicle.

MANDATORY RESPONSE GUIDELINES:
1. **Be Concrete & Specific**: ALWAYS cite exact numbers, statistics, percentages, and metrics from the log (e.g., missing percentage, exact cardinality, holdout accuracy/RMSE, train-test rows, feature importance percentages).
2. **Step-by-Step Structured Explanations**: When asked for a summary, breakdown, or overall pipeline explanation, structure your response chronologically following the exact pipeline steps recorded in the log:
   - Step 1: Ingestion & Profiling
   - Step 2: Target Analysis & Task Formulation
   - Step 3: Data Cleaning & Heuristics
   - Step 4: Preprocessing & Encoding
   - Step 5: Data Splitting
   - Step 6: Multi-Model Exploration
   - Step 7: Final Model Selection
   - Step 8: Feature Importance
3. **Transparent Reasoning**: Explain *why* each decision was made using the recorded rationale in the log (e.g. why median imputation was chosen over mean, why One-Hot vs Ordinal encoding was picked, why columns were dropped, why the winning model outperformed the others).
4. **Strict Grounding**: Only state facts and metrics present in the execution log. If a question is entirely unrelated to this machine learning run (e.g., general world trivia or generic code), politely refuse:
   "I can only explain decisions, transformations, and metrics recorded in this AutoML pipeline execution log. That information is not part of this run."
5. **Never be vague or generic**: Do not say "common steps that might have been performed". Speak with confidence about the EXACT steps performed in this specific pipeline run.

Complete AutoML Pipeline Execution Chronicle:
=============================================
{context}
=============================================
"""


def _extract_text(chunk: Any) -> str:
    """Safely extract plain text from strings, lists, dicts, or LangChain objects."""
    if isinstance(chunk, str):
        return chunk
    elif isinstance(chunk, list):
        return "".join(_extract_text(item) for item in chunk)
    elif isinstance(chunk, dict):
        return str(chunk.get("text", ""))
    elif hasattr(chunk, "content"):
        return _extract_text(chunk.content)
    return str(chunk)


class DeterministicHashEmbeddings(Embeddings):
    """Fast in-memory deterministic bag-of-words embedding fallback."""
    def __init__(self, dim: int = 128):
        self.dim = dim

    def _embed(self, text: str) -> List[float]:
        vec = [0.0] * self.dim
        tokens = text.lower().split()
        if not tokens:
            return vec
        for token in tokens:
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16) % self.dim
            vec[h] += 1.0
        norm = sum(x * x for x in vec) ** 0.5
        return [x / (norm or 1.0) for x in vec]

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._embed(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        return self._embed(text)


def check_ollama_status(base_url: str = "http://localhost:11434", model_name: str = "qwen2.5:7b") -> Dict[str, Any]:
    """
    Check if the local Ollama server is reachable and if the requested model is pulled.
    """
    cleaned_url = base_url.rstrip("/")
    try:
        req = urllib.request.Request(f"{cleaned_url}/api/tags", method="GET")
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                models = [m.get("name", "") for m in data.get("models", [])]
                has_model = any(model_name in m for m in models)
                return {
                    "connected": True,
                    "models_available": models,
                    "has_target_model": has_model,
                    "message": "Connected successfully." if has_model else f"Ollama is running, but '{model_name}' was not found in installed models.",
                }
    except Exception as e:
        return {
            "connected": False,
            "models_available": [],
            "has_target_model": False,
            "message": f"Could not connect to Ollama at {base_url}. Error: {str(e)}",
        }
    return {"connected": False, "models_available": [], "has_target_model": False, "message": "Unknown error."}


class AutoMLRAGAssistant:
    """
    Indexes AutoML execution logs into ChromaDB and manages grounded RAG queries.
    Supports both Google Gemini (fast/deployable) and Ollama (offline).
    """

    def __init__(
        self,
        execution_log: str,
        provider: str = "gemini",
        gemini_api_key: Optional[str] = None,
        gemini_model: str = "gemini-3.6-flash",
        ollama_base_url: str = "http://localhost:11434",
        ollama_model: str = "qwen2.5:7b",
        chunk_size: int = 1000,
        chunk_overlap: int = 150,
    ):
        """
        Initialize the RAG Assistant with the execution log string.
        """
        self.execution_log = execution_log
        self.provider = provider.lower()
        self.gemini_api_key = gemini_api_key or os.getenv("GOOGLE_API_KEY", "")
        self.gemini_model = gemini_model
        self.ollama_base_url = ollama_base_url.rstrip("/")
        self.ollama_model = ollama_model
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        self.vectorstore: Optional[Chroma] = None
        self.retriever = None
        self.llm = None
        self.prompt = None
        self.rag_chain = None

        self._build_index_and_chain()

    def _build_index_and_chain(self) -> None:
        """
        Build Chroma vector store index and set up hybrid context generation with LLM provider.
        """
        if not self.execution_log or not self.execution_log.strip():
            raise ValueError("Execution log is empty. Cannot construct RAG assistant.")

        # Chunk the log into semantic sections
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separators=["\n## [", "\n### ", "\n- ", "\n\n", "\n", " "],
        )
        raw_chunks = splitter.split_text(self.execution_log)
        docs = [
            Document(page_content=chunk, metadata={"source": "automl_execution_log", "chunk_id": idx})
            for idx, chunk in enumerate(raw_chunks)
        ]

        # Initialize Embeddings (using deterministic local embeddings for instant indexing)
        embeddings = DeterministicHashEmbeddings(dim=128)

        # Generate a unique collection name per run to prevent dimension/cache collisions in ChromaDB
        unique_collection_name = f"automl_run_{uuid.uuid4().hex[:12]}"

        self.vectorstore = Chroma.from_documents(
            documents=docs,
            embedding=embeddings,
            collection_name=unique_collection_name,
        )
        self.retriever = self.vectorstore.as_retriever(search_kwargs={"k": 8})

        # Initialize Selected LLM Provider
        if self.provider == "gemini":
            if not self.gemini_api_key:
                raise ValueError("Google Gemini API Key is missing. Please provide your Gemini API key in .env or sidebar.")
            from langchain_google_genai import ChatGoogleGenerativeAI
            self.llm = ChatGoogleGenerativeAI(
                model=self.gemini_model,
                google_api_key=self.gemini_api_key,
                temperature=0.0,
            )
        else:
            from langchain_ollama import ChatOllama
            self.llm = ChatOllama(
                model=self.ollama_model,
                base_url=self.ollama_base_url,
                temperature=0.0,
            )

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", EXPLAINABILITY_SYSTEM_PROMPT),
            ("human", "{question}"),
        ])

        log_is_compact = len(self.execution_log) < 50000

        def get_context(question: str) -> str:
            if log_is_compact:
                return self.execution_log
            else:
                retrieved_docs = self.retriever.invoke(question)
                return "\n\n".join(doc.page_content for doc in retrieved_docs)

        self.rag_chain = (
            {"context": RunnablePassthrough() | get_context, "question": RunnablePassthrough()}
            | self.prompt
            | self.llm
            | StrOutputParser()
        )

    def ask(self, question: str) -> Dict[str, Any]:
        """
        Synchronously query the RAG assistant.
        """
        if self.rag_chain is None:
            raise RuntimeError("RAG assistant chain has not been properly initialized.")

        try:
            source_docs = self.retriever.invoke(question)
            raw_answer = self.rag_chain.invoke(question)
            answer = _extract_text(raw_answer)
            return {
                "answer": answer,
                "source_documents": [doc.page_content for doc in source_docs],
            }
        except Exception as e:
            return {
                "answer": f"⚠️ Error generating response from {self.provider.upper()}: {str(e)}",
                "source_documents": [],
            }

    def ask_stream(self, question: str) -> Generator[str, None, None]:
        """
        Stream response tokens in real-time for zero-latency typewriter UI in Streamlit.
        """
        if self.rag_chain is None:
            yield "⚠️ RAG assistant chain has not been properly initialized."
            return

        try:
            for chunk in self.rag_chain.stream(question):
                txt = _extract_text(chunk)
                if txt:
                    yield txt
        except Exception as e:
            yield f"\n\n⚠️ Error during generation: {str(e)}"
