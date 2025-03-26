// KpiCard.js

// ---------------------------------------------------------------------
// Import Statements
// ---------------------------------------------------------------------
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { logger } from '../../../utils/logger'; // Assuming path is correct
import KpiTooltip from './KpiTooltip'; // Assuming path is correct

// --- Fallback Logger ---
const safeLogger = {
  debug: (message) => console.log(`[DEBUG] ${message}`),
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
};
const log = typeof logger !== 'undefined' ? logger : safeLogger;

// ---------------------------------------------------------------------
// Styling Constants (Adapted from StockSettingsSidebar Theme)
// ---------------------------------------------------------------------

// COLORS - Primary palette
const PRIMARY_DARK = 'rgba(13, 27, 42, 1)';      // Dark blue
const PRIMARY_LIGHT = 'rgba(26, 42, 58, 1)';      // Light blue
const ACCENT_PRIMARY = 'rgba(92, 230, 207, 1)';   // Cyan
const TEXT_PRIMARY = 'rgba(248, 248, 248, 1)';    // White text
const TEXT_SECONDARY = 'rgba(204, 204, 204, 1)';   // Light gray text
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.3)';         // Slightly lighter shadow for cards

// CARD STYLING - Derived from theme
const CARD_BORDER_RADIUS = '4px'; // Consistent radius
const CARD_BG_COLOR = 'rgba(17, 34, 51, 0.8)'; // Similar to INPUT_BG_COLOR but slightly transparent
const CARD_HOVER_BG_COLOR = 'rgba(26, 42, 58, 0.9)'; // Close to PRIMARY_LIGHT
const CARD_BORDER = `1px solid rgba(92, 230, 207, 0.15)`; // Subtle accent border
const CARD_HOVER_BORDER = `1px solid rgba(92, 230, 207, 0.4)`; // Brighter border on hover
const CARD_SHADOW = `0 2px 5px ${SHADOW_COLOR}`;
const CARD_HOVER_SHADOW = `0 4px 8px ${SHADOW_COLOR}`;

// VALUE COLORS - Semantic colors
const POSITIVE_COLOR = '#4caf50'; // Keep standard green
const NEGATIVE_COLOR = '#f44336'; // Keep standard red
const NEUTRAL_COLOR = TEXT_SECONDARY; // Use secondary text color for neutral

// LOADING STATE - Theme-based colors
const LOADING_BG_BASE = 'rgba(26, 42, 58, 0.5)'; // PRIMARY_LIGHT base
const LOADING_BG_HIGHLIGHT = 'rgba(40, 60, 80, 0.6)'; // Lighter shade

// LAYOUT
const CARD_MIN_WIDTH = '140px';
const CARD_MAX_WIDTH = '200px'; // Adjust max width if needed
const CARD_HEIGHT = '90px'; // Slightly shorter height
const CARD_PADDING = '12px';


/**
 * KpiCard component for displaying an individual KPI, themed consistently.
 */
const KpiCard = React.memo(({
  kpi,
  isLoading = false,
  onClick = null,
  initialTooltipVisible = false, // Prop to control initial tooltip state
}) => {
  // --- State and Refs ---
  const [tooltipVisible, setTooltipVisible] = useState(initialTooltipVisible);
  const cardRef = useRef(null); // Ref to the card element for tooltip positioning
  const instanceId = useRef(`kpi-card-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`); // Unique ID for logging

  // --- Effects ---

  // Sync internal tooltip state with the initial prop value changes
  useEffect(() => {
    setTooltipVisible(initialTooltipVisible);
  }, [initialTooltipVisible]);

  // Log mount/unmount for debugging
  useEffect(() => {
    log.debug(`KpiCard: Mounted: ${kpi?.name || 'loading'} (${instanceId.current})`);
    return () => log.debug(`KpiCard: Unmounting: ${kpi?.name || 'loading'} (${instanceId.current})`);
  }, [kpi?.name]); // Dependency only on kpi.name

  // --- Data Handling and Formatting ---

  // Return null if no data and not loading
  if (!kpi && !isLoading) {
    log.warn(`KpiCard: Rendered with no KPI data and not loading (${instanceId.current})`);
    return null;
  }

  // Determine the color for the main KPI value based on its 'color' property or default
  const getValueColor = () => {
    if (isLoading) return NEUTRAL_COLOR; // Use neutral color while loading

    const valueInfo = kpi?.value; // Can be a simple value or an object like { formatted_value: '...', color: 'positive' }

    // Check for explicit color property in the value object
    if (typeof valueInfo === 'object' && valueInfo !== null) {
      if (valueInfo.color === 'positive') return POSITIVE_COLOR;
      if (valueInfo.color === 'negative') return NEGATIVE_COLOR;
    }

    // Fallback to neutral if no specific color is defined
    return NEUTRAL_COLOR;
  };

  // Format the KPI value for display, handling different data types
  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A'; // Handle null/undefined

    // If value is an object with a pre-formatted string, use it
    if (typeof value === 'object' && value.formatted_value) {
      return value.formatted_value;
    }

    // If it's an object without formatted_value, try to stringify (last resort)
    if (typeof value === 'object') {
      log.warn(`KpiCard: Complex value object without 'formatted_value' in KPI "${kpi?.name || 'unknown'}":`, value);
      try {
        // Basic stringify might not be ideal, consider specific formatting based on expected object structure
        return JSON.stringify(value);
      } catch (err) {
        log.error(`KpiCard: Error stringifying complex value for KPI "${kpi?.name || 'unknown'}":`, err);
        return 'Error'; // Indicate an error state
      }
    }

    // Otherwise, return the value directly (assuming string, number, etc.)
    return String(value);
  };

  // --- Event Handlers ---

  // Handle card click: Toggle tooltip and call onClick prop
  const handleClick = useCallback(() => {
    if (isLoading) return; // Ignore clicks while loading

    const newState = !tooltipVisible;
    log.debug(`KpiCard: Clicked: ${kpi?.name || 'unknown'} (${instanceId.current}), Toggle tooltip: ${newState}`);

    // Call the parent's onClick handler, passing the KPI data
    if (onClick && kpi) {
      onClick(kpi);
      // Note: Parent now controls the 'active' state via initialTooltipVisible prop,
      // so we don't directly setTooltipVisible(newState) here anymore.
      // Let the parent decide based on the click.
    }
  }, [isLoading, tooltipVisible, kpi, onClick]); // Dependencies for the callback

  // Handle closing the tooltip (called by KpiTooltip component)
  const handleCloseTooltip = useCallback(() => {
    log.debug(`KpiCard: Tooltip close requested for ${kpi?.name || 'unknown'} (${instanceId.current})`);
    // Only set internal state if it's currently visible
    if (tooltipVisible) {
       // If the card itself was controlling visibility, you'd set it here:
       // setTooltipVisible(false);

       // However, since the parent controls visibility via `initialTooltipVisible`,
       // we likely need to inform the parent that the *user* closed it,
       // potentially by calling onClick again or a dedicated onTooltipClose prop.
       // For now, assuming the parent handles the state change based on the initial click.
       if (onClick && kpi) {
         // Re-calling onClick might signify a 'deselect' action to the parent.
         // This depends on the parent's logic.
          onClick(kpi);
       }
    }
  }, [tooltipVisible, kpi, onClick]); // Dependencies

  // --- JSX Output ---
  return (
    <div
      className={`kpi-card ${isLoading ? 'loading' : ''}`} // Add loading class
      ref={cardRef}
      onClick={handleClick}
      title={!isLoading ? `Click for details on ${kpi?.name || 'KPI'}` : 'Loading KPI...'} // Add tooltip hint
    >
      {isLoading ? (
        // Loading state skeleton
        <div className="loading-state">
          <div className="loading-line name-loading"></div>
          <div className="loading-line value-loading"></div>
        </div>
      ) : (
        // Content when data is loaded
        <>
          <div className="kpi-name">{kpi?.name || 'N/A'}</div>
          <div className="kpi-value" style={{ color: getValueColor() }}>
            {formatValue(kpi?.value)}
          </div>

          {/* Tooltip is rendered conditionally based on the prop */}
          {tooltipVisible && kpi && (
            // Wrapper might not be strictly needed if KpiTooltip handles its own positioning well
            <div className="tooltip-wrapper">
              <KpiTooltip
                kpi={kpi}
                anchorEl={cardRef.current} // Anchor tooltip to the card div
                open={tooltipVisible}
                onClose={handleCloseTooltip} // Pass the close handler
                // Consider adding position prop if needed ('above', 'below', etc.)
                // position="above"
              />
            </div>
          )}
        </>
      )}

      {/* --- Styles (using theme constants) --- */}
      <style jsx>{`
        .kpi-card {
          position: relative; /* Needed for absolute positioning of tooltip wrapper */
          background-color: ${CARD_BG_COLOR};
          border-radius: ${CARD_BORDER_RADIUS};
          border: ${CARD_BORDER};
          padding: ${CARD_PADDING};
          min-width: ${CARD_MIN_WIDTH};
          max-width: ${CARD_MAX_WIDTH};
          height: ${CARD_HEIGHT};
          display: flex;
          flex-direction: column;
          justify-content: space-between; /* Space out name and value */
          box-shadow: ${CARD_SHADOW};
          transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          cursor: pointer;
          overflow: hidden; /* Clip content, tooltip needs separate handling/portal */
        }

        .kpi-card:hover {
          background-color: ${CARD_HOVER_BG_COLOR};
          border-color: ${CARD_HOVER_BORDER};
          transform: translateY(-2px);
          box-shadow: ${CARD_HOVER_SHADOW};
        }

        .kpi-name {
          font-size: 13px; /* Slightly smaller */
          font-weight: 500;
          color: ${TEXT_SECONDARY};
          margin-bottom: 6px; /* Reduced margin */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3; /* Ensure consistent line height */
        }

        .kpi-value {
          font-size: 19px; /* Slightly smaller */
          font-weight: 700; /* Bold */
          color: ${TEXT_PRIMARY}; /* Default color, overridden by inline style */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
          align-self: flex-start; /* Align value to the start */
          margin-top: auto; /* Push value towards the bottom */
        }

        .tooltip-wrapper {
          /* This wrapper might not be needed if KpiTooltip uses a Portal */
          /* If KpiTooltip is rendered directly here, it needs careful positioning */
          position: absolute;
          /* Example positioning: above the card */
          bottom: 105%; /* Position above the card */
          left: 50%;
          transform: translateX(-50%);
          z-index: 1050; /* Ensure tooltip is above other elements */
          /* Add pointer-events: none; if wrapper should not intercept clicks */
        }

        /* Loading state styles */
        .loading-state {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between; /* Space out loading lines */
        }

        .loading-line {
          /* Use theme colors for loading animation */
          background: linear-gradient(90deg, ${LOADING_BG_BASE} 25%, ${LOADING_BG_HIGHLIGHT} 50%, ${LOADING_BG_BASE} 75%);
          background-size: 200% 100%;
          animation: loading-animation 1.5s infinite linear; /* Use linear for smoother loop */
          border-radius: 2px;
        }

        .name-loading {
          width: 75%; /* Slightly shorter */
          height: 13px; /* Match kpi-name size */
          margin-bottom: 8px;
        }

        .value-loading {
          width: 55%; /* Slightly shorter */
          height: 19px; /* Match kpi-value size */
           margin-top: auto; /* Align to bottom like kpi-value */
        }

        /* Keyframes for loading animation */
        @keyframes loading-animation {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
});

// Ensure display name for easier debugging
KpiCard.displayName = 'KpiCard';

export default KpiCard; // Export the memoized component