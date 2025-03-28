// KpiGroup.js

// ---------------------------------------------------------------------
// Import Statements
// ---------------------------------------------------------------------
import React, { useState, useCallback, useEffect, useRef } from 'react';
import KpiCard from './KpiCard';
import { logger } from '../../../utils/logger'; // Assuming logger path is correct

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
// const ACCENT_HOVER = 'rgba(59, 205, 186, 1)';     // Darker cyan (Not directly used here, but could be)
const TEXT_PRIMARY = 'rgba(248, 248, 248, 1)';    // White text
const TEXT_SECONDARY = 'rgba(204, 204, 204, 1)';   // Light gray text
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.5)';         // Black shadow

// GROUP STYLING - Mapped from SECTION styles
const GROUP_BG_COLOR = 'rgba(10, 20, 30, 0.6)'; // SECTION_BG_COLOR
const GROUP_BORDER = `1px solid rgba(92, 230, 207, 0.2)`; // SECTION_BORDER
const GROUP_BORDER_RADIUS = '4px'; // SECTION_BORDER_RADIUS
const GROUP_SHADOW = `0 2px 10px rgba(0, 0, 0, 0.2)`; // SECTION_SHADOW
const GROUP_HOVER_SHADOW = `0 4px 15px rgba(0, 0, 0, 0.3), 0 0 1px ${ACCENT_PRIMARY}`; // Section hover shadow

// HEADER STYLING
const GROUP_HEADER_BG_COLOR = PRIMARY_DARK; // Base dark color for header
const GROUP_HEADER_HOVER_BG_COLOR = PRIMARY_LIGHT; // Lighter on hover
const GROUP_TITLE_COLOR = TEXT_PRIMARY;
const GROUP_DESCRIPTION_COLOR = TEXT_SECONDARY;
const EXPAND_ICON_COLOR = ACCENT_PRIMARY; // Use accent for the icon

// EFFECTS
const TEXT_GLOW = `0 0 8px rgba(92, 230, 207, 0.3)`; // Subtle glow for titles

// CONTENT & LAYOUT
const CONTENT_PADDING = '16px';
const CARD_GAP = '16px';

/**
 * KpiGroup component for displaying a group of related KPIs, styled consistently
 * with the StockSettingsSidebar theme.
 */
const KpiGroup = React.memo(({
  group,
  isLoading = false,
  onKpiClick = null,
  activeKpiName = null,
  initiallyExpanded = true,
}) => {
  // --- State and Refs ---
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const instanceId = useRef(`kpi-group-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);

  // --- Effects ---
  useEffect(() => {
    // Log mount/unmount with group title and unique ID for easier tracking
    log.debug(`KpiGroup: Mounted: ${group?.title || 'unknown'} (${instanceId.current})`);
    return () => log.debug(`KpiGroup: Unmounting: ${group?.title || 'unknown'} (${instanceId.current})`);
  }, [group?.title]); // Dependency only on group.title

  // --- Render Logic ---

  // Return null if there's no group data and it's not in a loading state
  if (!group && !isLoading) {
    log.warn(`KpiGroup: Rendered with no group data and not loading (${instanceId.current})`);
    return null;
  }

  const toggleExpanded = useCallback(() => {
    // Log the toggle action
    log.debug(`KpiGroup: Toggling expansion for group: ${group?.title || 'unknown'} (${instanceId.current})`);
    setIsExpanded(prev => !prev); // Use functional update for state safety
  }, [group?.title]); // Dependency only on group.title

  const renderKpiCards = () => {
    // Display loading skeletons if data is loading
    if (isLoading) {
      log.debug(`KpiGroup: Rendering loading skeletons for ${group?.title || 'unknown'} (${instanceId.current})`);
      // Render a fixed number of skeletons for consistent layout during load
      return Array(4).fill(0).map((_, index) => (
        <KpiCard key={`loading-${instanceId.current}-${index}`} isLoading={true} />
      ));
    }

    // Extract KPI items safely, handling different possible structures (metrics/kpis)
    const kpiItems = group?.metrics || group?.kpis || [];

    // Display an empty state message if no KPIs are available
    if (!group || kpiItems.length === 0) {
      log.info(`KpiGroup: No KPIs available in group: ${group?.title || 'unknown'} (${instanceId.current})`);
      return (
        <div className="empty-state">
          No KPIs available in this group
        </div>
      );
    }

    log.debug(`KpiGroup: Rendering ${kpiItems.length} KPI cards for group ${group.title || group.group || 'unknown'} (${instanceId.current})`);

    // Render KpiCard components for each item
    return kpiItems.map((kpi) => {
      // Ensure the kpi object includes the group identifier if missing
      const updatedKpi = { ...kpi, group: kpi.group || group?.group };
      // Determine if this KPI card is the active one
      const isActive = activeKpiName === kpi.name; // Compare names

      // Use kpi.name as the key for stable identity
      return (
        <KpiCard
          key={kpi.name}
          kpi={updatedKpi}
          // Pass the received onKpiClick handler directly
          // It now expects (kpi, anchorEl) from KpiCard and will pass them up
          onClick={onKpiClick}
          isActive={isActive} // Pass active state for styling the card
        />
      );
    });
  };

  // --- JSX Output ---
  return (
    <div className="kpi-group">
      {/* Clickable header to toggle expansion */}
      <div className="group-header" onClick={toggleExpanded}>
        <div className="group-title-container">
          <h3 className="group-title">
            {isLoading ? 'Loading...' : (group?.title || 'Unknown Group')}
          </h3>
          <span className="expand-icon">
            {/* Unicode characters for expand/collapse arrows */}
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>

        {/* Display group description if available */}
        {!isLoading && group?.description && (
          <p className="group-description">
            {group.description}
          </p>
        )}
      </div>

      {/* Conditionally render content based on expanded state */}
      {isExpanded && (
        <div className="group-content">
          <div className="kpi-cards-container">
            {renderKpiCards()}
          </div>
        </div>
      )}

      {/* --- Styles (using theme constants) --- */}
      <style jsx>{`
        .kpi-group {
          background-color: ${GROUP_BG_COLOR};
          border-radius: ${GROUP_BORDER_RADIUS};
          border: ${GROUP_BORDER};
          margin-bottom: 16px; /* Keep spacing between groups */
          overflow: hidden; /* Ensure border-radius is respected */
          box-shadow: ${GROUP_SHADOW};
          transition: box-shadow 0.3s ease; /* Add transition for hover effect */
        }

        .kpi-group:hover {
           box-shadow: ${GROUP_HOVER_SHADOW}; /* Apply hover shadow */
        }

        .group-header {
          background-color: ${GROUP_HEADER_BG_COLOR};
          padding: 12px ${CONTENT_PADDING}; /* Consistent padding */
          cursor: pointer;
          user-select: none;
          transition: background-color 0.2s ease;
          border-bottom: ${isExpanded ? GROUP_BORDER : 'none'}; /* Add border only when expanded */
        }

        .group-header:hover {
          background-color: ${GROUP_HEADER_HOVER_BG_COLOR};
        }

        .group-title-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .group-title {
          margin: 0;
          font-size: 16px; /* Slightly larger */
          font-weight: 600; /* Bolder */
          color: ${GROUP_TITLE_COLOR};
          text-shadow: ${TEXT_GLOW}; /* Add text glow */
          letter-spacing: 0.5px;
        }

        .expand-icon {
          font-size: 14px; /* Slightly larger icon */
          margin-left: 8px;
          color: ${EXPAND_ICON_COLOR}; /* Use accent color */
          transition: transform 0.2s ease; /* Smooth rotation */
          transform: ${isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'}; /* Rotate icon */
        }

        .group-description {
          margin: 6px 0 0; /* Adjust margin */
          font-size: 13px; /* Slightly larger description */
          color: ${GROUP_DESCRIPTION_COLOR};
          line-height: 1.4;
        }

        .group-content {
          padding: ${CONTENT_PADDING};
        }

        .kpi-cards-container {
          display: grid;
          /* Responsive grid columns */
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: ${CARD_GAP};
        }

        .empty-state {
          padding: ${CONTENT_PADDING};
          text-align: center;
          color: ${GROUP_DESCRIPTION_COLOR};
          font-style: italic;
          grid-column: 1 / -1; /* Make empty state span all columns */
        }

        /* Responsive adjustments for smaller screens */
        @media (max-width: 640px) {
          .kpi-cards-container {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: calc(${CARD_GAP} * 0.75); /* Reduce gap on small screens */
          }

          .group-content {
            padding: calc(${CONTENT_PADDING} * 0.75); /* Reduce padding */
          }

           .group-title {
             font-size: 15px;
           }
           .group-description {
             font-size: 12px;
           }
        }
      `}</style>
    </div>
  );
});

// Ensure display name for easier debugging
KpiGroup.displayName = 'KpiGroup';

export default KpiGroup;