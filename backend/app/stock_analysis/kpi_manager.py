"""
KPI Manager module for stock analysis.

This module serves as the central manager for KPI aggregation and delivery,
providing a unified interface for fetching various KPI groups for a given
stock ticker. It follows the Factory Pattern to dynamically load and
process KPI modules based on requested KPI groups.
"""

from typing import Dict, Any, List, Optional, Union
import concurrent.futures
from functools import lru_cache
import time

from app.core.logging_config import get_logger
from app.stock_analysis.kpi.kpi_utils import sanitize_ticker
from app.stock_analysis.kpi import (
    get_all_price_metrics,
    get_all_volume_metrics,
    get_all_volatility_metrics,
    get_all_fundamental_metrics
)

# Initialize the logger
logger = get_logger()

# Define KPI group constants
KPI_GROUP_PRICE = "price"
KPI_GROUP_VOLUME = "volume"
KPI_GROUP_VOLATILITY = "volatility"
KPI_GROUP_FUNDAMENTAL = "fundamental"
KPI_GROUP_SENTIMENT = "sentiment"

# Define the list of all available KPI groups
AVAILABLE_KPI_GROUPS = [
    KPI_GROUP_PRICE,
    KPI_GROUP_VOLUME,
    KPI_GROUP_VOLATILITY,
    KPI_GROUP_FUNDAMENTAL,
    KPI_GROUP_SENTIMENT
]

# Define which KPI groups are currently implemented
IMPLEMENTED_KPI_GROUPS = [
    KPI_GROUP_PRICE,
    KPI_GROUP_VOLUME,
    KPI_GROUP_VOLATILITY,
    KPI_GROUP_FUNDAMENTAL
]

# Cache timeout in seconds (5 minutes)
CACHE_TIMEOUT = 300

class KpiManager:
    """
    Manager class for fetching and aggregating KPIs from various sources.
    
    This class follows the Factory Pattern to dynamically process KPI requests
    based on requested KPI groups.
    """
    
    def __init__(self):
        """Initialize the KPI manager."""
        self.cache = {}
        self.cache_timestamps = {}
        logger.debug("KpiManager initialized")
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """
        Check if the cached data for a key is still valid.
        
        Args:
            cache_key: The cache key to check
            
        Returns:
            True if cache is valid, False otherwise
        """
        if cache_key not in self.cache_timestamps:
            return False
        
        # Check if cache has expired
        current_time = time.time()
        timestamp = self.cache_timestamps.get(cache_key, 0)
        
        return (current_time - timestamp) < CACHE_TIMEOUT
    
    def _get_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """
        Get data from cache if available and valid.
        
        Args:
            cache_key: The cache key to retrieve
            
        Returns:
            Cached data or None if not available
        """
        if self._is_cache_valid(cache_key):
            logger.debug(f"Using cached data for {cache_key}")
            return self.cache.get(cache_key)
        
        return None
    
    def _store_in_cache(self, cache_key: str, data: Dict[str, Any]) -> None:
        """
        Store data in cache with current timestamp.
        
        Args:
            cache_key: The cache key to use
            data: The data to cache
        """
        self.cache[cache_key] = data
        self.cache_timestamps[cache_key] = time.time()
        logger.debug(f"Stored data in cache for {cache_key}")
    
    def _fetch_kpi_group(self, ticker: str, group: str, timeframe: str) -> Optional[Dict[str, Any]]:
        """
        Fetch KPIs for a specific group.
        
        Args:
            ticker: The ticker symbol
            group: The KPI group name
            timeframe: The timeframe for data
            
        Returns:
            Dictionary with KPI data for the group, or None if not implemented
        """
        # Return None for unimplemented groups
        if group not in IMPLEMENTED_KPI_GROUPS:
            logger.warning(f"KPI group '{group}' not implemented yet")
            return None
        
        logger.info(f"Fetching KPI group '{group}' for {ticker} with timeframe {timeframe}")
        
        # Fetch KPIs based on group
        if group == KPI_GROUP_PRICE:
            return get_all_price_metrics(ticker)
        elif group == KPI_GROUP_VOLUME:
            return get_all_volume_metrics(ticker, timeframe)
        elif group == KPI_GROUP_VOLATILITY:
            return get_all_volatility_metrics(ticker, timeframe)
        elif group == KPI_GROUP_FUNDAMENTAL:
            return get_all_fundamental_metrics(ticker)
        
        # Should not reach here if IMPLEMENTED_KPI_GROUPS is kept in sync
        logger.error(f"KPI group '{group}' is marked as implemented but has no handler")
        return None
    
    def get_kpis(
        self, 
        ticker: str, 
        kpi_groups: Optional[List[str]] = None, 
        timeframe: str = "1d",
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Get KPIs for a ticker based on specified groups.
        
        Args:
            ticker: The ticker symbol
            kpi_groups: List of KPI group names to fetch (if None, fetch all implemented groups)
            timeframe: Timeframe for data (e.g., "1d", "5d", "1mo")
            use_cache: Whether to use cached data if available
            
        Returns:
            Dictionary with KPI data organized by groups
        """
        # Sanitize the ticker
        ticker = sanitize_ticker(ticker)
        
        # Use all implemented groups if none specified
        if kpi_groups is None or len(kpi_groups) == 0:
            kpi_groups = IMPLEMENTED_KPI_GROUPS
            logger.debug(f"No KPI groups specified, using all implemented groups: {kpi_groups}")
        
        # Filter to only include valid and implemented groups
        valid_groups = [group for group in kpi_groups if group in AVAILABLE_KPI_GROUPS]
        if len(valid_groups) != len(kpi_groups):
            invalid_groups = set(kpi_groups) - set(valid_groups)
            logger.warning(f"Ignoring invalid KPI groups: {invalid_groups}")
        
        # Initialize result container
        result = {
            "ticker": ticker,
            "timeframe": timeframe,
            "kpi_groups": {},
            "timestamp": time.time(),
            "implemented_groups": IMPLEMENTED_KPI_GROUPS,
            "available_groups": AVAILABLE_KPI_GROUPS
        }
        
        # Check cache first if enabled
        if use_cache:
            cache_key = f"{ticker}_{timeframe}_{'-'.join(sorted(valid_groups))}"
            cached_data = self._get_from_cache(cache_key)
            if cached_data:
                return cached_data
        
        # Fetch each KPI group in parallel
        with concurrent.futures.ThreadPoolExecutor() as executor:
            # Create a future for each KPI group
            future_to_group = {
                executor.submit(self._fetch_kpi_group, ticker, group, timeframe): group
                for group in valid_groups if group in IMPLEMENTED_KPI_GROUPS
            }
            
            # Process results as they complete
            for future in concurrent.futures.as_completed(future_to_group):
                group = future_to_group[future]
                try:
                    kpi_data = future.result()
                    if kpi_data:
                        result["kpi_groups"][group] = kpi_data
                except Exception as e:
                    logger.error(f"Error fetching KPI group '{group}': {str(e)}")
                    result["kpi_groups"][group] = {
                        "error": str(e),
                        "group": group
                    }
        
        # For groups that are not yet implemented, add placeholder
        for group in valid_groups:
            if group not in IMPLEMENTED_KPI_GROUPS and group not in result["kpi_groups"]:
                result["kpi_groups"][group] = {
                    "group": group,
                    "status": "not_implemented",
                    "title": f"{group.title()} Metrics",
                    "description": f"This KPI group is not implemented yet"
                }
        
        # Store in cache
        if use_cache:
            cache_key = f"{ticker}_{timeframe}_{'-'.join(sorted(valid_groups))}"
            self._store_in_cache(cache_key, result)
        
        return result

# Create a singleton instance
_kpi_manager = None

def get_kpi_manager() -> KpiManager:
    """
    Get the singleton KpiManager instance.
    
    Returns:
        The KpiManager instance
    """
    global _kpi_manager
    if _kpi_manager is None:
        _kpi_manager = KpiManager()
    return _kpi_manager

def get_kpis(
    ticker: str, 
    kpi_groups: Optional[List[str]] = None, 
    timeframe: str = "1d",
    use_cache: bool = True
) -> Dict[str, Any]:
    """
    Get KPIs for a ticker based on specified groups.
    
    Args:
        ticker: The ticker symbol
        kpi_groups: List of KPI group names to fetch (if None, fetch all implemented groups)
        timeframe: Timeframe for data (e.g., "1d", "5d", "1mo")
        use_cache: Whether to use cached data if available
        
    Returns:
        Dictionary with KPI data organized by groups
    """
    manager = get_kpi_manager()
    return manager.get_kpis(ticker, kpi_groups, timeframe, use_cache)

# Export public functions
__all__ = [
    'get_kpis',
    'get_kpi_manager',
    'AVAILABLE_KPI_GROUPS',
    'KPI_GROUP_PRICE',
    'KPI_GROUP_VOLUME',
    'KPI_GROUP_VOLATILITY',
    'KPI_GROUP_FUNDAMENTAL',
    'KPI_GROUP_SENTIMENT'
]