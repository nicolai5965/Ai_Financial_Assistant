"""
Stock Analysis Package

This package provides functionality for fetching, analyzing, and visualizing stock data.

Core functionality includes:
- Fetching historical stock data from Yahoo Finance
- Filtering market hours data for accurate analysis
- Calculating and visualizing technical indicators
- Building interactive candlestick and line charts using Plotly

The package is structured into three main modules:
- stock_data_fetcher.py: Handles fetching and cleaning stock data
- stock_indicators.py: Contains functions for calculating technical indicators
- stock_data_charting.py: Builds charts (candlestick or line) and manages visualizations
"""

# Make the core functions available at the package level
from .stock_data_fetcher import fetch_stock_data, filter_market_hours, get_market_hours
from .stock_indicators import add_indicator_to_chart
from .stock_data_charting import analyze_ticker, build_candlestick_chart, build_line_chart

# Define the package's public API
__all__ = [
    'fetch_stock_data',
    'filter_market_hours',
    'get_market_hours',
    'add_indicator_to_chart',
    'analyze_ticker',
    'build_candlestick_chart',
    'build_line_chart'
] 