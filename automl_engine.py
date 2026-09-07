"""
automl_engine.py
----------------
A transparent, heuristic-driven Automated Machine Learning (AutoML) engine.

Unlike black-box AutoML frameworks, this engine explicitly logs every decision
made during the ML lifecycle—including missing value strategies, column drops,
identifier detection, encoding selections, model evaluation comparisons,
overfitting diagnostics, and feature importance rankings.
"""

from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder, OrdinalEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    mean_squared_error,
    mean_absolute_error,
    r2_score,
)
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.ensemble import (
    RandomForestClassifier,
    RandomForestRegressor,
    GradientBoostingClassifier,
    GradientBoostingRegressor,
)


class TransparentAutoML:
    """
    Transparent AutoML Pipeline that performs heuristic preprocessing,
    multi-model benchmarking, and comprehensive decision logging.
    """

    def __init__(
        self,
        missing_threshold: float = 0.60,
        cardinality_threshold: int = 10,
        test_size: float = 0.20,
        random_state: int = 42,
    ):
        """
        Initialize the Transparent AutoML engine.

        Parameters:
        -----------
        missing_threshold : float
            Proportion of missing values above which a column is dropped (e.g., 0.60 = 60%).
        cardinality_threshold : int
            Max unique values for a categorical column to use One-Hot Encoding vs. Ordinal Encoding.
        test_size : float
            Fraction of data reserved for the evaluation holdout set.
        random_state : int
            Reproducibility seed for data splits and model training.
        """
        self.missing_threshold = missing_threshold
        self.cardinality_threshold = cardinality_threshold
        self.test_size = test_size
        self.random_state = random_state

        # State attributes
        self.target_col: Optional[str] = None
        self.task_type: Optional[str] = None  # "classification" or "regression"
        self.raw_shape: Tuple[int, int] = (0, 0)
        self.dropped_columns: Dict[str, str] = {}
        self.column_profiles: List[Dict[str, Any]] = []
        self.cleaning_logs: List[str] = []
        self.encoding_logs: List[Dict[str, Any]] = []
        self.model_logs: List[Dict[str, Any]] = []
        self.leaderboard: Optional[pd.DataFrame] = None
        self.best_model_name: Optional[str] = None
        self.best_pipeline: Optional[Pipeline] = None
        self.feature_importances: Optional[pd.DataFrame] = None
        self.evaluation_metrics: Dict[str, Any] = {}
        self.full_execution_log: str = ""
        self.feature_names_in_: List[str] = []
        self.transformed_feature_names_: List[str] = []
        self.split_info: Dict[str, Any] = {}

    def _determine_task_type(self, y: pd.Series) -> str:
        """
        Heuristically determine if the task is classification or regression.
        """
        if pd.api.types.is_numeric_dtype(y):
            unique_count = y.nunique(dropna=True)
            total_count = len(y.dropna())
            unique_ratio = unique_count / max(total_count, 1)

            # If numeric with few distinct values, treat as discrete classification
            if unique_count <= 20 and unique_ratio < 0.10:
                return "classification"
            return "regression"
        return "classification"

    def fit(self, df: pd.DataFrame, target_col: str) -> "TransparentAutoML":
        """
        Execute the transparent AutoML pipeline on the provided dataset with verbose tracking.
        """
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found in DataFrame.")

        self.target_col = target_col
        self.raw_shape = df.shape
        self.dropped_columns = {}
        self.column_profiles = []
        self.cleaning_logs = []
        self.encoding_logs = []
        self.model_logs = []

        # ---------------------------------------------------------
        # Step 1: Initial Profiling of all columns
        # ---------------------------------------------------------
        for col in df.columns:
            n_null = int(df[col].isnull().sum())
            null_pct = float((n_null / len(df)) * 100)
            n_uniq = int(df[col].nunique(dropna=True))
            dtype_str = str(df[col].dtype)
            self.column_profiles.append({
                "Column": col,
                "Type": dtype_str,
                "Missing_Count": n_null,
                "Missing_Percentage": round(null_pct, 2),
                "Unique_Count": n_uniq,
                "Role": "Target" if col == target_col else "Feature Candidate",
            })

        # ---------------------------------------------------------
        # Step 2: Target Analysis & Data Preparation
        # ---------------------------------------------------------
        df_clean = df.copy()

        # Handle missing target values
        missing_target_count = int(df_clean[target_col].isnull().sum())
        if missing_target_count > 0:
            df_clean = df_clean.dropna(subset=[target_col])
            self.cleaning_logs.append(
                f"- **Target Cleansing**: Dropped {missing_target_count} row(s) with missing target values in '{target_col}'. "
                f"Supervised learning algorithms require ground-truth target values for loss optimization."
            )

        y = df_clean[target_col]
        X = df_clean.drop(columns=[target_col])

        self.task_type = self._determine_task_type(y)

        # ---------------------------------------------------------
        # Step 3: Heuristic Data Cleaning & Column Pruning
        # ---------------------------------------------------------
        cols_to_drop = []

        for col in X.columns:
            missing_ratio = X[col].isnull().mean()
            unique_vals = X[col].nunique(dropna=True)
            col_lower = col.lower().strip()

            # Rule 1: Excessive Missing Values
            if missing_ratio > self.missing_threshold:
                reason = (
                    f"Column '{col}' has {missing_ratio * 100:.1f}% missing values, which exceeds the allowed "
                    f"threshold of {self.missing_threshold * 100:.0f}%. Imputing over half the data would generate "
                    f"artificial noise and degrade statistical validity."
                )
                self.dropped_columns[col] = reason
                self.cleaning_logs.append(f"- **[PRUNED: High Missingness]** {reason}")
                cols_to_drop.append(col)
                continue

            # Rule 2: Constant Feature / Zero Variance
            if unique_vals <= 1:
                reason = (
                    f"Column '{col}' contains only {unique_vals} distinct value across all rows. "
                    f"Zero variance features provide no discriminatory information for machine learning models."
                )
                self.dropped_columns[col] = reason
                self.cleaning_logs.append(f"- **[PRUNED: Zero Variance]** {reason}")
                cols_to_drop.append(col)
                continue

            # Rule 3: Identifier Detection (String or Numeric Sequential IDs)
            is_id_named = col_lower in ["id", "identifier", "uuid", "passengerid", "row_id", "index"] or col_lower.endswith("_id")
            is_all_unique = (unique_vals == len(X)) and (len(X) >= 30)

            if is_id_named and is_all_unique:
                reason = (
                    f"Column '{col}' has 100% unique values ({unique_vals}/{len(X)}) and matches an ID naming pattern. "
                    f"Identifiers cause severe data leakage and overfitting (models memorize ID numbers rather than generalizable signals)."
                )
                self.dropped_columns[col] = reason
                self.cleaning_logs.append(f"- **[PRUNED: Unique Identifier]** {reason}")
                cols_to_drop.append(col)
                continue
            elif is_all_unique and (pd.api.types.is_string_dtype(X[col]) or pd.api.types.is_object_dtype(X[col])):
                reason = (
                    f"Column '{col}' is a text/categorical field with 100% distinct unique entries ({unique_vals} values). "
                    f"High-cardinality keys lead to high-dimensional overfitting and was therefore pruned."
                )
                self.dropped_columns[col] = reason
                self.cleaning_logs.append(f"- **[PRUNED: Unique Key]** {reason}")
                cols_to_drop.append(col)
                continue

        X = X.drop(columns=cols_to_drop)
        self.feature_names_in_ = list(X.columns)

        if len(self.feature_names_in_) == 0:
            raise ValueError("All features were pruned during data cleaning. No valid predictive features remain.")

        # ---------------------------------------------------------
        # Step 4: Feature Preprocessing & Transformation Strategy
        # ---------------------------------------------------------
        numeric_cols = []
        low_card_cat_cols = []
        high_card_cat_cols = []

        for col in X.columns:
            missing_count = int(X[col].isnull().sum())
            if pd.api.types.is_numeric_dtype(X[col]):
                numeric_cols.append(col)
                median_val = float(X[col].median()) if not X[col].dropna().empty else 0.0
                mean_val = float(X[col].mean()) if not X[col].dropna().empty else 0.0
                std_val = float(X[col].std()) if not X[col].dropna().empty else 0.0
                self.encoding_logs.append({
                    "Feature": col,
                    "Type": "Numerical (Continuous/Discrete)",
                    "Missing_Count": missing_count,
                    "Imputation": f"Median Imputation (median = {median_val:.2f}, mean = {mean_val:.2f})",
                    "Scaling_Encoding": "StandardScaler (Z-score Normalization: zero mean, unit variance)",
                    "Rationale": "Median imputation protects against skewness/outliers; StandardScaler ensures balanced gradient descent and equal feature weighting in distance/linear algorithms.",
                })
            else:
                unique_cnt = int(X[col].nunique(dropna=True))
                top_mode = str(X[col].mode().iloc[0]) if not X[col].dropna().empty else "Unknown"
                if unique_cnt <= self.cardinality_threshold:
                    low_card_cat_cols.append(col)
                    self.encoding_logs.append({
                        "Feature": col,
                        "Type": f"Categorical (Low Cardinality: {unique_cnt} categories)",
                        "Missing_Count": missing_count,
                        "Imputation": f"Mode Imputation (most frequent = '{top_mode}')",
                        "Scaling_Encoding": "One-Hot Encoding (handle_unknown='ignore')",
                        "Rationale": f"Cardinality ({unique_cnt}) is <= threshold ({self.cardinality_threshold}). One-Hot Encoding avoids imposing an artificial numerical order while keeping dimensions manageable.",
                    })
                else:
                    high_card_cat_cols.append(col)
                    self.encoding_logs.append({
                        "Feature": col,
                        "Type": f"Categorical (High Cardinality: {unique_cnt} categories)",
                        "Missing_Count": missing_count,
                        "Imputation": f"Mode Imputation (most frequent = '{top_mode}')",
                        "Scaling_Encoding": "Ordinal Encoding (handle_unknown='use_encoded_value')",
                        "Rationale": f"Cardinality ({unique_cnt}) exceeds threshold ({self.cardinality_threshold}). Ordinal Encoding was selected to prevent catastrophic dimensional explosion that One-Hot Encoding would cause.",
                    })

        # Build Scikit-Learn transformers
        transformers = []

        if numeric_cols:
            num_pipe = Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
            ])
            transformers.append(("num", num_pipe, numeric_cols))

        if low_card_cat_cols:
            low_cat_pipe = Pipeline([
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
            ])
            transformers.append(("low_cat", low_cat_pipe, low_card_cat_cols))

        if high_card_cat_cols:
            high_cat_pipe = Pipeline([
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("ordinal", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)),
            ])
            transformers.append(("high_cat", high_cat_pipe, high_card_cat_cols))

        preprocessor = ColumnTransformer(transformers=transformers)

        # ---------------------------------------------------------
        # Step 5: Dataset Holdout Splitting
        # ---------------------------------------------------------
        stratify_opt = y if (self.task_type == "classification" and y.value_counts().min() >= 2) else None

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=self.test_size, random_state=self.random_state, stratify=stratify_opt
        )

        self.split_info = {
            "Total_Rows": len(X),
            "Train_Rows": len(X_train),
            "Test_Rows": len(X_test),
            "Train_Ratio": f"{int((1 - self.test_size) * 100)}%",
            "Test_Ratio": f"{int(self.test_size * 100)}%",
            "Stratified": "Yes (Class distribution preserved)" if stratify_opt is not None else "No (Uniform random split)",
            "Random_State": self.random_state,
        }

        # ---------------------------------------------------------
        # Step 6: Multi-Model Exploration & Benchmarking
        # ---------------------------------------------------------
        if self.task_type == "classification":
            candidate_models = {
                "Logistic Regression": {
                    "model": LogisticRegression(max_iter=1000, random_state=self.random_state),
                    "description": "Linear baseline using L2 regularization (C=1.0) and cross-entropy loss.",
                },
                "Random Forest Classifier": {
                    "model": RandomForestClassifier(n_estimators=100, max_depth=10, random_state=self.random_state),
                    "description": "Ensemble of 100 bootstrapped decision trees with Gini impurity splitting.",
                },
                "Gradient Boosting Classifier": {
                    "model": GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, random_state=self.random_state),
                    "description": "Sequential boosted ensemble minimizing deviance loss with shrinkage.",
                },
            }
        else:
            candidate_models = {
                "Ridge Regression": {
                    "model": Ridge(alpha=1.0, random_state=self.random_state),
                    "description": "Linear regression with L2 Tikhonov regularization.",
                },
                "Random Forest Regressor": {
                    "model": RandomForestRegressor(n_estimators=100, max_depth=10, random_state=self.random_state),
                    "description": "Non-linear ensemble of 100 regression trees with MSE criterion.",
                },
                "Gradient Boosting Regressor": {
                    "model": GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, random_state=self.random_state),
                    "description": "Gradient boosted regression trees with Friedman MSE criterion.",
                },
            }

        results_list = []
        fitted_pipelines = {}

        for name, info in candidate_models.items():
            model = info["model"]
            pipe = Pipeline([
                ("preprocessor", preprocessor),
                ("model", model),
            ])

            # Train candidate pipeline
            pipe.fit(X_train, y_train)
            y_pred_test = pipe.predict(X_test)
            y_pred_train = pipe.predict(X_train)

            fitted_pipelines[name] = pipe

            if self.task_type == "classification":
                test_acc = accuracy_score(y_test, y_pred_test)
                train_acc = accuracy_score(y_train, y_pred_train)
                test_f1 = f1_score(y_test, y_pred_test, average="weighted", zero_division=0)
                test_prec = precision_score(y_test, y_pred_test, average="weighted", zero_division=0)
                test_rec = recall_score(y_test, y_pred_test, average="weighted", zero_division=0)
                overfit_delta = train_acc - test_acc

                res = {
                    "Model": name,
                    "Accuracy": round(float(test_acc), 4),
                    "Train_Accuracy": round(float(train_acc), 4),
                    "Overfit_Delta": round(float(overfit_delta), 4),
                    "F1_Score": round(float(test_f1), 4),
                    "Precision": round(float(test_prec), 4),
                    "Recall": round(float(test_rec), 4),
                }
                results_list.append(res)
                self.model_logs.append({
                    "Model": name,
                    "Description": info["description"],
                    "Holdout_Score": f"Accuracy = {test_acc:.4f} ({test_acc * 100:.2f}%)",
                    "Train_Score": f"Train Accuracy = {train_acc:.4f} ({train_acc * 100:.2f}%)",
                    "Overfit_Assessment": f"Overfitting Gap = {overfit_delta:+.4f} ({'Minimal' if abs(overfit_delta) < 0.05 else 'Moderate' if abs(overfit_delta) < 0.15 else 'High'})",
                    "F1_Score": f"{test_f1:.4f}",
                    "Precision": f"{test_prec:.4f}",
                    "Recall": f"{test_rec:.4f}",
                })
            else:
                test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
                train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
                test_mae = mean_absolute_error(y_test, y_pred_test)
                test_r2 = r2_score(y_test, y_pred_test)
                train_r2 = r2_score(y_train, y_pred_train)
                overfit_delta = train_r2 - test_r2

                res = {
                    "Model": name,
                    "RMSE": round(float(test_rmse), 4),
                    "Train_RMSE": round(float(train_rmse), 4),
                    "MAE": round(float(test_mae), 4),
                    "R2_Score": round(float(test_r2), 4),
                    "Train_R2": round(float(train_r2), 4),
                    "Overfit_Delta": round(float(overfit_delta), 4),
                }
                results_list.append(res)
                self.model_logs.append({
                    "Model": name,
                    "Description": info["description"],
                    "Holdout_Score": f"RMSE = {test_rmse:.4f}, R² = {test_r2:.4f}",
                    "Train_Score": f"Train RMSE = {train_rmse:.4f}, Train R² = {train_r2:.4f}",
                    "Overfit_Assessment": f"R² Gap = {overfit_delta:+.4f}",
                    "MAE": f"{test_mae:.4f}",
                })

        # ---------------------------------------------------------
        # Step 7: Winner Selection & Leaderboard
        # ---------------------------------------------------------
        leaderboard_df = pd.DataFrame(results_list)
        if self.task_type == "classification":
            leaderboard_df = leaderboard_df.sort_values(by=["Accuracy", "F1_Score"], ascending=[False, False]).reset_index(drop=True)
            self.best_model_name = leaderboard_df.iloc[0]["Model"]
        else:
            leaderboard_df = leaderboard_df.sort_values(by=["R2_Score", "RMSE"], ascending=[False, True]).reset_index(drop=True)
            self.best_model_name = leaderboard_df.iloc[0]["Model"]

        self.leaderboard = leaderboard_df
        self.best_pipeline = fitted_pipelines[self.best_model_name]
        self.evaluation_metrics = leaderboard_df.iloc[0].to_dict()

        # ---------------------------------------------------------
        # Step 8: Feature Importance Extraction
        # ---------------------------------------------------------
        self._extract_feature_importances(preprocessor, self.best_pipeline.named_steps["model"])

        # ---------------------------------------------------------
        # Step 9: Synthesize Comprehensive Execution Chronicle
        # ---------------------------------------------------------
        self.full_execution_log = self._generate_execution_log(df, y)

        return self

    def _extract_feature_importances(self, preprocessor: ColumnTransformer, model: Any) -> None:
        """
        Extract and align feature names and importance weights from the fitted pipeline.
        """
        feature_names = []
        try:
            feature_names = list(preprocessor.get_feature_names_out())
        except Exception:
            feature_names = [f"feat_{i}" for i in range(100)]

        self.transformed_feature_names_ = feature_names

        importances = None
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
        elif hasattr(model, "coef_"):
            coef = model.coef_
            if coef.ndim > 1:
                importances = np.mean(np.abs(coef), axis=0)
            else:
                importances = np.abs(coef)

        if importances is not None and len(feature_names) == len(importances):
            clean_names = [
                name.replace("num__", "").replace("low_cat__", "").replace("high_cat__", "")
                for name in feature_names
            ]
            imp_df = pd.DataFrame({
                "Feature": clean_names,
                "Raw_Weight": importances,
            })
            total_sum = imp_df["Raw_Weight"].sum()
            imp_df["Importance_Percentage"] = (imp_df["Raw_Weight"] / (total_sum or 1.0)) * 100
            self.feature_importances = imp_df.sort_values(by="Raw_Weight", ascending=False).reset_index(drop=True)
        else:
            self.feature_importances = pd.DataFrame(columns=["Feature", "Raw_Weight", "Importance_Percentage"])

    def _generate_execution_log(self, raw_df: pd.DataFrame, y: pd.Series) -> str:
        """
        Compile an exhaustive, numbered, step-by-step audit trail of the entire AutoML lifecycle.
        """
        lines = []
        lines.append("# ==============================================================================")
        lines.append("# TRANSPARENT AUTOML PIPELINE: COMPREHENSIVE EXECUTION CHRONICLE")
        lines.append("# ==============================================================================\n")

        # Executive Summary & Navigation
        lines.append("## [Executive Pipeline Summary]")
        lines.append(f"- **Target Column**: `{self.target_col}`")
        lines.append(f"- **Formulated Task Type**: `{self.task_type.upper()}`")
        lines.append(f"- **Dataset Dimensions**: {self.raw_shape[0]:,} Rows × {self.raw_shape[1]:,} Columns")
        lines.append(f"- **Features Retained for Modeling**: {len(self.feature_names_in_)} features ({', '.join(self.feature_names_in_)})")
        lines.append(f"- **Features Pruned/Dropped**: {len(self.dropped_columns)} columns ({', '.join(self.dropped_columns.keys()) if self.dropped_columns else 'None'})")
        lines.append(f"- **Winning Algorithm**: **{self.best_model_name}**")
        if self.task_type == "classification":
            lines.append(f"- **Winning Holdout Performance**: Accuracy = {self.evaluation_metrics.get('Accuracy', 0):.4f} ({self.evaluation_metrics.get('Accuracy', 0)*100:.2f}%), F1-Score = {self.evaluation_metrics.get('F1_Score', 0):.4f}")
        else:
            lines.append(f"- **Winning Holdout Performance**: R² Score = {self.evaluation_metrics.get('R2_Score', 0):.4f}, RMSE = {self.evaluation_metrics.get('RMSE', 0):.4f}")
        lines.append("")

        # Step 1: Ingestion & Profiling
        lines.append("## [Step 1: Dataset Ingestion & Column Profiling]")
        lines.append(f"Ingested raw dataset containing **{self.raw_shape[0]:,} rows** and **{self.raw_shape[1]:,} columns**.")
        lines.append(f"- Total missing cells across entire dataset: **{raw_df.isnull().sum().sum():,}** ({((raw_df.isnull().sum().sum() / (raw_df.size or 1)) * 100):.2f}% of data)")
        lines.append(f"- Total duplicate rows detected: **{raw_df.duplicated().sum():,}**")
        lines.append("\n**Raw Column Inventory Table:**")
        prof_df = pd.DataFrame(self.column_profiles)
        lines.append(prof_df.to_markdown(index=False))
        lines.append("")

        # Step 2: Target Analysis & Problem Formulation
        lines.append("## [Step 2: Target Variable Analysis & Problem Formulation]")
        lines.append(f"- **Selected Target**: `{self.target_col}` (Data Type: `{raw_df[self.target_col].dtype}`)")
        lines.append(f"- **Target Unique Values**: {y.nunique()}")
        lines.append(f"- **Determined Task Formulation**: `{self.task_type.upper()}`")
        if self.task_type == "classification":
            class_counts = y.value_counts()
            lines.append("- **Class Distribution Breakdown:**")
            for c_val, c_cnt in class_counts.items():
                c_pct = (c_cnt / len(y)) * 100
                lines.append(f"  * Class `{c_val}`: {c_cnt:,} instances ({c_pct:.2f}%)")
            lines.append(
                f"- **Formulation Rationale**: The target `{self.target_col}` contains {y.nunique()} discrete classes. "
                f"It was mathematically formulated as a multi-class/binary classification problem using cross-entropy and class-weighted F1 optimization."
            )
        else:
            lines.append(f"- **Target Statistical Distribution**: Min = {y.min():.4f}, Max = {y.max():.4f}, Mean = {y.mean():.4f}, StdDev = {y.std():.4f}, Median = {y.median():.4f}")
            lines.append(
                f"- **Formulation Rationale**: The target `{self.target_col}` is continuous numeric with {y.nunique()} distinct values. "
                f"It was mathematically formulated as a regression problem minimizing Root Mean Squared Error (RMSE)."
            )
        lines.append("")

        # Step 3: Data Cleaning & Heuristics
        lines.append("## [Step 3: Data Cleaning & Heuristic Column Pruning Decisions]")
        lines.append(f"- **Missing Value Threshold Rule**: Columns with missingness exceeding `{self.missing_threshold * 100:.0f}%` are dropped to prevent synthetic bias.")
        lines.append(f"- **Zero-Variance Rule**: Constant columns with `<= 1` unique value carry zero mathematical entropy and are dropped.")
        lines.append(f"- **Identifier Rule**: Sequential or 100% unique ID keys are dropped to prevent memorization and target leakage.")
        lines.append("\n**Specific Cleaning Actions Recorded:**")
        if self.cleaning_logs:
            for log in self.cleaning_logs:
                lines.append(log)
        else:
            lines.append("- All columns met data hygiene criteria. No columns or rows required pruning.")
        lines.append(f"\n- **Final Features Kept ({len(self.feature_names_in_)}):** `{self.feature_names_in_}`")
        lines.append("")

        # Step 4: Feature Preprocessing & Transformation Strategy
        lines.append("## [Step 4: Feature Preprocessing, Imputation & Encoding Strategy]")
        lines.append(f"- **Categorical Cardinality Policy**: One-Hot Encoding if unique values `<= {self.cardinality_threshold}`, otherwise Ordinal Encoding to protect dimensionality.")
        lines.append(f"- **Numerical Imputation Policy**: Median imputation to preserve robustness against extreme outliers, followed by standard Z-Score normalization (`StandardScaler`).")
        lines.append(f"- **Categorical Imputation Policy**: Most-frequent (Mode) imputation.")
        lines.append("\n**Feature Transformation Breakdown Table:**")
        enc_df = pd.DataFrame(self.encoding_logs)
        if not enc_df.empty:
            lines.append(enc_df.to_markdown(index=False))
        lines.append("")

        # Step 5: Data Splitting
        lines.append("## [Step 5: Holdout Data Splitting Strategy]")
        for k, v in self.split_info.items():
            lines.append(f"- **{k.replace('_', ' ')}**: {v}")
        lines.append("")

        # Step 6: Multi-Model Exploration & Benchmarking
        lines.append("## [Step 6: Candidate Model Exploration & Benchmark Results]")
        lines.append(f"Trained and evaluated {len(self.model_logs)} candidate machine learning algorithms under identical preprocessed splits:")
        for m_log in self.model_logs:
            lines.append(f"\n### Candidate: {m_log['Model']}")
            lines.append(f"- **Algorithm Architecture**: {m_log['Description']}")
            lines.append(f"- **Holdout Evaluation Score**: {m_log['Holdout_Score']}")
            lines.append(f"- **Training Score**: {m_log['Train_Score']}")
            lines.append(f"- **Overfitting Diagnostic**: {m_log['Overfit_Assessment']}")
            if self.task_type == "classification":
                lines.append(f"- **Detailed Metrics**: F1-Score = {m_log['F1_Score']}, Precision = {m_log['Precision']}, Recall = {m_log['Recall']}")
            else:
                lines.append(f"- **Detailed Metrics**: Mean Absolute Error (MAE) = {m_log['MAE']}")

        lines.append("\n### Complete Leaderboard Ranking Table:")
        if self.leaderboard is not None:
            lines.append(self.leaderboard.to_markdown(index=False))
        lines.append("")

        # Step 7: Winner Selection Rationale
        lines.append("## [Step 7: Final Model Selection & Optimization Rationale]")
        lines.append(f"- **Selected Champion Model**: **{self.best_model_name}**")
        if self.task_type == "classification":
            lines.append(
                f"- **Selection Justification**: **{self.best_model_name}** scored the highest holdout accuracy "
                f"of **{self.evaluation_metrics.get('Accuracy', 0):.4f}** and weighted F1-Score of **{self.evaluation_metrics.get('F1_Score', 0):.4f}**, "
                f"demonstrating the best trade-off between bias, variance, and generalization performance."
            )
        else:
            lines.append(
                f"- **Selection Justification**: **{self.best_model_name}** achieved the highest R² Score "
                f"of **{self.evaluation_metrics.get('R2_Score', 0):.4f}** and lowest RMSE of **{self.evaluation_metrics.get('RMSE', 0):.4f}**."
            )
        lines.append("")

        # Step 8: Feature Importance & Interpretability
        lines.append("## [Step 8: Feature Importance & Interpretability Analysis]")
        if self.feature_importances is not None and not self.feature_importances.empty:
            lines.append("Global feature contribution ranking extracted from the winning estimator pipeline:")
            lines.append(self.feature_importances.to_markdown(index=False))
            top_f = self.feature_importances.iloc[0]
            lines.append(
                f"\n- **Primary Driver**: Feature **'{top_f['Feature']}'** is the single most influential predictor, "
                f"accounting for **{top_f['Importance_Percentage']:.2f}%** of total model decision weight."
            )
        else:
            lines.append("- Feature importance weights could not be directly extracted from this estimator.")
        lines.append("")
        lines.append("# ==============================================================================")
        lines.append("# END OF PIPELINE EXECUTION CHRONICLE")
        lines.append("# ==============================================================================")

        return "\n".join(lines)

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """
        Generate predictions on new data using the trained transparent pipeline.
        """
        if self.best_pipeline is None:
            raise RuntimeError("The AutoML pipeline has not been fitted yet. Call .fit() first.")
        return self.best_pipeline.predict(df)

    def get_execution_log(self) -> str:
        """Return the complete execution chronicle."""
        return self.full_execution_log

    def get_leaderboard(self) -> pd.DataFrame:
        """Return the candidate models leaderboard."""
        return self.leaderboard if self.leaderboard is not None else pd.DataFrame()

    def get_feature_importances(self) -> pd.DataFrame:
        """Return feature importance rankings."""
        return self.feature_importances if self.feature_importances is not None else pd.DataFrame()

    def get_metrics(self) -> Dict[str, Any]:
        """Return the winning model's evaluation metrics."""
        return self.evaluation_metrics
