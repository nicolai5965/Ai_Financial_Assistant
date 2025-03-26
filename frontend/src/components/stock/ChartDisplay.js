import React, { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Plotly from 'plotly.js-dist-min'; // Import Plotly for the resize method
import { logger } from '../../utils/logger'; // Import logger utility

// --- Constants ---

// Dynamically import Plot component with no SSR
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Chart Dimensions & Behavior
const CHART_HEIGHT = '600px';
const CHART_WIDTH = '100%';
const RESIZE_DEBOUNCE_MS = 250; // Debounce time for resize handling

// --- Styling Constants (Imported/Adapted from StockSettingsSidebar) ---

// COLORS - Primary palette
const PRIMARY_DARK = 'rgba(13, 27, 42, 1)';      // Dark blue
const PRIMARY_LIGHT = 'rgba(26, 42, 58, 1)';      // Light blue
const ACCENT_PRIMARY = 'rgba(92, 230, 207, 1)';   // Cyan
const ACCENT_HOVER = 'rgba(59, 205, 186, 1)';     // Darker cyan
const TEXT_PRIMARY = 'rgba(248, 248, 248, 1)';    // White text
const TEXT_SECONDARY = 'rgba(204, 204, 204, 1)';   // Light gray text
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.5)';         // Black shadow

// COMPONENT STYLING - Adapted for ChartDisplay elements
const CONTAINER_BG_COLOR = 'rgba(10, 20, 30, 0.6)'; // Use SECTION_BG_COLOR
const CONTAINER_BORDER = `1px solid rgba(92, 230, 207, 0.2)`; // Use SECTION_BORDER
const CONTAINER_BORDER_RADIUS = '4px'; // Use SECTION_BORDER_RADIUS
const BANNER_BG_COLOR = PRIMARY_DARK; // Darker for banner
const BUTTON_BORDER_RADIUS = '4px';
const BUTTON_HEIGHT = '36px'; // Slightly smaller than sidebar's main button maybe

// BUTTONS - Primary (Update) and Secondary (Fullscreen)
const BUTTON_PRIMARY_BG = ACCENT_PRIMARY;
const BUTTON_PRIMARY_TEXT = PRIMARY_DARK; // Use dark text on accent bg for contrast
const BUTTON_PRIMARY_HOVER_BG = ACCENT_HOVER;
const BUTTON_SECONDARY_BG = 'rgba(92, 230, 207, 0.2)'; // Semi-transparent accent
const BUTTON_SECONDARY_HOVER_BG = 'rgba(92, 230, 207, 0.4)';
const BUTTON_DISABLED_BG = 'rgba(85, 85, 85, 0.7)';
const BUTTON_DISABLED_TEXT = '#aaa';

// OVERLAYS & MODALS
const LOADING_OVERLAY_BG = 'rgba(13, 27, 42, 0.7)'; // Semi-transparent dark blue
const LOADING_SPINNER_BG = PRIMARY_DARK;
const FULLSCREEN_MODAL_BG = 'rgba(13, 27, 42, 0.95)'; // Almost opaque dark blue
const FULLSCREEN_CONTENT_BG = PRIMARY_DARK;
const HINT_BG = 'rgba(13, 27, 42, 0.8)';

// EFFECTS
const TEXT_GLOW = `0 0 8px rgba(92, 230, 207, 0.3)`; // Subtle glow for titles


// Configuration options for the Plotly chart (defined once)
const PLOTLY_CONFIG = {
  responsive: true,
  displayModeBar: false,
  modeBarButtonsToAdd: ['toImage'],
  modeBarButtonsToRemove: ['sendDataToCloud'],
  displaylogo: false,
};

/**
 * ChartDisplay component for rendering a Plotly chart using StockSettingsSidebar theme.
 */
const ChartDisplay = ({ chartData, isLoading, prevChartData, onUpdateClick }) => {

  // --- State and Refs ---
  const [isFullScreen, setIsFullScreen] = useState(false);
  const resizeTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const plotDivRef = useRef(null);

  // --- Data Processing and Derived State ---
  const processChartData = (data) => {
    // ... (processing logic remains the same)
     if (!data) {
      return { data: [], layout: {}, originalTitle: "" };
    }
    try {
      const parsedData = typeof data === "string" ? JSON.parse(data) : data;
      parsedData.layout = parsedData.layout || {};
      parsedData.layout.autosize = true;

      let originalTitle = "";
      if (parsedData.layout.title) {
        if (typeof parsedData.layout.title === 'string') {
          originalTitle = parsedData.layout.title;
          parsedData.layout.title = "";
        } else if (parsedData.layout.title.text) {
          originalTitle = parsedData.layout.title.text;
          parsedData.layout.title.text = "";
        }
      }
      return {
        data: parsedData.data || [],
        layout: parsedData.layout,
        originalTitle
      };
    } catch (error) {
      logger.error("ChartDisplay: Error processing chart data:", error);
      return { data: [], layout: {}, originalTitle: "" };
    }
  };

  const processedChartData = useMemo(() => processChartData(chartData), [chartData]);
  const processedPrevChartData = useMemo(() => processChartData(prevChartData), [prevChartData]);
  const hasCurrentChartData = Boolean(processedChartData.data && processedChartData.data.length > 0);
  const hasPreviousChartData = Boolean(processedPrevChartData.data && processedPrevChartData.data.length > 0);
  const getChartTitle = () => processedChartData.originalTitle || "Chart";
  const fixedChartHeight = parseInt(CHART_HEIGHT);
  const displayData = processedChartData.data;
  const displayLayout = processedChartData.layout;
  const showLoadingOverlay = isLoading && hasPreviousChartData;
  const showInitialLoadingMessage = isLoading && !hasCurrentChartData && !hasPreviousChartData;

  // --- Event Handlers ---
  const toggleFullScreen = () => {
    const newState = !isFullScreen;
    setIsFullScreen(newState);
    logger.info(`ChartDisplay: Full-screen mode ${newState ? 'enabled' : 'disabled'}`);
  };

  const handleUpdate = () => {
    if (onUpdateClick) {
      logger.info('ChartDisplay: Manual chart update requested via button');
      onUpdateClick();
    } else {
      logger.warn('ChartDisplay: Update button clicked, but no onUpdateClick callback provided.');
    }
  };

  const handleResize = React.useCallback(() => {
    // ... (resize logic remains the same)
    if (!plotDivRef.current) return;
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && plotDivRef.current) {
        try {
          Plotly.Plots.resize(plotDivRef.current);
          logger.debug("ChartDisplay: Plotly resize triggered by window resize (debounced)");
        } catch (error) {
          logger.error("ChartDisplay: Error during Plotly resize:", error);
        }
      }
    }, RESIZE_DEBOUNCE_MS);
  }, []);

  const handleRelayout = (eventData) => {
    // ... (relayout logic remains the same)
    const heightChangeThreshold = 1;
    if (eventData && eventData.height && Math.abs(eventData.height - fixedChartHeight) > heightChangeThreshold) {
      if (plotDivRef.current) {
        Plotly.Plots.resize(plotDivRef.current);
        logger.debug("ChartDisplay: Plotly resize triggered via relayout event (height changed significantly)");
      }
    }
  };

  // --- Side Effects ---
  useEffect(() => {
    // ... (prop logging effect remains the same)
     logger.debug('ChartDisplay: Props update received:', {
      hasChartData: !!chartData,
      isLoading,
      hasPrevChartData: !!prevChartData,
      hasUpdateCallback: !!onUpdateClick,
    });
  }, [chartData, isLoading, prevChartData, onUpdateClick]);

  useEffect(() => {
    // ... (event listener setup/cleanup remains the same)
     const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
        logger.info('ChartDisplay: Full-screen mode disabled via Escape key');
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      logger.debug("ChartDisplay: Cleaned up event listeners and resize timeout.");
    };
  }, [isFullScreen, handleResize]);

  // --- Rendering ---
  return (
    <div className="chart-display">
      {/* --- Chart Banner (Normal View) --- */}
      {!isFullScreen && hasCurrentChartData && (
        <div className="chart-banner">
          <h3 className="chart-title" title={getChartTitle()}>{getChartTitle()}</h3>
          <div className="banner-buttons">
            <button
              onClick={handleUpdate}
              className="update-button chart-button" // Added chart-button base class
              title="Update chart and associated KPIs"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update'}
            </button>
            <button
              onClick={toggleFullScreen}
              className="full-screen-toggle chart-button" // Added chart-button base class
              title="Toggle full-screen mode"
            >
              Full Screen
            </button>
          </div>
        </div>
      )}

      {/* --- Chart Area (Normal View) --- */}
      {!isFullScreen && (
        <div style={{ position: 'relative' }}>
          {hasCurrentChartData && (
            <div ref={plotDivRef} style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}>
              <Plot
                data={displayData}
                layout={displayLayout}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler={true}
                config={PLOTLY_CONFIG}
                onRelayout={handleRelayout}
              />
            </div>
          )}
          {showLoadingOverlay && (
            <div className="loading-overlay">
              <div className="loading-spinner">Loading...</div>
            </div>
          )}
          {showInitialLoadingMessage && (
            <div style={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_PRIMARY }}>
              <p>Loading chart...</p>
            </div>
          )}
        </div>
      )}

      {/* --- Full-Screen Modal View --- */}
      {isFullScreen && (
        <div className="full-screen-modal">
          <div className="full-screen-content">
            {/* Full Screen Banner */}
            <div className="chart-banner fullscreen">
              <h3 className="chart-title" title={getChartTitle()}>{getChartTitle()}</h3>
              <div className="banner-buttons">
                 <button
                    onClick={handleUpdate}
                    className="update-button chart-button" // Added chart-button base class
                    title="Update chart and associated KPIs"
                    disabled={isLoading}
                >
                    {isLoading ? 'Updating...' : 'Update'}
                </button>
                <button
                    onClick={toggleFullScreen}
                    className="full-screen-toggle chart-button" // Added chart-button base class
                    title="Exit full-screen mode"
                >
                    Exit Full Screen
                </button>
              </div>
            </div>

            {/* Chart Area (Full Screen) */}
            <div style={{ position: 'relative', width: "100%", height: "calc(100% - 50px)" }}>
              {hasCurrentChartData && (
                <div ref={plotDivRef} style={{ width: "100%", height: "100%" }}>
                  <Plot
                    data={displayData}
                    layout={displayLayout}
                    style={{ width: "100%", height: "100%" }}
                    useResizeHandler={true}
                    config={PLOTLY_CONFIG}
                    onRelayout={handleRelayout}
                  />
                </div>
              )}
              {showLoadingOverlay && (
                <div className="loading-overlay" style={{ height: "100%" }}>
                  <div className="loading-spinner">Loading...</div>
                </div>
              )}
              {showInitialLoadingMessage && (
                <div style={{ height: "100%", display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_PRIMARY }}>
                  <p>Loading chart...</p>
                </div>
              )}
            </div>

            {/* Keyboard Hint */}
            <div className="keyboard-hint">
              Press ESC to exit full-screen
            </div>
          </div>
        </div>
      )}

      {/* --- Styles --- */}
      <style jsx>{`
        /* Base container styling */
        .chart-display {
          position: relative;
          min-height: calc(${CHART_HEIGHT} + 50px + 5px);
          margin-top: 5px;
          border: ${CONTAINER_BORDER};
          border-radius: ${CONTAINER_BORDER_RADIUS};
          overflow: hidden;
          background-color: ${CONTAINER_BG_COLOR};
        }

        /* Loading overlay and spinner */
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: ${LOADING_OVERLAY_BG};
          z-index: 10;
          pointer-events: none;
        }
        .loading-spinner {
          background-color: ${LOADING_SPINNER_BG};
          padding: 15px 30px;
          border-radius: ${CONTAINER_BORDER_RADIUS};
          color: ${TEXT_PRIMARY};
          font-size: 16px;
          box-shadow: 0 2px 10px ${SHADOW_COLOR};
        }

        /* Chart banner */
        .chart-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: ${BANNER_BG_COLOR};
          color: ${TEXT_PRIMARY};
          padding: 8px 16px;
          height: 50px;
          box-sizing: border-box;
        }
        .chart-banner.fullscreen {
          border-radius: 0; /* No radius inside modal */
          width: 100%;
        }
        .chart-title {
          margin: 0;
          font-size: 18px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: calc(100% - 220px); /* Adjust based on button widths + gap */
          color: ${TEXT_PRIMARY};
          text-shadow: ${TEXT_GLOW};
        }
        .banner-buttons {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Base button styles */
        .chart-button {
          color: ${TEXT_PRIMARY};
          border: none;
          padding: 0 16px; /* Horizontal padding */
          height: ${BUTTON_HEIGHT};
          border-radius: ${BUTTON_BORDER_RADIUS};
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
          white-space: nowrap;
          display: flex; /* Center text vertically */
          align-items: center;
          justify-content: center;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .chart-button:hover {
           transform: translateY(-1px);
           box-shadow: 0 3px 6px ${SHADOW_COLOR};
        }
         .chart-button:active {
           transform: translateY(0px);
           box-shadow: 0 1px 3px ${SHADOW_COLOR};
        }

        /* Primary button (Update) */
        .update-button {
          background-color: ${BUTTON_PRIMARY_BG};
          color: ${BUTTON_PRIMARY_TEXT}; /* Dark text on light accent */
        }
        .update-button:hover {
          background-color: ${BUTTON_PRIMARY_HOVER_BG};
        }

        /* Secondary button (Fullscreen) */
        .full-screen-toggle {
          background-color: ${BUTTON_SECONDARY_BG};
          color: ${TEXT_PRIMARY}; /* Light text on darkish background */
        }
        .full-screen-toggle:hover {
          background-color: ${BUTTON_SECONDARY_HOVER_BG};
        }

        /* Disabled state for buttons */
        .chart-button:disabled {
          background-color: ${BUTTON_DISABLED_BG};
          color: ${BUTTON_DISABLED_TEXT};
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Full-screen modal */
        .full-screen-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: ${FULLSCREEN_MODAL_BG};
          z-index: 1000;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          box-sizing: border-box;
        }
        .full-screen-content {
          position: relative;
          width: 100%;
          height: 100%;
          background-color: ${FULLSCREEN_CONTENT_BG};
          border-radius: ${CONTAINER_BORDER_RADIUS};
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 5px 25px ${SHADOW_COLOR};
        }
        .keyboard-hint {
          position: absolute;
          bottom: 10px;
          right: 15px;
          background-color: ${HINT_BG};
          color: ${TEXT_SECONDARY};
          padding: 5px 10px;
          border-radius: ${CONTAINER_BORDER_RADIUS};
          font-size: 12px;
          opacity: 0.8;
          z-index: 20;
        }
      `}</style>
    </div>
  );
};

export default React.memo(ChartDisplay);