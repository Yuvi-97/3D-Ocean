"""
Centralized Data Provider Factory for Ocean Visualizer Backend.

Supplies either LocalDataProvider or HuggingFaceDataProvider based on
the central DATA_SOURCE environment setting.
"""

from typing import Optional
import logging

from ..config import settings
from .base import BaseDataProvider
from .local import LocalDataProvider
from .huggingface import HuggingFaceDataProvider
from .cache import cache

logger = logging.getLogger(__name__)

_provider_instance: Optional[BaseDataProvider] = None


def get_data_provider() -> BaseDataProvider:
    """
    Returns the active DataProvider singleton based on DATA_SOURCE setting.
    Raises ValueError if an invalid DATA_SOURCE is configured.
    """
    global _provider_instance
    if _provider_instance is None:
        source = settings.DATA_SOURCE.strip().lower()
        if source == "local":
            logger.info("Initializing LocalDataProvider...")
            _provider_instance = LocalDataProvider()
        elif source == "huggingface":
            logger.info(f"Initializing HuggingFaceDataProvider (repo: {settings.HF_DATASET_REPO})...")
            _provider_instance = HuggingFaceDataProvider()
        else:
            raise ValueError(
                f"Invalid DATA_SOURCE '{settings.DATA_SOURCE}'. Supported options: 'local', 'huggingface'."
            )

    return _provider_instance


def reset_data_provider() -> None:
    """Resets the data provider singleton (primarily used for automated testing)."""
    global _provider_instance
    _provider_instance = None


__all__ = [
    "BaseDataProvider",
    "LocalDataProvider",
    "HuggingFaceDataProvider",
    "get_data_provider",
    "reset_data_provider",
    "cache",
]
