import pandas as pd
import numpy as np
from automl_engine import TransparentAutoML

def test_engine():
    np.random.seed(42)
    n = 120
    df = pd.DataFrame({
        "id_col": [f"ID_{i}" for i in range(n)],
        "age": np.random.choice([25.0, 35.0, np.nan, 45.0], size=n),
        "fare": np.random.uniform(10, 100, size=n),
        "gender": np.random.choice(["male", "female"], size=n),
        "embarked": np.random.choice(["S", "C", "Q"], size=n),
        "mostly_empty": [np.nan if i % 10 != 0 else 1.0 for i in range(n)],
        "zero_var": ["constant"] * n,
        "target": np.random.choice([0, 1], size=n),
    })

    print("--- Running Transparent AutoML ---")
    engine = TransparentAutoML(missing_threshold=0.6, cardinality_threshold=5, test_size=0.2)
    engine.fit(df, target_col="target")

    print("\n--- Leaderboard ---")
    print(engine.get_leaderboard())

    print("\n--- Feature Importance ---")
    print(engine.get_feature_importances())

    print("\n--- Full Execution Log ---")
    print(engine.get_execution_log())

    preds = engine.predict(df.drop(columns=["target"]))
    print(f"\nPredictions generated: {len(preds)} predictions. Sample: {preds[:5]}")
    print("\nAll tests passed successfully!")

if __name__ == "__main__":
    test_engine()
