"""
API module for AI Financial Assistant
"""

from typing import List

# Don't import main automatically - it will be imported when needed
# from app.api.main import main
# Avoid using __all__ with 'main' since it won't be imported directly

__all__: List[str] = []

# Add stock_api to __all__ to make it accessible
try:
    from app.api.stock_api import app as stock_api_app
    __all__.append('stock_api_app')
except ImportError:
    # This allows the module to load even if stock_api isn't available yet
    pass
