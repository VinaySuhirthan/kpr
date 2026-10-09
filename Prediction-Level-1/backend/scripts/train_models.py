from app.services.model_service import ensure_models


if __name__ == "__main__":
    metrics = ensure_models()
    print(metrics)
