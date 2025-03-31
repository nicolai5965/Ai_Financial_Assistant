// KpiContainer.js

// ---------------------------------------------------------------------
// Import Statements
// ---------------------------------------------------------------------
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import KpiDashboard from './kpi/KpiDashboard'; // Assuming path is correct
import KpiSettings from './kpi/KpiSettings'; // Assuming path is correct
import { DEFAULT_KPI_CONFIG } from '../../services/api/stock'; // Assuming path is correct
import { logger } from '../../utils/logger'; // Assuming path is correct

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
// const ACCENT_HOVER = 'rgba(59, 205, 186, 1)';     // Darker cyan (Not used directly here)
const TEXT_PRIMARY = 'rgba(248, 248, 248, 1)';    // White text
// const TEXT_SECONDARY = 'rgba(204, 204, 204, 1)';   // Light gray text (Not used directly here)
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.3)';         // Slightly lighter shadow for buttons

// CONTAINER STYLING
const CONTAINER_PADDING_VERTICAL = '12px'; // More vertical padding
const CONTAINER_PADDING_HORIZONTAL = '16px';
const CONTAINER_BG_COLOR = 'transparent'; // Keep transparent

// BUTTONS (Toggle, Settings) - Use a secondary/utility style
const BUTTON_BG_COLOR = 'rgba(92, 230, 207, 0.15)'; // Use theme BUTTON_VIEW_BG
const BUTTON_HOVER_BG_COLOR = 'rgba(92, 230, 207, 0.3)'; // Use theme BUTTON_VIEW_HOVER_BG
const BUTTON_TEXT_COLOR = TEXT_PRIMARY;
const BUTTON_BORDER_RADIUS = '4px'; // Consistent radius
const BUTTON_PADDING = '8px 16px';
const BUTTON_FONT_SIZE = '14px';
const BUTTON_FONT_WEIGHT = 'bold';
const BUTTON_BORDER = `1px solid rgba(92, 230, 207, 0.2)`; // Subtle border
const BUTTON_HOVER_BORDER = `1px solid rgba(92, 230, 207, 0.4)`;
const BUTTON_TRANSITION = 'background-color 0.2s ease, border-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease';
const BUTTON_TEXT_TRANSFORM = 'uppercase';
const BUTTON_LETTER_SPACING = '0.5px';

// Default Preferences (Moved constant definition up)
const DEFAULT_PREFERENCES = {
  visibleGroups: DEFAULT_KPI_CONFIG.groups || [], // Ensure defaults are arrays
  expandedGroups: DEFAULT_KPI_CONFIG.groups || [], // Ensure defaults are arrays
  activeView: 'technical', // Default active view
  // Add the groupOrder property with a default order
  // Ensure this order aligns logically with visibleGroups/DEFAULT_KPI_CONFIG
  groupOrder: DEFAULT_KPI_CONFIG.groups ? [...DEFAULT_KPI_CONFIG.groups] : ['price', 'volume', 'volatility', 'fundamental', 'sentiment'], // Use config groups or a fallback
};

// Storage Key (Moved constant definition up)
const STORAGE_KEY = 'kpi_dashboard_preferences'; // Key for potential local storage

/**
 * KpiContainer component integrating the KpiDashboard and KpiSettings
 * into the main application layout, styled consistently.
 */
const KpiContainer = ({
  ticker, // Current stock ticker (might be useful later)
  onTickerChange, // Callback if ticker changes (might be useful later)
  dashboardData, // Raw data object containing kpi_data
  isLoading, // Loading state for the dashboard data
  error, // Error state for the dashboard data
  preferences, // Current user preferences passed from parent
  onPreferencesChange, // Callback when preferences change (e.g., in KpiSettings)
  onSaveClick, // Callback when user saves preferences in KpiSettings
}) => {
  // --- State and Refs ---
  const [isVisible, setIsVisible] = useState(true); // Controls visibility of the main KpiDashboard
  const [isSettingsVisible, setIsSettingsVisible] = useState(false); // Controls visibility of the KpiSettings modal
  const instanceId = useRef(`kpi-container-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`); // Unique ID for logging

  // --- Effects ---

  // Log mount/unmount
  useEffect(() => {
    log.debug(`KpiContainer: Mounted (${instanceId.current})`);
    return () => log.debug(`KpiContainer: Unmounting (${instanceId.current})`);
  }, []);

  // --- Data Processing ---

  // Memoize the processed KPI data to pass to the dashboard
  // Handles error state propagation as well.
  const displayKpiData = useMemo(() => {
    if (error) {
      log.error(`KpiContainer: Received error state: ${error} (${instanceId.current})`);
      // Pass error object down so dashboard can display it
      return { error };
    }
    // Safely access nested kpi_data, return null if not found
    return dashboardData?.kpi_data || null;
  }, [dashboardData, error]); // Dependencies: recompute if data or error changes

  // Memoize the list of available group names from the data
  // Used to populate the KpiSettings checklist.
  const availableGroups = useMemo(() => {
    // Safely access available_groups, fallback to default config groups if necessary
    const groups = dashboardData?.kpi_data?.available_groups;
    if (Array.isArray(groups)) {
        return groups;
    }
    log.warn(`KpiContainer: 'available_groups' not found or not an array in dashboardData. Falling back to DEFAULT_KPI_CONFIG. (${instanceId.current})`);
    return DEFAULT_KPI_CONFIG.groups || []; // Ensure fallback is an array
  }, [dashboardData]); // Dependency: recompute if data changes

  // --- Event Handlers ---

  // Handles preference changes originating from KpiSettings
  const handlePreferencesChange = useCallback((newPreferences) => {
    if (newPreferences && onPreferencesChange) {
        log.debug(`KpiContainer: Relaying preference change from settings (${instanceId.current})`, newPreferences);
        onPreferencesChange(newPreferences);
    }
  }, [onPreferencesChange]); // Dependency

   // Handles the explicit save action from KpiSettings
  const handleSavePreferences = useCallback((savedPreferences) => {
     if (savedPreferences && onSaveClick) {
        log.info(`KpiContainer: Relaying saved preferences (${instanceId.current})`, savedPreferences);
        onSaveClick(savedPreferences); // Call the parent's save handler
     }
     // Settings modal closes itself after save, no need to close here
  }, [onSaveClick]); // Dependency

  // Handles clicks on individual KPI cards relayed from KpiDashboard
  const handleKpiClick = useCallback((kpi) => {
    // Placeholder for potential future actions when a KPI is clicked in the container context
    if (kpi) {
        log.debug(`KpiContainer: KPI click received: ${kpi.name} (${instanceId.current})`);
        // Example: Could trigger a detailed view, add to comparison, etc.
    }
  }, []); // No dependencies needed currently

  // Toggles the visibility of the main KpiDashboard section
  const toggleVisibility = useCallback(() => {
    const nextState = !isVisible;
    setIsVisible(nextState);
    log.debug(`KpiContainer: Dashboard visibility toggled to ${nextState} (${instanceId.current})`);
  }, [isVisible]); // Dependency

  // Toggles the visibility of the KpiSettings modal
  const toggleSettings = useCallback(() => {
    const nextState = !isSettingsVisible;
    setIsSettingsVisible(nextState);
    log.debug(`KpiContainer: Settings modal visibility toggled to ${nextState} (${instanceId.current})`);
  }, [isSettingsVisible]); // Dependency

  // --- Render ---

  return (
    <div className="kpi-container">
      {/* Container for the toggle buttons */}
      <div className="toggle-container">
        <button
          className="action-button toggle-button" // Use common action-button class
          onClick={toggleVisibility}
          title={isVisible ? 'Hide Key Performance Indicators section' : 'Show Key Performance Indicators section'}
        >
          {isVisible ? 'Hide KPIs' : 'Show KPIs'}
        </button>

        {/* Show Settings button only if dashboard is visible */}
        {isVisible && (
          <button
            className="action-button settings-button" // Use common action-button class
            onClick={toggleSettings}
            title="Open KPI display settings"
          >
            Settings
          </button>
        )}
      </div>

      {/* Conditionally render the KpiDashboard based on visibility state */}
      {isVisible && (
        <div className="dashboard-wrapper">
          <KpiDashboard
            kpiData={displayKpiData} // Pass processed data or error object
            isLoading={isLoading}
            onKpiClick={handleKpiClick} // Pass down handler
            // Use preferences from props, fallback to default if undefined/null
            viewPreferences={preferences || DEFAULT_PREFERENCES}
            // Pass onRefresh if needed by dashboard (currently dashboard doesn't use it directly)
            // onRefresh={...}
          />
        </div>
      )}

      {/* Render KpiSettings modal (handles its own visibility internally based on isVisible prop) */}
      <KpiSettings
        isVisible={isSettingsVisible}
        onClose={toggleSettings} // Use toggle function to close
        availableGroups={availableGroups} // Pass the memoized list of group names
        // Use preferences from props, fallback to default if undefined/null
        preferences={preferences || DEFAULT_PREFERENCES}
        // Pass down the handlers for changes and saving
        onPreferencesChange={handlePreferencesChange}
        onSaveClick={handleSavePreferences}
      />

      {/* --- Styles (using theme constants) --- */}
      <style jsx>{`
        .kpi-container {
          width: 100%;
          background-color: ${CONTAINER_BG_COLOR};
          padding: ${CONTAINER_PADDING_VERTICAL} 0; /* Vertical padding only */
          /* Add margin if needed to separate from other sections */
          /* margin-bottom: 20px; */
        }

        .toggle-container {
          display: flex;
          gap: 10px; /* Space between buttons */
          margin-bottom: ${CONTAINER_PADDING_VERTICAL}; /* Space below buttons */
          /* Add horizontal padding to align buttons with content if dashboard has padding */
          padding: 0 ${CONTAINER_PADDING_HORIZONTAL};
        }

        /* Common style for action buttons in this container */
        .action-button {
          background-color: ${BUTTON_BG_COLOR};
          color: ${BUTTON_TEXT_COLOR};
          border: ${BUTTON_BORDER};
          border-radius: ${BUTTON_BORDER_RADIUS};
          padding: ${BUTTON_PADDING};
          font-size: ${BUTTON_FONT_SIZE};
          font-weight: ${BUTTON_FONT_WEIGHT};
          cursor: pointer;
          transition: ${BUTTON_TRANSITION};
          text-transform: ${BUTTON_TEXT_TRANSFORM};
          letter-spacing: ${BUTTON_LETTER_SPACING};
        }

        .action-button:hover {
          background-color: ${BUTTON_HOVER_BG_COLOR};
          border-color: ${BUTTON_HOVER_BORDER};
          transform: translateY(-1px);
          box-shadow: 0 2px 5px ${SHADOW_COLOR};
        }
        .action-button:active {
           transform: translateY(0px);
           box-shadow: 0 1px 3px ${SHADOW_COLOR};
        }

        /* Specific button classes if needed, though common is usually fine */
        .toggle-button { /* Inherits from action-button */ }
        .settings-button { /* Inherits from action-button */ }

        .dashboard-wrapper {
          width: 100%;
          /* Add transition for smooth show/hide if using max-height or opacity */
           transition: opacity 0.3s ease, max-height 0.3s ease-out;
           overflow: hidden; /* Needed for max-height transition */
           max-height: ${isVisible ? '4000px' : '0'}; /* Adjust max-height generously */
           opacity: ${isVisible ? 1 : 0};
        }

         /* If not using max-height transition, you can simplify: */
         /* .dashboard-wrapper { display: ${isVisible ? 'block' : 'none'}; } */

      `}</style>
    </div>
  );
};

// Ensure display name for easier debugging
KpiContainer.displayName = 'KpiContainer';

export default React.memo(KpiContainer); // Export the memoized component