# DEPRECATED: This file is deprecated and will be removed in a future version.
# Please use the new modular structure:
# - stock_data_fetcher.py: For data fetching and cleaning
# - stock_indicators.py: For technical indicator calculations  
# - stock_data_charting.py: For chart building and visualization
#
# This file is kept for backward compatibility only.

import warnings

warnings.warn(
    "The stock_analysis.py module is deprecated. Please use the new modular structure instead.",
    DeprecationWarning,
    stacklevel=2
)

# Import from the new structure to maintain backward compatibility
from .stock_data_fetcher import fetch_stock_data, filter_market_hours
from .stock_data_charting import analyze_ticker

# Keep the main function for backward compatibility
if __name__ == "__main__":
    from .stock_data_charting import main
    main()
    

