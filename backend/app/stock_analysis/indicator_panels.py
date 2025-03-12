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

# Default metadata for unknown indicators
DEFAULT_INDICATOR_METADATA = {
    "display_category": "unknown",
    "default_panel": "main",
    "y_range": None,
    "description": "Unknown Indicator"
}

def extract_indicator_name(indicator: Any) -> str:
    """
    Extract the name from an indicator object regardless of its type.
    
    Args:
        indicator: Indicator object (string, dict, or object with name attribute)
        
    Returns:
        Extracted indicator name as string
    """
    if isinstance(indicator, str):
        return indicator
    elif isinstance(indicator, dict) and 'name' in indicator:
        return indicator['name']
    elif hasattr(indicator, 'name'):
        return indicator.name
    else:
        logger.warning(f"Cannot extract name from indicator object: {type(indicator)}")
        return "unknown"

def extract_custom_panel(indicator: Any) -> Optional[str]:
    """
    Extract custom panel assignment from an indicator object if available.
    
    Args:
        indicator: Indicator object (dict or object with panel attribute)
        
    Returns:
        Custom panel name or None if not specified
    """
    if isinstance(indicator, dict) and 'panel' in indicator:
        return indicator['panel']
    elif hasattr(indicator, 'panel') and indicator.panel:
        return indicator.panel
    return None

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
        indicator_name = extract_indicator_name(indicator_name)
        
    return INDICATOR_METADATA.get(indicator_name, DEFAULT_INDICATOR_METADATA)

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
        # Extract indicator name and any custom panel assignment
        indicator_name = extract_indicator_name(indicator)
        custom_panel = extract_custom_panel(indicator)
            
        # Use custom panel if provided, otherwise use default from metadata
        if custom_panel and custom_panel in panels:
            panel = custom_panel
            logger.debug(f"Using custom panel '{panel}' for indicator '{indicator_name}'")
        else:
            metadata = get_indicator_metadata(indicator_name)
            panel = metadata["default_panel"]
            logger.debug(f"Using default panel '{panel}' for indicator '{indicator_name}'")
        
        # Add to appropriate panel, defaulting to main if panel doesn't exist
        if panel in panels:
            panels[panel].append(indicator)
        else:
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
    
    if num_panels <= 1:
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
    
    # Extract panel names and calculate configuration parameters
    panel_names = list(panels.keys())
    num_panels = len(panel_names)
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

def get_panel_title(panel_name: str, ticker: str = None) -> str:
    """
    Get an appropriate title for a panel based on its type.
    
    Args:
        panel_name: Name of the panel
        ticker: Optional ticker symbol for main panel
        
    Returns:
        Formatted panel title
    """
    panel_titles = {
        "main": f"{ticker} Price Chart" if ticker else "Price Chart",
        "oscillator": "Oscillators (0-100)",
        "macd": "MACD",
        "volume": "Volume Indicators",
        "volatility": "Volatility"
    }
    
    return panel_titles.get(panel_name, panel_name.capitalize())

def configure_panel_axes(fig: go.Figure, panel_name: str, row_idx: int) -> None:
    """
    Configure the axes for a specific panel type.
    
    Args:
        fig: Plotly figure object
        panel_name: Name of the panel
        row_idx: Row index (1-indexed) for the panel
    """
    # Add reference lines and set y-axis configurations based on panel type
    if panel_name == "oscillator":
        # Add reference lines at 30 and 70 for RSI
        fig.add_hline(y=30, line_dash="dash", line_color="red", row=row_idx, col=1, opacity=0.7)
        fig.add_hline(y=70, line_dash="dash", line_color="red", row=row_idx, col=1, opacity=0.7)
        fig.add_hline(y=50, line_dash="dash", line_color="gray", row=row_idx, col=1, opacity=0.5)
        # Set y-axis range for oscillator panel
        fig.update_yaxes(range=[0, 100], row=row_idx, col=1, title_text="Oscillator Value")
        
    elif panel_name == "macd":
        # Add a zero line for MACD
        fig.add_hline(y=0, line_dash="solid", line_color="gray", row=row_idx, col=1, opacity=0.7)
        fig.update_yaxes(title_text="MACD Value", row=row_idx, col=1)
        
    elif panel_name == "volume":
        fig.update_yaxes(title_text="Volume", row=row_idx, col=1)
        
    elif panel_name == "volatility":
        fig.update_yaxes(title_text="Volatility", row=row_idx, col=1)
        
    elif panel_name == "main":
        fig.update_yaxes(title_text="Price", row=row_idx, col=1)

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
    subplot_titles = [get_panel_title(panel, ticker) for panel in panel_names]
    
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
        showlegend=True,
        legend=dict(orientation="h", y=1.02, xanchor="right", x=1),
        margin=dict(l=50, r=50, t=50, b=50),
        template="plotly_dark"  # Set basic template
    )
    
    # Configure rangeslider visibility
    for i in range(1, num_panels):
        fig.update_xaxes(rangeslider_visible=False, row=i, col=1)
    
    # Set last panel to show rangeslider if there are multiple panels
    if num_panels > 1:
        fig.update_xaxes(rangeslider_visible=True, row=num_panels, col=1)
    
    # Configure each panel's axes
    for i, panel in enumerate(panel_names):
        row_idx = i + 1  # Convert to 1-indexed
        configure_panel_axes(fig, panel, row_idx)
    
    return fig 