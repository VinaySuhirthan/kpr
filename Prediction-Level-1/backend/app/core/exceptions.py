class AMRDataError(Exception):
    """Raised when dataset loading or validation fails."""


class InvalidIsolateError(AMRDataError):
    """Raised when an isolate ID is missing or invalid."""


class MissingConfigurationError(AMRDataError):
    """Raised when required tool configuration is missing."""


class ModelTrainingError(AMRDataError):
    """Raised when model training cannot proceed."""
