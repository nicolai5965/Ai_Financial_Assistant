"""
Panel configuration system for organizing technical indicators in appropriate chart panels.

This module provides functionality to:
1. Categorize indicators based on their natural visualization properties
2. Organize selected indicators into logical panel groups
3. Configure multi-panel chart layouts for optimal display
"""

from typing import Dict, List, Any, Optional, Tuple
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from ..core.logging_config import get_logger

logger = get_logger()

# Define indicator categories and their default panel assignments
INDICATOR_METADATA = {
    # Price overlay indicators (displayed on main price chart)
    "SMA": {
        "display_category": "overlay",
        "default_panel": "main",
        "y_range": None,  # Uses price scale
        "description": "Simple Moving Average"
    },
    "EMA": {
        "display_category": "overlay",
        "default_panel": "main",
        "y_range": None,
        "description": "Exponential Moving Average"
    },
    "Bollinger Bands": {
        "display_category": "overlay",
        "default_panel": "main", 
        "y_range": None,
        "description": "Bollinger Bands"
    },
    "VWAP": {
        "display_category": "overlay",
        "default_panel": "main",
        "y_range": None,
        "description": "Volume Weighted Average Price"
    },
    "Ichimoku Cloud": {
        "display_category": "overlay",
        "default_panel": "main",
        "y_range": None,
        "description": "Ichimoku Cloud"
    },
    
    # Oscillator indicators (typically bounded, shown in separate panel)
    "RSI": {
        "display_category": "oscillator",
        "default_panel": "oscillator",
        "y_range": [0, 100],
        "reference_lines": [30, 70],  # Common oversold/overbought thresholds
        "description": "Relative Strength Index"
    },
    "Stochastic Oscillator": {
        "display_category": "oscillator",
        "default_panel": "oscillator",
        "y_range": [0, 100],
        "reference_lines": [20, 80],
        "description": "Stochastic Oscillator"
    },
    
    # Comparative indicators (showing relationships, differences)
    "MACD": {
        "display_category": "comparative",
        "default_panel": "macd",
        "y_range": None,  # Auto-scaled
        "description": "Moving Average Convergence Divergence"
    },
    
    # Volume-based indicators
    "OBV": {
        "display_category": "volume_based",
        "default_panel": "volume",
        "y_range": None,  # Auto-scaled
        "description": "On-Balance Volume"
    },
    "ATR": {
        "display_category": "volatility",
        "default_panel": "volatility",
        "y_range": None,  # Auto-scaled
        "description": "Average True Range"
    }
}

def get_indicator_metadata(indicator_name: str) -> Dict[str, Any]:
    """
    Get metadata for a specific indicator.
    
    Args:
        indicator_name: Name of the indicator or indicator object
        
    Returns:
        Dictionary of metadata about the indicator
    """
    # Extract the actual indicator name if an object was passed
    if not isinstance(indicator_name, str):
        if isinstance(indicator_name, dict) and 'name' in indicator_name:
            indicator_name = indicator_name['name']
        elif hasattr(indicator_name, 'name'):
            indicator_name = indicator_name.name
        else:
            logger.warning(f"Cannot extract name from indicator object: {type(indicator_name)}")
            return {
                "display_category": "unknown",
                "default_panel": "main",
                "y_range": None,
                "description": "Unknown Indicator"
            }
        
    return INDICATOR_METADATA.get(indicator_name, {
        "display_category": "unknown",
        "default_panel": "main",
        "y_range": None,
        "description": "Unknown Indicator"
    })

def organize_indicators_into_panels(indicators: List[Any]) -> Dict[str, List[Any]]:
    """
    Organize indicators into logical panel groups based on their categories.
    
    Args:
        indicators: List of indicator names or configurations
        
    Returns:
        Dictionary mapping panel names to lists of indicators
    """
    panels = {
        "main": [],
        "oscillator": [],
        "macd": [],
        "volume": [],
        "volatility": []
    }
    
    # Group indicators by their assigned or default panels
    for indicator in indicators:
        # Check if indicator has a custom panel assignment
        custom_panel = None
        indicator_name = None
        
        # Handle different indicator types
        if isinstance(indicator, str):
            # Simple string case
            indicator_name = indicator
        elif isinstance(indicator, dict) and 'name' in indicator:
            # Dictionary case
            indicator_name = indicator['name']
            if 'panel' in indicator:
                custom_panel = indicator['panel']
        elif hasattr(indicator, 'name'):
            # Pydantic model or object with name attribute
            indicator_name = indicator.name
            if hasattr(indicator, 'panel') and indicator.panel:
                custom_panel = indicator.panel
        else:
            logger.warning(f"Unrecognized indicator format: {type(indicator)}")
            continue
            
        # Use custom panel if provided, otherwise use default
        if custom_panel and custom_panel in panels:
            panel = custom_panel
            logger.debug(f"Using custom panel '{panel}' for indicator '{indicator_name}'")
        else:
            metadata = get_indicator_metadata(indicator_name)
            panel = metadata["default_panel"]
            logger.debug(f"Using default panel '{panel}' for indicator '{indicator_name}'")
        
        # Add to appropriate panel
        if panel in panels:
            panels[panel].append(indicator)
        else:
            # If panel doesn't exist, add to main
            logger.warning(f"Panel '{panel}' doesn't exist, adding '{indicator_name}' to main panel")
            panels["main"].append(indicator)
    
    # Remove empty panels
    return {panel: indicators for panel, indicators in panels.items() if indicators}

def calculate_panel_heights(panels: Dict[str, List[Any]]) -> List[float]:
    """
    Calculate appropriate height ratios for panels.
    
    Args:
        panels: Dictionary mapping panel names to lists of indicators
        
    Returns:
        List of height ratios for each panel
    """
    num_panels = len(panels)
    
    if num_panels == 0 or num_panels == 1:
        return [1.0]  # Single panel gets full height
    
    # Main panel gets 50% of space, others share remaining 50%
    if "main" in panels:
        main_ratio = 0.5
        other_ratio = 0.5 / (num_panels - 1)
        
        # Calculate ratios in order of panels
        panel_order = ["main"]
        for panel in panels:
            if panel != "main":
                panel_order.append(panel)
                
        return [main_ratio if panel == "main" else other_ratio for panel in panel_order]
    else:
        # Equal distribution if no main panel
        return [1.0 / num_panels] * num_panels

def create_panel_config(indicators: List[Any]) -> Tuple[Dict[str, List[Any]], Dict[str, Any]]:
    """
    Create a complete panel configuration based on selected indicators.
    
    Args:
        indicators: List of indicator names or configurations
        
    Returns:
        Tuple containing:
            - Dictionary mapping panel names to indicators
            - Dictionary with panel configuration details
    """
    # Organize indicators into panels
    panels = organize_indicators_into_panels(indicators)
    
    # Ensure we always have at least the main panel
    if not panels:
        logger.debug("No indicators assigned to panels, ensuring at least main panel exists")
        panels = {"main": []}
    
    # Calculate panel count and extract panel names in order
    panel_names = list(panels.keys())
    num_panels = len(panel_names)
    
    # Calculate panel heights
    heights = calculate_panel_heights(panels)
    
    # Create configuration object
    config = {
        "panel_names": panel_names,
        "num_panels": num_panels,
        "heights": heights,
        "shared_xaxes": True
    }
    
    logger.debug(f"Created panel configuration with {num_panels} panels: {panel_names}")
    
    return panels, config

def initialize_multi_panel_figure(panel_config: Dict[str, Any], ticker: str) -> go.Figure:
    """
    Initialize a multi-panel Plotly figure based on panel configuration.
    
    Args:
        panel_config: Panel configuration dictionary
        ticker: Stock ticker symbol
        
    Returns:
        Initialized Plotly Figure with proper subplot configuration
    """
    panel_names = panel_config["panel_names"]
    num_panels = panel_config["num_panels"]
    heights = panel_config["heights"]
    
    # Safety check - ensure we have a valid number of panels
    if num_panels <= 0:
        logger.warning("Invalid number of panels: %d. Defaulting to 1 panel.", num_panels)
        num_panels = 1
        panel_names = ["main"]
        heights = [1.0]
    
    # Create subplot titles
    subplot_titles = []
    for panel in panel_names:
        if panel == "main":
            subplot_titles.append(f"{ticker} Price Chart")
        elif panel == "oscillator":
            subplot_titles.append("Oscillators (0-100)")
        elif panel == "macd":
            subplot_titles.append("MACD")
        elif panel == "volume":
            subplot_titles.append("Volume Indicators")
        elif panel == "volatility":
            subplot_titles.append("Volatility")
        else:
            subplot_titles.append(panel.capitalize())
    
    # Log subplot creation details
    logger.debug("Creating subplots with %d panels: %s", num_panels, panel_names)
    logger.debug("Panel heights: %s", heights)
    
    # Create subplots
    try:
        fig = make_subplots(
            rows=num_panels,
            cols=1,
            shared_xaxes=True,
            vertical_spacing=0.03,
            row_heights=heights,
            subplot_titles=subplot_titles
        )
    except Exception as e:
        logger.error("Error creating subplots: %s. Falling back to single panel.", str(e))
        # Fallback to a single panel if subplot creation fails
        fig = go.Figure()
        return fig
    
    # Update layout for clean appearance
    fig.update_layout(
        height=max(300, 200 * num_panels),  # Dynamic height based on panel count
        showlegend=True,
        legend=dict(orientation="h", y=1.02, xanchor="right", x=1),
        margin=dict(l=50, r=50, t=50, b=50)
    )
    
    # Hide rangeslider on all but the bottom panel
    for i in range(1, num_panels):
        fig.update_xaxes(rangeslider_visible=False, row=i, col=1)
    
    # Set last panel to show rangeslider if there are multiple panels
    if num_panels > 1:
        fig.update_xaxes(rangeslider_visible=True, row=num_panels, col=1)
    
    # Add reference lines and set y-axis ranges for specific panel types
    for i, panel in enumerate(panel_names):
        row_idx = i + 1  # Convert to 1-indexed
        
        if panel == "oscillator":
            # Add reference lines at 30 and 70 for RSI
            fig.add_hline(y=30, line_dash="dash", line_color="red", row=row_idx, col=1, opacity=0.7)
            fig.add_hline(y=70, line_dash="dash", line_color="red", row=row_idx, col=1, opacity=0.7)
            # Also add 50 line
            fig.add_hline(y=50, line_dash="dash", line_color="gray", row=row_idx, col=1, opacity=0.5)
            # Set y-axis range for oscillator panel
            fig.update_yaxes(range=[0, 100], row=row_idx, col=1, title_text="Oscillator Value")
            
        elif panel == "macd":
            # Add a zero line for MACD
            fig.add_hline(y=0, line_dash="solid", line_color="gray", row=row_idx, col=1, opacity=0.7)
            fig.update_yaxes(title_text="MACD Value", row=row_idx, col=1)
            
        elif panel == "volume":
            fig.update_yaxes(title_text="Volume", row=row_idx, col=1)
            
        elif panel == "volatility":
            fig.update_yaxes(title_text="Volatility", row=row_idx, col=1)
            
        elif panel == "main":
            fig.update_yaxes(title_text="Price", row=row_idx, col=1)
    
    # Set basic template - can be customized based on user preference
    fig.update_layout(template="plotly_dark")
    
    return fig 