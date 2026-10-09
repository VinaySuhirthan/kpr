from app.services.feature_engineering import build_feature_dataset


if __name__ == "__main__":
    dataset = build_feature_dataset()
    print(dataset.head().to_string(index=False))
