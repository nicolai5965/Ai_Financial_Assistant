"""
Core functionality for AI Financial Assistant
"""

from typing import List

from app.core.settings import initialize_environment, get_config
from app.core.validate_api_keys import validate_api_keys
from app.core.logging_config import logger

__all__: List[str] = [
    'initialize_environment',
    'get_config',
    'validate_api_keys',
    'logger',
]
