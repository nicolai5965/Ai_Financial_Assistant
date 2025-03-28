// KpiTooltip.js

// ---------------------------------------------------------------------
// Import Statements
// ---------------------------------------------------------------------
import React, { useState, useEffect, useRef } from 'react';
import { logger } from '../../../utils/logger'; // Assuming path is correct

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
// const PRIMARY_LIGHT = 'rgba(26, 42, 58, 1)';      // Light blue (Not directly used here)
const ACCENT_PRIMARY = 'rgba(92, 230, 207, 1)';   // Cyan
// const ACCENT_HOVER = 'rgba(59, 205, 186, 1)';     // Darker cyan (Not used directly here)
const TEXT_PRIMARY = 'rgba(248, 248, 248, 1)';    // White text
const TEXT_SECONDARY = 'rgba(204, 204, 204, 1)';   // Light gray text
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.6)';         // Slightly darker shadow for tooltip

// TOOLTIP STYLING
const TOOLTIP_BG_COLOR = `rgba(13, 27, 42, 0.97)`; // Use PRIMARY_DARK with high opacity
const TOOLTIP_BORDER = `1px solid rgba(92, 230, 207, 0.3)`; // Use theme accent border
const TOOLTIP_BORDER_COLOR_VAL = 'rgba(92, 230, 207, 0.3)'; // Border color value for arrows
const TOOLTIP_BORDER_RADIUS = '6px'; // Consistent radius
const TOOLTIP_SHADOW = `0 5px 20px ${SHADOW_COLOR}`;
const TOOLTIP_PADDING = '14px'; // Slightly more padding
const TOOLTIP_WIDTH = '290px'; // Slightly wider
const TOOLTIP_Z_INDEX = 1100; // Ensure above modal overlays if needed

// TEXT & CONTENT
const TOOLTIP_TEXT_COLOR = TEXT_PRIMARY;
const TOOLTIP_SECONDARY_COLOR = TEXT_SECONDARY;
const TOOLTIP_TITLE_COLOR = ACCENT_PRIMARY; // Use accent for title
const SECTION_BORDER_COLOR = 'rgba(92, 230, 207, 0.15)'; // Fainter border for internal sections

// TREND COLORS
const POSITIVE_COLOR = '#4caf50'; // Keep standard green
const NEGATIVE_COLOR = '#f44336'; // Keep standard red
const NEUTRAL_COLOR = TEXT_SECONDARY; // Use secondary text color for neutral
const POSITIVE_BG = `rgba(76, 175, 80, 0.15)`;
const NEGATIVE_BG = `rgba(244, 67, 54, 0.15)`;
const NEUTRAL_BG = `rgba(204, 204, 204, 0.1)`;

// CLOSE BUTTON
const CLOSE_BUTTON_BG = 'rgba(0, 0, 0, 0.3)';
const CLOSE_BUTTON_HOVER_BG = 'rgba(92, 230, 207, 0.2)';
const CLOSE_BUTTON_COLOR = TEXT_SECONDARY;
const CLOSE_BUTTON_HOVER_COLOR = TEXT_PRIMARY;

// POSITIONING CONSTANTS (Keep as is)
const POSITION_ABOVE = 'above';
const POSITION_BELOW = 'below';
const POSITION_LEFT = 'left';
const POSITION_RIGHT = 'right';
const TOOLTIP_OFFSET = 10; // Distance from anchor
const VIEWPORT_MARGIN = 10; // Minimum distance from viewport edge


/**
 * KpiTooltip component for displaying detailed explanations and contextual information
 * about Key Performance Indicators (KPIs), styled with the application theme.
 * Description and context come directly from the `kpi.description` field provided by the backend.
 */
const KpiTooltip = ({
  kpi,
  anchorEl, // The element the tooltip is anchored to
  open,     // Boolean controlling visibility
  onClose,  // Callback function to close the tooltip
  position = POSITION_ABOVE, // Preferred position ('above', 'below', 'left', 'right')
  className = '',          // Optional additional class names
}) => {
  // --- State and Refs ---
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 }); // Calculated {top, left} in pixels
  const [computedPosition, setComputedPosition] = useState(position); // Actual position used after collision detection
  const [isPositioned, setIsPositioned] = useState(false); // Flag to trigger fade-in after position calculation
  const tooltipRef = useRef(null); // Ref to the tooltip's root element
  const instanceId = useRef(`kpi-tooltip-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`); // Unique ID for logging

  // --- Effects ---

  // Log opening/closing
  useEffect(() => {
    if (open) {
      log.debug(`KpiTooltip: Opened: ${kpi?.name || 'unknown'} (${instanceId.current})`);
      // console.log(`KpiTooltip opened for: ${kpi?.name || 'unknown'}, kpi data:`, kpi); // Verbose log if needed
    }
    // No cleanup log needed here as it's tied to 'open' state
  }, [open, kpi?.name]);

  // Close tooltip on Escape key press
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && open && onClose) {
        log.debug(`KpiTooltip: Closing via Escape key (${instanceId.current})`);
        onClose();
      }
    };
    if (open) {
      document.addEventListener('keydown', handleEscKey, { passive: true });
    }
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [open, onClose]);

  // Close tooltip on click outside the tooltip and its anchor element
  useEffect(() => {
    const handleOutsideClick = (event) => {
      // Check if the click is outside the tooltip AND outside the anchor element
      if (
        open &&
        tooltipRef.current && !tooltipRef.current.contains(event.target) &&
        anchorEl && !anchorEl.contains(event.target) &&
        onClose
      ) {
        log.debug(`KpiTooltip: Closing via outside click (${instanceId.current})`);
        onClose();
      }
    };
    if (open) {
      // Use mousedown for better responsiveness, especially on touch devices
      document.addEventListener('mousedown', handleOutsideClick, { passive: true });
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [open, anchorEl, onClose]);

  // Calculate and update tooltip position when relevant props/state change
  useEffect(() => {
    // Only calculate if open and anchor element exists
    if (!open || !anchorEl) {
        setIsPositioned(false); // Reset positioned state if closed or no anchor
        return;
    }

    let isMounted = true; // Flag to prevent state updates on unmounted component

    const calculatePosition = () => {
      if (!isMounted || !tooltipRef.current || !anchorEl) return; // Exit if unmounted or refs invalid

      const anchorRect = anchorEl.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Default to preferred position
      let bestPosition = position;

      // --- Collision Detection and Position Adjustment ---
      const fitsAbove = anchorRect.top > tooltipRect.height + TOOLTIP_OFFSET + VIEWPORT_MARGIN;
      const fitsBelow = windowHeight - anchorRect.bottom > tooltipRect.height + TOOLTIP_OFFSET + VIEWPORT_MARGIN;
      const spaceLeft = anchorRect.left;
      const spaceRight = windowWidth - anchorRect.right;
      const centeredLeftFits = spaceLeft > (tooltipRect.width / 2) + VIEWPORT_MARGIN && spaceRight > (tooltipRect.width / 2) + VIEWPORT_MARGIN;
      const fitsLeftAligned = spaceLeft > VIEWPORT_MARGIN && spaceRight > tooltipRect.width - anchorRect.width + VIEWPORT_MARGIN;
      const fitsRightAligned = spaceLeft > tooltipRect.width - anchorRect.width + VIEWPORT_MARGIN && spaceRight > VIEWPORT_MARGIN;

      // Try to find a better position if the preferred one doesn't fit well
      if (bestPosition === POSITION_ABOVE && !fitsAbove) {
        bestPosition = fitsBelow ? POSITION_BELOW : (fitsRightAligned ? POSITION_RIGHT : POSITION_LEFT);
      } else if (bestPosition === POSITION_BELOW && !fitsBelow) {
        bestPosition = fitsAbove ? POSITION_ABOVE : (fitsRightAligned ? POSITION_RIGHT : POSITION_LEFT);
      } else if (bestPosition === POSITION_LEFT && spaceLeft < tooltipRect.width + TOOLTIP_OFFSET + VIEWPORT_MARGIN) {
          bestPosition = (spaceRight > tooltipRect.width + TOOLTIP_OFFSET + VIEWPORT_MARGIN) ? POSITION_RIGHT : (fitsAbove ? POSITION_ABOVE : POSITION_BELOW);
      } else if (bestPosition === POSITION_RIGHT && spaceRight < tooltipRect.width + TOOLTIP_OFFSET + VIEWPORT_MARGIN) {
          bestPosition = (spaceLeft > tooltipRect.width + TOOLTIP_OFFSET + VIEWPORT_MARGIN) ? POSITION_LEFT : (fitsAbove ? POSITION_ABOVE : POSITION_BELOW);
      }
      // Add specific check for centered horizontal positioning if possible
      const canCenterHorizontally = (bestPosition === POSITION_ABOVE || bestPosition === POSITION_BELOW) && centeredLeftFits;

      // --- Calculate Coordinates ---
      let top = 0, left = 0;

      switch (bestPosition) {
        case POSITION_ABOVE:
          top = anchorRect.top - tooltipRect.height - TOOLTIP_OFFSET;
          left = canCenterHorizontally
                ? anchorRect.left + (anchorRect.width / 2) - (tooltipRect.width / 2)
                : (fitsLeftAligned ? anchorRect.left : anchorRect.right - tooltipRect.width); // Align left or right edge
          break;
        case POSITION_BELOW:
          top = anchorRect.bottom + TOOLTIP_OFFSET;
           left = canCenterHorizontally
                ? anchorRect.left + (anchorRect.width / 2) - (tooltipRect.width / 2)
                : (fitsLeftAligned ? anchorRect.left : anchorRect.right - tooltipRect.width); // Align left or right edge
          break;
        case POSITION_LEFT:
          top = anchorRect.top + (anchorRect.height / 2) - (tooltipRect.height / 2);
          left = anchorRect.left - tooltipRect.width - TOOLTIP_OFFSET;
          break;
        case POSITION_RIGHT:
          top = anchorRect.top + (anchorRect.height / 2) - (tooltipRect.height / 2);
          left = anchorRect.right + TOOLTIP_OFFSET;
          break;
        default: // Fallback to above if position is invalid
           top = anchorRect.top - tooltipRect.height - TOOLTIP_OFFSET;
           left = anchorRect.left + (anchorRect.width / 2) - (tooltipRect.width / 2);
           bestPosition = POSITION_ABOVE;
           break;
      }

      // --- Viewport Boundary Correction ---
      left = Math.max(VIEWPORT_MARGIN, Math.min(windowWidth - tooltipRect.width - VIEWPORT_MARGIN, left));
      top = Math.max(VIEWPORT_MARGIN, Math.min(windowHeight - tooltipRect.height - VIEWPORT_MARGIN, top));

      // --- Update State ---
       if (isMounted) {
            setTooltipPosition({ top, left });
            setComputedPosition(bestPosition);
            setIsPositioned(true); // Allow fade-in
            // log.debug(`KpiTooltip: Position calculated - ${bestPosition}, top: ${top}, left: ${left} (${instanceId.current})`); // Verbose log if needed
       }
    };

    // Recalculate position immediately and on window resize
    // Use requestAnimationFrame to ensure layout is stable before first calculation
    let rafId = requestAnimationFrame(() => {
        calculatePosition();
    });
    window.addEventListener('resize', calculatePosition, { passive: true });
    window.addEventListener('scroll', calculatePosition, { passive: true, capture: true }); // Recalculate on scroll too

    // Cleanup function
    return () => {
      isMounted = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, { capture: true });
    };
  }, [open, anchorEl, position]); // Dependencies for position calculation

  // --- Content Rendering ---

  // Renders the tooltip content using data exclusively from the kpi prop
  const renderTooltipContent = () => {
    // Check if kpi data is valid
    if (!kpi) {
      log.warn(`KpiTooltip: renderTooltipContent called with null or undefined kpi (${instanceId.current})`);
      return <div className="tooltip-content">No KPI data available.</div>;
    }

    return (
      <div className="tooltip-content">
        {/* Header: Title and Formatted Value */}
        <div className="tooltip-header">
          {/* Display KPI name or a fallback */}
          <h3 className="tooltip-title">{kpi.name || 'Unknown KPI'}</h3>
          {/* Display formatted value if available */}
          {kpi.value !== undefined && kpi.value !== null && (
            <div className="tooltip-value">
              {/* Prioritize formatted_value if the value is an object */}
              {typeof kpi.value === 'object' && kpi.value.formatted_value
                ? kpi.value.formatted_value
                : typeof kpi.value === 'object'
                  ? JSON.stringify(kpi.value) // Fallback for objects without formatted_value
                  : String(kpi.value)} {/* Render other types as strings */}
            </div>
          )}
        </div>

        {/* Description - Directly from the backend kpi object */}
        {kpi.description && (
          <div className="tooltip-description">
            {kpi.description}
          </div>
        )}

        {/* Trend Indicator */}
        {/* Check for trend existence (including 0) */}
        {kpi.trend !== undefined && kpi.trend !== null && (
          <div className={`tooltip-trend ${kpi.trend > 0 ? 'positive' : kpi.trend < 0 ? 'negative' : 'neutral'}`}>
            <span className="trend-icon">
              {/* Use appropriate icons for trend direction */}
              {kpi.trend > 0 ? '▲' : kpi.trend < 0 ? '▼' : '–'}
            </span>
            <span className="trend-label">
              {/* Display trend_label if provided, otherwise format the trend value as percentage */}
              {kpi.trend_label || `${Math.abs(kpi.trend * 100).toFixed(1)}%`}
            </span>
          </div>
        )}

        {/* --- REMOVED CONTEXTUAL INFO SECTIONS --- */}
        {/* The specific sections based on kpi.group (renderPriceInfo, etc.) are removed */}
        {/* All necessary contextual information should now be included in the kpi.description from the backend */}

        {/* Secondary Value Display */}
        {/* Check if secondary_value exists */}
        {kpi.secondary_value !== undefined && kpi.secondary_value !== null && (
          <div className="tooltip-secondary">
            {/* Display secondary_label or a default */}
            <span className="secondary-label">{kpi.secondary_label || 'Info'}: </span>
            <span className="secondary-value">
              {/* Format secondary value similar to primary value */}
              {typeof kpi.secondary_value === 'object' && kpi.secondary_value.formatted_value
                ? kpi.secondary_value.formatted_value
                : typeof kpi.secondary_value === 'object'
                  ? JSON.stringify(kpi.secondary_value) // Fallback for objects
                  : String(kpi.secondary_value)} {/* Render other types as strings */}
            </span>
          </div>
        )}
      </div>
    );
  };

  // --- Helper Render Functions for Contextual Info ---
  // REMOVED: renderPriceInfo, renderVolumeInfo, renderVolatilityInfo,
  // renderFundamentalInfo, renderSentimentInfo functions are deleted
  // as this logic is now handled by the backend providing the description.

  // Determine the CSS class for the arrow based on the computed position
  const getArrowClass = () => {
    switch (computedPosition) {
      case POSITION_ABOVE: return 'arrow-bottom';
      case POSITION_BELOW: return 'arrow-top';
      case POSITION_LEFT: return 'arrow-right';
      case POSITION_RIGHT: return 'arrow-left';
      default: return ''; // Should not happen
    }
  };

  // CSS class to control visibility and fade-in animation
  const visibilityClass = isPositioned ? 'visible' : '';

  // --- Render Tooltip ---
  // Render null if not open or no KPI data
  if (!open || !kpi) {
    return null;
  }

  return (
    <div
      className={`kpi-tooltip ${className} ${getArrowClass()} ${visibilityClass}`}
      style={{
        top: `${tooltipPosition.top}px`, // Apply calculated position
        left: `${tooltipPosition.left}px`,
        zIndex: TOOLTIP_Z_INDEX, // Ensure it's above most other elements
      }}
      ref={tooltipRef}
      // Prevent clicks inside the tooltip from triggering the outside click handler
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()} // Also stop mousedown propagation
      role="tooltip" // Accessibility role
      aria-hidden={!open}
    >
      {/* Render the main content */}
      {renderTooltipContent()}

      {/* Close button */}
      <button
        className="close-button"
        onClick={onClose}
        aria-label="Close tooltip"
        title="Close"
      >×</button>

      {/* --- Styles (using theme constants) --- */}
      <style jsx>{`
        .kpi-tooltip {
          position: fixed; /* Use fixed positioning */
          width: ${TOOLTIP_WIDTH};
          background-color: ${TOOLTIP_BG_COLOR};
          color: ${TOOLTIP_TEXT_COLOR};
          border: ${TOOLTIP_BORDER};
          border-radius: ${TOOLTIP_BORDER_RADIUS};
          box-shadow: ${TOOLTIP_SHADOW};
          padding: ${TOOLTIP_PADDING};
          z-index: ${TOOLTIP_Z_INDEX};
          font-size: 14px; /* Base font size */
          line-height: 1.5; /* Improve readability */

          /* Visibility and Animation */
          opacity: 0;
          visibility: hidden;
          transform: translateY(5px); /* Start slightly lower for fade-up */
          transition: opacity 0.2s ease-out, transform 0.2s ease-out, visibility 0s 0.2s; /* Delay visibility change */
          pointer-events: none; /* Prevent interaction when hidden */
        }

        .kpi-tooltip.visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
          transition: opacity 0.2s ease-out, transform 0.2s ease-out, visibility 0s 0s; /* Show immediately */
          pointer-events: auto; /* Allow interaction when visible */
        }

        .close-button {
          position: absolute;
          top: 8px; /* Adjust position */
          right: 8px;
          width: 24px; /* Slightly larger hit area */
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${CLOSE_BUTTON_BG};
          border: none;
          border-radius: 50%;
          color: ${CLOSE_BUTTON_COLOR};
          font-size: 20px; /* Adjust icon size */
          line-height: 1;
          cursor: pointer;
          padding: 0;
          transition: background-color 0.2s, color 0.2s, transform 0.1s;
        }

        .close-button:hover {
          background: ${CLOSE_BUTTON_HOVER_BG};
          color: ${CLOSE_BUTTON_HOVER_COLOR};
          transform: scale(1.1);
        }

        /* Arrow Styles */
        .kpi-tooltip::before { /* Common arrow base */
          content: '';
          position: absolute;
          border-style: solid;
          border-color: transparent; /* Fallback */
        }
        .arrow-top::before {
          top: -${TOOLTIP_OFFSET}px; /* Position above tooltip */
          left: 50%;
          transform: translateX(-50%);
          border-width: 0 ${TOOLTIP_OFFSET}px ${TOOLTIP_OFFSET}px; /* Pointing down */
          border-bottom-color: ${TOOLTIP_BORDER_COLOR_VAL}; /* Match border */
        }
        .arrow-bottom::before {
          bottom: -${TOOLTIP_OFFSET}px; /* Position below tooltip */
          left: 50%;
          transform: translateX(-50%);
          border-width: ${TOOLTIP_OFFSET}px ${TOOLTIP_OFFSET}px 0; /* Pointing up */
          border-top-color: ${TOOLTIP_BORDER_COLOR_VAL}; /* Match border */
        }
        .arrow-left::before {
          left: -${TOOLTIP_OFFSET}px; /* Position left of tooltip */
          top: 50%;
          transform: translateY(-50%);
          border-width: ${TOOLTIP_OFFSET}px ${TOOLTIP_OFFSET}px ${TOOLTIP_OFFSET}px 0; /* Pointing right */
          border-right-color: ${TOOLTIP_BORDER_COLOR_VAL}; /* Match border */
        }
        .arrow-right::before {
          right: -${TOOLTIP_OFFSET}px; /* Position right of tooltip */
          top: 50%;
          transform: translateY(-50%);
          border-width: ${TOOLTIP_OFFSET}px 0 ${TOOLTIP_OFFSET}px ${TOOLTIP_OFFSET}px; /* Pointing left */
          border-left-color: ${TOOLTIP_BORDER_COLOR_VAL}; /* Match border */
        }

        /* Content Styles */
        .tooltip-content {
          display: flex;
          flex-direction: column;
          gap: 10px; /* Space between elements */
        }

        .tooltip-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline; /* Align baseline of title and value */
          padding-right: 30px; /* Ensure space for close button */
          border-bottom: 1px solid ${SECTION_BORDER_COLOR};
          padding-bottom: 8px;
          margin-bottom: 4px; /* Space below header */
        }

        .tooltip-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: ${TOOLTIP_TITLE_COLOR}; /* Use accent for title */
          letter-spacing: 0.3px;
        }

        .tooltip-value {
          font-weight: 700;
          font-size: 16px;
          color: ${TOOLTIP_TEXT_COLOR}; /* Use primary text color */
          white-space: nowrap; /* Prevent wrapping */
        }

        .tooltip-description {
          margin: 0;
          font-size: 14px;
          color: ${TOOLTIP_SECONDARY_COLOR};
        }

        .tooltip-trend {
          display: inline-flex; /* Use inline-flex */
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          width: fit-content; /* Only as wide as needed */
        }
        .tooltip-trend.positive { background-color: ${POSITIVE_BG}; color: ${POSITIVE_COLOR}; }
        .tooltip-trend.negative { background-color: ${NEGATIVE_BG}; color: ${NEGATIVE_COLOR}; }
        .tooltip-trend.neutral { background-color: ${NEUTRAL_BG}; color: ${NEUTRAL_COLOR}; }
        .trend-icon { font-size: 14px; }

        /* Contextual Info Sections (removed, styles left for reference/cleanup if needed) */
        /*
        .tooltip-info-section {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid ${SECTION_BORDER_COLOR};
          font-size: 13px;
          color: ${TOOLTIP_SECONDARY_COLOR};
        }
        .tooltip-info-section p { margin: 0 0 8px; }

        .tooltip-scale {
          margin: 8px 0 0;
          padding: 0;
          list-style: none;
          font-size: 12px;
        }
        .tooltip-scale li { margin-bottom: 4px; padding-left: 16px; position: relative; }
        .tooltip-scale li::before { content: '•'; position: absolute; left: 4px; font-size: 14px; line-height: 1; }
        .tooltip-scale li.positive { color: ${POSITIVE_COLOR}; }
        .tooltip-scale li.negative { color: ${NEGATIVE_COLOR}; }
        .tooltip-scale li.neutral { color: ${NEUTRAL_COLOR}; }
        .tooltip-scale li.positive::before { color: ${POSITIVE_COLOR};}
        .tooltip-scale li.negative::before { color: ${NEGATIVE_COLOR};}
        .tooltip-scale li.neutral::before { color: ${NEUTRAL_COLOR};}
        */

        .tooltip-secondary {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid ${SECTION_BORDER_COLOR};
          font-size: 13px;
        }
        .secondary-label { color: ${TOOLTIP_SECONDARY_COLOR}; font-weight: 500; }
        .secondary-value { font-weight: 600; color: ${TOOLTIP_TEXT_COLOR}; margin-left: 4px; }

      `}</style>
    </div>
  );
};

// Ensure display name for easier debugging
KpiTooltip.displayName = 'KpiTooltip';

export default KpiTooltip;