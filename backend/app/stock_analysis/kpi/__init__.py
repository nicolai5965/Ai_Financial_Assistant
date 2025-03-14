"""
KPI (Key Performance Indicators) package for stock analysis.

This package provides functions for calculating various KPIs related to stocks,
including price metrics, volume metrics, volatility metrics, fundamentals, and
sentiment analysis.
"""

from app.stock_analysis.kpi.price_metrics import (
    get_current_price,
    get_price_changes,
    get_day_high_low,
    get_open_price,
    get_previous_close,
    get_all_price_metrics
)

from app.stock_analysis.kpi.volume_metrics import (
    get_current_volume,
    get_average_volume,
    get_volume_ratio,
    get_relative_volume,
    get_all_volume_metrics
)

from app.stock_analysis.kpi.volatility_metrics import (
    get_52_week_high_low,
    get_historical_volatility,
    get_beta,
    get_average_true_range,
    get_bollinger_band_width,
    get_all_volatility_metrics
)

from app.stock_analysis.kpi.fundamental_metrics import (
    get_market_cap,
    get_pe_ratio,
    get_eps,
    get_dividend_yield,
    get_debt_to_equity,
    get_roe,
    get_price_to_book,
    get_price_to_sales,
    get_all_fundamental_metrics
)

# Define the public API
__all__ = [
    # Price metrics
    'get_current_price',
    'get_price_changes',
    'get_day_high_low',
    'get_open_price',
    'get_previous_close',
    'get_all_price_metrics',
    
    # Volume metrics
    'get_current_volume',
    'get_average_volume',
    'get_volume_ratio',
    'get_relative_volume',
    'get_all_volume_metrics',
    
    # Volatility metrics
    'get_52_week_high_low',
    'get_historical_volatility',
    'get_beta',
    'get_average_true_range',
    'get_bollinger_band_width',
    'get_all_volatility_metrics',
    
    # Fundamental metrics
    'get_market_cap',
    'get_pe_ratio',
    'get_eps',
    'get_dividend_yield',
    'get_debt_to_equity',
    'get_roe',
    'get_price_to_book',
    'get_price_to_sales',
    'get_all_fundamental_metrics',
]