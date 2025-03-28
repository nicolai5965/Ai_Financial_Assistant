// KpiDashboard.js

// ---------------------------------------------------------------------
// Import Statements
// ---------------------------------------------------------------------
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import KpiGroup from './KpiGroup'; // Assuming path is correct
import KpiTooltip from './KpiTooltip'; // Import KpiTooltip here
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
// const PRIMARY_LIGHT = 'rgba(26, 42, 58, 1)';      // Light blue (Not used directly here)
const ACCENT_PRIMARY = 'rgba(92, 230, 207, 1)';   // Cyan
const ACCENT_HOVER = 'rgba(59, 205, 186, 1)';     // Darker cyan
const TEXT_PRIMARY = 'rgba(248, 248, 248, 1)';    // White text
const TEXT_SECONDARY = 'rgba(204, 204, 204, 1)';   // Light gray text
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.5)';         // Black shadow

// DASHBOARD STYLING
const DASHBOARD_PADDING = '16px';
const DASHBOARD_BG_COLOR = 'transparent'; // Keep transparent to inherit page background
const DASHBOARD_TITLE_COLOR = TEXT_PRIMARY;
const DASHBOARD_BORDER_RADIUS = '4px'; // Consistent border radius

// BUTTONS (Refresh/Retry) - Use sidebar's primary button style
const BUTTON_BG_COLOR = ACCENT_PRIMARY; // Use accent color for main actions
const BUTTON_HOVER_BG_COLOR = ACCENT_HOVER;
const BUTTON_TEXT_COLOR = PRIMARY_DARK; // Dark text for contrast on accent bg
const BUTTON_DISABLED_BG = 'rgba(85, 85, 85, 0.7)'; // Consistent disabled style
const BUTTON_DISABLED_TEXT = '#aaa';
const BUTTON_PADDING = '8px 16px';
const BUTTON_FONT_SIZE = '14px';
const BUTTON_BORDER_RADIUS = '4px';

// MESSAGES & STATES
const MESSAGE_BG_COLOR = 'rgba(10, 20, 30, 0.6)'; // Use SECTION_BG_COLOR
const NO_DATA_COLOR = TEXT_SECONDARY;
const ERROR_COLOR = '#f44336'; // Keep standard error red
const ERROR_BG_COLOR = 'rgba(244, 67, 54, 0.1)'; // Subtle red background for error message
const ERROR_BORDER = `1px solid ${ERROR_COLOR}`; // Error border

// EFFECTS
const TEXT_GLOW = `0 0 8px rgba(92, 230, 207, 0.3)`; // Subtle glow for titles

/**
 * KpiDashboard component for managing and displaying all KPI groups, styled consistently.
 */
const KpiDashboard = ({
  kpiData,
  isLoading = false,
  onRefresh = null,
  onKpiClick = null,
  viewPreferences = {}, // User preferences for visible/expanded groups
}) => {
  // --- State and Refs ---
  const [activeKpi, setActiveKpi] = useState(null); // Stores the active KPI *object*
  const [tooltipAnchorEl, setTooltipAnchorEl] = useState(null); // Stores the DOM element for the tooltip anchor
  const instanceId = useRef(`kpi-dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`); // Unique ID for logging

  // --- Effects ---

  // Log mount/unmount
  useEffect(() => {
    log.debug(`KpiDashboard: Mounted (${instanceId.current})`);
    return () => log.debug(`KpiDashboard: Unmounting (${instanceId.current})`);
  }, []);

  // Log when tooltip should be open/closed based on state
  useEffect(() => {
    if (activeKpi && tooltipAnchorEl) {
      log.debug(`KpiDashboard: State updated, tooltip should open for ${activeKpi.name}. (${instanceId.current})`);
    } else {
       log.debug(`KpiDashboard: State updated, tooltip should be closed. (${instanceId.current})`);
    }
  }, [activeKpi, tooltipAnchorEl]);

  // --- Event Handlers ---

  // Handle refresh button click
  const handleRefreshClick = useCallback(() => {
    setActiveKpi(null); // Hide any active tooltip on refresh
    setTooltipAnchorEl(null);
    if (onRefresh) {
      log.info(`KpiDashboard: Refresh requested (${instanceId.current})`);
      onRefresh();
    }
  }, [onRefresh]); // Dependency only on onRefresh

  // Handler passed down to KpiGroup -> KpiCard
  const handleKpiCardClick = useCallback((kpi, anchorEl) => {
    // If the clicked KPI is already active, deactivate it
    if (activeKpi && kpi.name === activeKpi.name) {
      log.debug(`KpiDashboard: KPI clicked again: ${kpi.name}, Deactivating. (${instanceId.current})`);
      setActiveKpi(null);
      setTooltipAnchorEl(null);
    } else {
      // Otherwise, activate the new KPI
      log.debug(`KpiDashboard: KPI clicked: ${kpi.name}, New active state. (${instanceId.current})`);
      setActiveKpi(kpi);
      setTooltipAnchorEl(anchorEl); // Store the anchor element
    }

    // Notify parent component if needed (optional)
    if (onKpiClick) {
      onKpiClick(kpi);
    }
  }, [activeKpi, onKpiClick]); // Dependency on activeKpi to check current state

  // Handler for closing the tooltip (e.g., called by KpiTooltip's onClose)
  const handleCloseTooltip = useCallback(() => {
     log.debug(`KpiDashboard: Closing tooltip explicitly. (${instanceId.current})`);
     setActiveKpi(null);
     setTooltipAnchorEl(null);
  }, []);

  // --- Data Processing ---

  // useMemo to process the raw kpiData into an array of group objects
  const kpiGroups = useMemo(() => {
    // Return empty array if loading, no data, or error prevents processing
    if (isLoading || !kpiData || kpiData.error) {
      return [];
    }
    // Safely access nested data
    const groupsData = kpiData.kpi_data?.kpi_groups || {};
    // Convert object of groups into an array
    return Object.values(groupsData);
  }, [isLoading, kpiData]); // Dependency on isLoading and the raw kpiData

  // useMemo to filter the processed groups based on user's viewPreferences
  const visibleGroups = useMemo(() => {
    const visibleGroupNames = viewPreferences?.visibleGroups; // Get the array of names from preferences

    // Check if visibleGroups preference is explicitly set and is an array
    if (Array.isArray(visibleGroupNames)) {
      log.debug(`KpiDashboard: Filtering groups based on preferences: [${visibleGroupNames.join(', ')}] (${instanceId.current})`);
      // Filter the processed kpiGroups array
      return kpiGroups.filter(group => group && visibleGroupNames.includes(group.group));
    }

    // If preference is not set or not an array, show all processed groups
    log.debug(`KpiDashboard: No valid visibleGroups preference found, showing all ${kpiGroups.length} processed groups (${instanceId.current})`);
    return kpiGroups;
  }, [kpiGroups, viewPreferences?.visibleGroups]); // Dependency on processed groups and the specific preference

  // Check for error state in the data
  const hasError = !!kpiData?.error;

  // --- Render Logic ---

  // Function to determine what content to render based on state (loading, error, data)
  const renderContent = () => {
    // Show loading skeletons for groups
    if (isLoading) {
      log.debug(`KpiDashboard: Rendering loading state (${instanceId.current})`);
      return (
        <div className="loading-groups">
          {/* Render a couple of skeleton groups for visual feedback */}
          <KpiGroup isLoading={true} />
          <KpiGroup isLoading={true} />
        </div>
      );
    }

    // Show error message and retry button
    if (hasError) {
      log.error(`KpiDashboard: Rendering error state: ${kpiData.error} (${instanceId.current})`);
      return (
        <div className="error-message">
          <p>Error loading KPI data: {kpiData.error || 'Unknown error'}</p>
          {/* Only show retry if onRefresh is provided */}
          {onRefresh && (
             <button className="action-button retry-button" onClick={handleRefreshClick}>
                Retry
             </button>
          )}
        </div>
      );
    }

    // Show message if no groups are visible (either none exist or none selected in preferences)
    if (!visibleGroups || visibleGroups.length === 0) {
       // Differentiate message based on whether groups exist but aren't selected
      const message = kpiGroups.length > 0
        ? "No KPI groups selected. Adjust visibility in settings."
        : "No KPI data available.";
       log.info(`KpiDashboard: Rendering empty state: ${message} (${instanceId.current})`);
      return (
        <div className="no-data-message">
          <p>{message}</p>
        </div>
      );
    }

    // Render the filtered list of KpiGroup components
    log.debug(`KpiDashboard: Rendering ${visibleGroups.length} visible KPI groups (${instanceId.current})`);
    return visibleGroups.map((group) => {
      if (!group || !group.group) {
          log.warn(`KpiDashboard: Skipping invalid group data in render loop (${instanceId.current})`, group);
          return null; // Skip rendering if group or group.group is missing
      }
      // Determine if this group should be initially expanded based on preferences
      const isExpanded = viewPreferences?.expandedGroups
        ? viewPreferences.expandedGroups.includes(group.group)
        : true; // Default to expanded if preference not set

      return (
        <KpiGroup
          key={group.group} // Use the unique group identifier as the key
          group={group}
          onKpiClick={handleKpiCardClick} // Pass down the specific handler for card clicks
          activeKpiName={activeKpi?.name} // Pass the *name* of the active KPI for card styling
          initiallyExpanded={isExpanded} // Control initial expansion state
        />
      );
    });
  };

  // --- JSX Output ---
  return (
    <div className="kpi-dashboard">
      {/* Header section with title and optional refresh button */}
      <div className="dashboard-header">
        <h2 className="dashboard-title">
          Key Performance Indicators
          {/* Append ticker symbol if available */}
          {/* Safely access potentially nested ticker */}
          {kpiData?.kpi_data?.ticker ? ` - ${kpiData.kpi_data.ticker}` : ''}
        </h2>
        {/* Only show refresh button if handler is provided */}
        {onRefresh && (
          <button
            className="action-button refresh-button" // Use common action-button class
            onClick={handleRefreshClick}
            disabled={isLoading}
            title="Refresh KPI data"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        )}
      </div>

      {/* Main content area where groups, loading, or messages are rendered */}
      <div className="dashboard-content">
        {renderContent()}
      </div>

      {/* Render the single KpiTooltip instance conditionally */}
      {/* It's rendered here, outside the KpiCard's overflow context */}
      {activeKpi && tooltipAnchorEl && (
        <KpiTooltip
          kpi={activeKpi} // Pass the full KPI object
          anchorEl={tooltipAnchorEl} // Pass the anchor element
          open={true} // If it's rendered here, it's because it should be open
          onClose={handleCloseTooltip} // Pass the handler to allow tooltip to close itself
          // position="above" // You can set a default position
        />
      )}

      {/* --- Styles (using theme constants) --- */}
      <style jsx>{`
        .kpi-dashboard {
          width: 100%;
          padding: ${DASHBOARD_PADDING};
          background-color: ${DASHBOARD_BG_COLOR}; /* Transparent background */
          position: relative; /* Added to ensure correct context for absolute/fixed children if needed */
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: calc(${DASHBOARD_PADDING} * 1.2); /* Slightly more margin */
          padding-bottom: calc(${DASHBOARD_PADDING} * 0.5); /* Padding below header */
          border-bottom: 1px solid rgba(92, 230, 207, 0.2); /* Subtle border using theme */
        }

        .dashboard-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: ${DASHBOARD_TITLE_COLOR};
          text-shadow: ${TEXT_GLOW}; /* Add text glow */
          letter-spacing: 0.5px;
        }

        /* Common styling for action buttons (Refresh, Retry) */
        .action-button {
          background-color: ${BUTTON_BG_COLOR};
          color: ${BUTTON_TEXT_COLOR};
          border: none;
          border-radius: ${BUTTON_BORDER_RADIUS};
          padding: ${BUTTON_PADDING};
          font-size: ${BUTTON_FONT_SIZE};
          font-weight: bold; /* Make button text bolder */
          cursor: pointer;
          transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
          text-transform: uppercase; /* Match sidebar button style */
          letter-spacing: 0.5px; /* Match sidebar button style */
        }

        .action-button:hover {
          background-color: ${BUTTON_HOVER_BG_COLOR};
          transform: translateY(-1px);
          box-shadow: 0 2px 5px ${SHADOW_COLOR};
        }
         .action-button:active {
           transform: translateY(0px);
           box-shadow: 0 1px 3px ${SHADOW_COLOR};
        }

        .action-button:disabled {
          background-color: ${BUTTON_DISABLED_BG};
          color: ${BUTTON_DISABLED_TEXT};
          opacity: 0.7; /* More visible disabled state */
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Specific button class if needed, though common is usually fine */
        .refresh-button { /* Inherits from action-button */ }
        .retry-button { /* Inherits from action-button */ }

        .dashboard-content {
          display: flex;
          flex-direction: column;
          gap: calc(${DASHBOARD_PADDING} * 0.8); /* Consistent gap using padding */
        }

        /* Container for loading skeletons */
        .loading-groups {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: calc(${DASHBOARD_PADDING} * 0.8);
        }

        /* Styling for message boxes (No Data, Error) */
        .no-data-message, .error-message {
          text-align: center;
          padding: calc(${DASHBOARD_PADDING} * 2) ${DASHBOARD_PADDING}; /* More vertical padding */
          background-color: ${MESSAGE_BG_COLOR};
          border-radius: ${DASHBOARD_BORDER_RADIUS};
          margin-bottom: ${DASHBOARD_PADDING};
          border: 1px solid rgba(92, 230, 207, 0.1); /* Subtle border */
        }

        .no-data-message p {
          color: ${NO_DATA_COLOR};
          margin: 0 0 16px 0; /* Add margin below paragraph */
          font-size: 14px;
        }

        .error-message {
          background-color: ${ERROR_BG_COLOR};
          border: ${ERROR_BORDER};
        }

        .error-message p {
          color: ${ERROR_COLOR};
          margin: 0 0 16px 0; /* Add margin below paragraph */
          font-weight: 500; /* Slightly bolder error text */
          font-size: 14px;
        }

        /* Ensure retry button in error message uses action-button styles */
         .error-message .retry-button {
             /* No additional styles needed if it inherits correctly */
         }

      `}</style>
    </div>
  );
};

// Ensure display name for easier debugging
KpiDashboard.displayName = 'KpiDashboard';

export default React.memo(KpiDashboard); // Export the memoized component