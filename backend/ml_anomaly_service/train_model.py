import logging
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = BASE_DIR.parent.parent
if str(WORKSPACE_DIR) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_DIR))
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

try:
    from backend.ml_anomaly_service.window_buffer import FEATURE_NAMES
except ImportError:
    from window_buffer import FEATURE_NAMES


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

logger = logging.getLogger("auratrace-model-training")


BASE_DIR = Path(__file__).resolve().parent

MODEL_JOBLIB = BASE_DIR / "isolation_forest.joblib"
MODEL_PKL = BASE_DIR / "isolation_forest.pkl"

RANDOM_STATE = 42
N_SAMPLES = 10000


def generate_normal_training_data(
    n_samples: int = N_SAMPLES,
) -> np.ndarray:
    """
    Generate synthetic normal AuraTrace telemetry windows.

    The project can later replace this with real historical
    telemetry data. For the initial demo, we train on realistic
    normal operating conditions.
    """

    rng = np.random.default_rng(RANDOM_STATE)

    request_count = rng.poisson(
        lam=120,
        size=n_samples,
    ) + 20

    error_rate = rng.beta(
        a=2,
        b=300,
        size=n_samples,
    )

    error_count = np.maximum(
        0,
        np.round(
            request_count * error_rate
        ),
    )

    error_rate = (
        error_count
        / request_count
    )

    avg_latency_ms = rng.lognormal(
        mean=np.log(120),
        sigma=0.30,
        size=n_samples,
    )

    max_latency_ms = (
        avg_latency_ms
        * rng.uniform(
            1.5,
            3.0,
            size=n_samples,
        )
    )

    p95_latency_ms = (
        avg_latency_ms
        * rng.uniform(
            1.15,
            1.70,
            size=n_samples,
        )
    )

    status_5xx_rate = (
        error_count
        / request_count
    )

    unique_error_types = rng.choice(
        [0, 1, 2, 3],
        size=n_samples,
        p=[0.50, 0.35, 0.12, 0.03],
    )

    features = np.column_stack(
        [
            error_count,
            request_count,
            error_rate,
            avg_latency_ms,
            max_latency_ms,
            p95_latency_ms,
            status_5xx_rate,
            unique_error_types,
        ]
    ).astype(np.float32)

    return features


def generate_demo_anomalies() -> np.ndarray:
    """
    Generate deliberately abnormal windows for validation.
    """

    return np.array(
        [
            # Database connection pool exhaustion
            [
                110,
                130,
                0.846,
                1800,
                4500,
                3200,
                0.846,
                5,
            ],

            # Severe latency spike
            [
                8,
                150,
                0.053,
                2500,
                6000,
                4200,
                0.053,
                2,
            ],

            # Massive 5xx spike
            [
                95,
                120,
                0.792,
                300,
                900,
                650,
                0.792,
                6,
            ],

            # Memory-leak-like behaviour
            [
                15,
                180,
                0.083,
                1800,
                5000,
                3500,
                0.083,
                3,
            ],
        ],
        dtype=np.float32,
    )


def train_model() -> IsolationForest:

    logger.info(
        "Starting AuraTrace Isolation Forest training"
    )

    logger.info(
        "Feature count: %d",
        len(FEATURE_NAMES),
    )

    logger.info(
        "Features: %s",
        ", ".join(FEATURE_NAMES),
    )

    X_train = generate_normal_training_data()

    logger.info(
        "Training dataset shape: %s",
        X_train.shape,
    )

    model = IsolationForest(
        n_estimators=200,
        max_samples=4096,
        contamination=0.05,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    model.fit(X_train)

    joblib.dump(
        model,
        MODEL_JOBLIB,
    )

    joblib.dump(
        model,
        MODEL_PKL,
    )

    logger.info(
        "Saved model: %s",
        MODEL_JOBLIB,
    )

    logger.info(
        "Saved model: %s",
        MODEL_PKL,
    )

    return model


def validate_model(
    model: IsolationForest,
) -> None:

    logger.info(
        "Validating trained model..."
    )

    normal_samples = generate_normal_training_data(
        n_samples=10,
    )

    anomaly_samples = generate_demo_anomalies()

    normal_scores = model.decision_function(
        normal_samples
    )

    anomaly_scores = model.decision_function(
        anomaly_samples
    )

    logger.info(
        "Normal decision scores: min=%.4f max=%.4f avg=%.4f",
        normal_scores.min(),
        normal_scores.max(),
        normal_scores.mean(),
    )

    logger.info(
        "Anomaly decision scores: min=%.4f max=%.4f avg=%.4f",
        anomaly_scores.min(),
        anomaly_scores.max(),
        anomaly_scores.mean(),
    )

    logger.info(
        "Model validation completed"
    )


def main():

    logger.info(
        "AuraTrace feature schema:"
    )

    for index, name in enumerate(
        FEATURE_NAMES,
        start=1,
    ):
        logger.info(
            "  %d. %s",
            index,
            name,
        )

    model = train_model()

    validate_model(
        model
    )

    logger.info(
        "Training finished successfully"
    )


if __name__ == "__main__":
    main()