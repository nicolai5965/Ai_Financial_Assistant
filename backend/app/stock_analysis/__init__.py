"""
Stock Analysis Package

This package provides functionality for fetching, analyzing, and visualizing stock data.

Core functionality includes:
- Fetching historical stock data from Yahoo Finance
- Calculating and visualizing technical indicators
- Building interactive candlestick and line charts using Plotly
- Tracking market hours and trading schedules for different exchanges
"""

# Make the core functions available at the package level
from .stock_data_fetcher import fetch_stock_data, get_market_hours
from .stock_indicators import add_indicator_to_chart
from .stock_data_charting import analyze_ticker, build_candlestick_chart, build_line_chart
from .market_hours import MarketHoursTracker

# Define the package's public API
__all__ = [
    'fetch_stock_data',
    'get_market_hours',
    'add_indicator_to_chart',
    'analyze_ticker',
    'build_candlestick_chart',
    'build_line_chart',
    'MarketHoursTracker'
] 