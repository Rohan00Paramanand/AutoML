"""
test_server_api.py
------------------
Test suite to verify FastAPI backend endpoints.
"""

from fastapi.testclient import TestClient
from server import app
import json

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    print("[PASS] Health check passed")

def test_sample_dataset_and_automl():
    # 1. Load sample dataset
    res = client.post("/api/dataset/sample")
    assert res.status_code == 200
    data = res.json()
    assert data["total_rows"] == 300
    assert "Survived" in data["columns"]
    print("[PASS] Sample dataset generation passed (300 rows)")

    # 2. Run AutoML pipeline
    run_payload = {
        "target_col": "Survived",
        "missing_threshold": 0.60,
        "cardinality_threshold": 10,
        "test_size": 0.20,
        "provider": "gemini",
        "gemini_api_key": "",
        "gemini_model": "gemini-3.6-flash",
    }
    run_res = client.post("/api/automl/run", json=run_payload)
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["success"] is True
    assert "best_model_name" in run_data
    assert len(run_data["leaderboard"]) > 0
    assert len(run_data["feature_importances"]) > 0
    print(f"[PASS] AutoML Pipeline run passed (Winning Model: {run_data['best_model_name']})")

if __name__ == "__main__":
    test_health()
    test_sample_dataset_and_automl()
    print("\nAll backend API integration tests passed successfully!")
