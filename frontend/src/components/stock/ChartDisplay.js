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
const LOADING_OVERLAY_BG = 'rgba(13, 27, 42, 0.7)'; // Semi-transparent dark blue (Used for spinner bg)
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
  // **** ADDED: State for revision tracking ****
  const [revision, setRevision] = useState(0);
  const prevChartDataRef = useRef(chartData); // Ref to track previous chartData for comparison

  // --- Data Processing and Derived State ---
  const processChartData = (data) => {
     if (!data) {
      logger.debug("ChartDisplay: processChartData received null/undefined data.");
      return { data: [], layout: {}, originalTitle: "" };
    }
    try {
      // Ensure we work with a mutable copy for layout modifications
      // Deep copy is safer to avoid mutating props
      const parsedData = typeof data === "string" ? JSON.parse(data) : JSON.parse(JSON.stringify(data));
      parsedData.layout = parsedData.layout || {};
      parsedData.layout.autosize = true; // Ensure autosize is always true

      let originalTitle = "";
      if (parsedData.layout.title) {
        if (typeof parsedData.layout.title === 'string') {
          originalTitle = parsedData.layout.title;
        } else if (parsedData.layout.title.text) {
          originalTitle = parsedData.layout.title.text;
        }
         // *** Important: Modify the COPY, not the original potentially shared layout object ***
         // Create a new title object or clear the text property
         if (typeof parsedData.layout.title === 'object' && parsedData.layout.title !== null) {
            // Create a new layout object entirely to ensure no mutation
            parsedData.layout = { ...parsedData.layout, title: { ...parsedData.layout.title, text: "" } };
         } else {
             // Create a new layout object entirely to ensure no mutation
             parsedData.layout = { ...parsedData.layout, title: "" };
         }
      }
      logger.debug("ChartDisplay: Successfully processed chart data. Title extracted:", originalTitle);
      return {
        data: parsedData.data || [],
        layout: parsedData.layout,
        originalTitle
      };
    } catch (error) {
      logger.error("ChartDisplay: Error processing chart data:", error, "Raw data:", data);
      return { data: [], layout: {}, originalTitle: "" };
    }
  };

  // Use useMemo for expensive processing, ensure dependencies are correct
  const processedChartData = useMemo(() => {
      logger.debug("ChartDisplay: Re-processing current chart data");
      return processChartData(chartData);
  }, [chartData]);

  // Memoize previous data processing as well
  const processedPrevChartData = useMemo(() => {
      logger.debug("ChartDisplay: Re-processing previous chart data");
      return processChartData(prevChartData);
  }, [prevChartData]);

  // Derived state based on processed data
  const hasCurrentChartData = Boolean(processedChartData.data && processedChartData.data.length > 0);
  const hasPreviousChartData = Boolean(processedPrevChartData.data && processedPrevChartData.data.length > 0);
  const getChartTitle = () => processedChartData.originalTitle || ""; // Return empty string if no title
  const fixedChartHeight = parseInt(CHART_HEIGHT);

  // **** IMPORTANT: These now refer to the memoized processed data ****
  const displayData = processedChartData.data;
  const displayLayout = processedChartData.layout;

  const showInitialLoadingMessage = isLoading && !hasCurrentChartData && !hasPreviousChartData;
  // Determine if there's any chart content (current or previous) to potentially display or overlay
  const hasAnyChartContent = hasCurrentChartData || hasPreviousChartData;


  // --- Event Handlers ---
  const toggleFullScreen = () => {
    const newState = !isFullScreen;
    setIsFullScreen(newState);
    logger.info(`ChartDisplay: Full-screen mode ${newState ? 'enabled' : 'disabled'}`);
    // Trigger resize after state update and potential DOM changes
    setTimeout(() => handleResize(), 50);
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
    if (!plotDivRef.current) {
        logger.debug("ChartDisplay: handleResize skipped, plotDivRef is null.");
        return;
    }
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(() => {
      // Check if mounted AND if the element is actually in the DOM layout
      if (isMountedRef.current && plotDivRef.current?.offsetParent !== null) {
        try {
          Plotly.Plots.resize(plotDivRef.current);
          logger.debug("ChartDisplay: Plotly resize triggered by window resize (debounced)");
        } catch (error) {
          logger.error("ChartDisplay: Error during Plotly resize:", error);
        }
      } else {
         logger.debug("ChartDisplay: Skipped resize, component unmounted or not visible in DOM.");
      }
    }, RESIZE_DEBOUNCE_MS);
  }, []); // Dependency array is empty as it relies on refs and constants

  const handleRelayout = (eventData) => {
    const heightChangeThreshold = 1;
    // Check if the event indicates a height change that Plotly didn't handle itself
    if (eventData && eventData['layout.height'] && Math.abs(eventData['layout.height'] - fixedChartHeight) > heightChangeThreshold) {
        logger.debug("ChartDisplay: Relayout event detected potential height mismatch, triggering resize.", eventData);
        handleResize(); // Use the debounced resize handler
    } else if (eventData && (eventData['xaxis.range[0]'] || eventData['yaxis.range[0]'])) {
        // Log zoom/pan events if needed
        // logger.debug("ChartDisplay: Relayout event (zoom/pan):", eventData);
    }
  };

  // --- Side Effects ---
  useEffect(() => {
     logger.debug('ChartDisplay: Props update received:', {
      hasChartData: !!chartData,
      isLoading,
      hasPrevChartData: !!prevChartData,
      revision, // Log current revision
    });
  }, [chartData, isLoading, prevChartData, revision]); // Include revision in log dependency

  // **** ADDED: Effect to increment revision on chartData change ****
  useEffect(() => {
    // Check if chartData has actually changed from the previous render cycle
    // Use a deep comparison or rely on object reference change if data is immutable
    const dataChanged = chartData !== prevChartDataRef.current;

    if (dataChanged) {
       logger.info(`ChartDisplay: chartData changed. Incrementing revision.`);
       setRevision(prev => prev + 1);
       // Update the ref *after* potentially incrementing revision
       prevChartDataRef.current = chartData;
    } else {
        logger.debug("ChartDisplay: chartData prop reference hasn't changed, skipping revision increment.");
    }

  }, [chartData]); // Depend only on chartData


  useEffect(() => {
     const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isFullScreen) {
        toggleFullScreen(); // Use the handler to ensure resize is called
        logger.info('ChartDisplay: Full-screen mode disabled via Escape key');
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    isMountedRef.current = true;

    // Initial resize after mount, slight delay to allow layout settling
    const initialResizeTimeout = setTimeout(() => {
        if (isMountedRef.current) handleResize();
    }, 100);


    return () => {
      isMountedRef.current = false;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      clearTimeout(initialResizeTimeout); // Clear initial resize timeout too
      logger.debug("ChartDisplay: Cleaned up event listeners and resize timeouts.");
    };
    // Rerun if fullscreen status changes OR if handleResize changes (it shouldn't due to useCallback)
  }, [isFullScreen, handleResize, toggleFullScreen]);


  // Determine which data/layout to display based on loading state
  // When loading, show the *previous* data dimly under the overlay if available.
  // When not loading, show the *current* data.
  const dataToShow = !isLoading && hasCurrentChartData ? displayData : (hasPreviousChartData ? processedPrevChartData.data : []);
  const layoutToShow = !isLoading && hasCurrentChartData ? displayLayout : (hasPreviousChartData ? processedPrevChartData.layout : {});
  // Only render the Plotly component itself if there's some data (current or previous)
  const shouldRenderPlotComponent = dataToShow.length > 0;
  // Determine the title to show in the banner
  const bannerTitle = getChartTitle() || processedPrevChartData.originalTitle || "Chart";


  // --- Rendering ---
  return (
    <div className="chart-display">
      {/* --- Chart Banner (Normal View) --- */}
      {/* Show banner if not fullscreen AND we have some chart content (current or previous) to show title for */}
      {!isFullScreen && hasAnyChartContent && (
        <div className="chart-banner">
          <h3 className="chart-title" title={bannerTitle}>{bannerTitle}</h3>
          <div className="banner-buttons">
             <button
              onClick={handleUpdate}
              className="update-button chart-button"
              title="Update chart and associated KPIs"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update'}
            </button>
            <button
              onClick={toggleFullScreen}
              className="full-screen-toggle chart-button"
              title="Toggle full-screen mode"
              // Disable fullscreen button if there's absolutely nothing to show
              disabled={!hasAnyChartContent}
            >
              Full Screen
            </button>
          </div>
        </div>
      )}

      {/* --- Chart Area (Normal View) --- */}
      {!isFullScreen && (
        // This container defines the space for the chart and overlays
        <div style={{ position: 'relative', width: CHART_WIDTH, height: CHART_HEIGHT }}>
          {/* Render Plot component wrapper if we have data (current or previous) */}
          {shouldRenderPlotComponent && (
            <div
              ref={plotDivRef}
              style={{
                  width: "100%",
                  height: "100%",
                  // Apply transparency effect *directly* to the chart container when loading
                  opacity: isLoading ? 0.3 : 1,
                  transition: 'opacity 0.3s ease-in-out',
              }}
            >
              <Plot
                // Pass the determined data/layout
                data={dataToShow}
                layout={layoutToShow}
                revision={revision} // **** ADDED: Pass revision ****
                style={{ width: "100%", height: "100%" }}
                useResizeHandler={true} // Helps react-plotly manage container size changes
                config={PLOTLY_CONFIG}
                onRelayout={handleRelayout}
                // Optional: Add error handler for Plotly specific errors
                onError={(err) => logger.error("Plotly rendering error:", err)}
                // Optional: Use onUpdate to log when Plotly finishes rendering/updating
                // onUpdate={() => logger.debug(`Plotly updated (revision ${revision})`)}
              />
            </div>
          )}

          {/* Loading overlay SPINNER - shown only when loading */}
          {isLoading && (
            <div className="loading-overlay">
              <div className="loading-spinner">Loading...</div>
            </div>
          )}

          {/* Initial loading message (if loading AND no data ever shown yet) */}
          {showInitialLoadingMessage && (
             <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_PRIMARY, zIndex: 5, pointerEvents: 'none' }}>
              <p>Loading chart data...</p>
            </div>
          )}

          {/* No data message (if not loading AND no current data available) */}
          {/* Also handles the case after loading finishes but results in no data */}
          {!isLoading && !hasCurrentChartData && (
             <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_SECONDARY, zIndex: 5, pointerEvents: 'none' }}>
               <p>No chart data available.</p>
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
               <h3 className="chart-title" title={bannerTitle}>{bannerTitle}</h3>
              <div className="banner-buttons">
                 <button
                    onClick={handleUpdate}
                    className="update-button chart-button"
                    title="Update chart and associated KPIs"
                    disabled={isLoading}
                >
                    {isLoading ? 'Updating...' : 'Update'}
                </button>
                <button
                    onClick={toggleFullScreen}
                    className="full-screen-toggle chart-button"
                    title="Exit full-screen mode"
                >
                    Exit Full Screen
                </button>
              </div>
            </div>

            {/* Chart Area (Full Screen) */}
            {/* Height calculation accounts for the fixed banner height */}
            <div style={{ position: 'relative', width: "100%", height: "calc(100% - 50px)" }}>
               {/* Render Plot component wrapper if we have data (current or previous) */}
               {shouldRenderPlotComponent && (
                 <div
                   ref={plotDivRef} // Re-assign ref when in fullscreen
                   style={{
                      width: "100%",
                      height: "100%",
                      // Apply transparency effect *directly* to the chart container when loading
                      opacity: isLoading ? 0.3 : 1,
                      transition: 'opacity 0.3s ease-in-out',
                    }}
                  >
                    <Plot
                      // Pass the determined data/layout
                      data={dataToShow}
                      layout={layoutToShow}
                      revision={revision} // **** ADDED: Pass revision ****
                      style={{ width: "100%", height: "100%" }}
                      useResizeHandler={true}
                      config={PLOTLY_CONFIG}
                      onRelayout={handleRelayout}
                      onError={(err) => logger.error("Plotly rendering error (fullscreen):", err)}
                      // onUpdate={() => logger.debug(`Plotly updated (fullscreen, revision ${revision})`)}
                    />
                  </div>
               )}

               {/* Loading overlay SPINNER - shown only when loading */}
               {isLoading && (
                 <div className="loading-overlay" style={{ borderRadius: '0' }}> {/* Ensure overlay covers full area */}
                   <div className="loading-spinner">Loading...</div>
                 </div>
               )}

               {/* Initial loading message (if loading AND no data ever shown yet) */}
               {showInitialLoadingMessage && (
                 <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_PRIMARY, zIndex: 5, pointerEvents: 'none' }}>
                   <p>Loading chart data...</p>
                 </div>
               )}
                {/* No data message (if not loading AND no current data available) */}
                {!isLoading && !hasCurrentChartData && (
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_SECONDARY, zIndex: 5, pointerEvents: 'none' }}>
                    <p>No chart data available.</p>
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
          /* Base min-height accounts for potential banner + chart area */
          min-height: calc(${CHART_HEIGHT} + 50px + 5px); /* Adjust if banner height changes */
          margin-top: 5px;
          border: ${CONTAINER_BORDER};
          border-radius: ${CONTAINER_BORDER_RADIUS};
          overflow: hidden; /* Important to contain chart */
          background-color: ${CONTAINER_BG_COLOR};
          display: flex; /* Use flex to manage banner + chart area */
          flex-direction: column;
        }

        /* Chart Area Container (Direct child for normal view) */
        .chart-display > div:nth-of-type(2) {
             flex-grow: 1; /* Allow chart area to fill remaining space */
             min-height: ${CHART_HEIGHT}; /* Ensure it respects the chart height */
        }


        /* Loading overlay contains only the spinner */
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          /* No background, opacity is on the chart div */
          z-index: 10; /* Spinner above dimmed chart */
          pointer-events: none; /* Allow interaction with underlying elements if needed */
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
          height: 50px; /* Fixed height */
          box-sizing: border-box;
          border-bottom: ${CONTAINER_BORDER}; /* Separator line */
          flex-shrink: 0; /* Prevent banner from shrinking */
        }
        .chart-banner.fullscreen {
          border-radius: 0; /* No radius inside modal */
          width: 100%;
          border-bottom: ${CONTAINER_BORDER}; /* Keep separator */
        }
        .chart-title {
          margin: 0;
          font-size: 18px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          /* Adjust max-width based on button container size + gap */
          max-width: calc(100% - 230px); /* Approx: 2 buttons * (width + padding) + gap */
          color: ${TEXT_PRIMARY};
          text-shadow: ${TEXT_GLOW};
        }
        .banner-buttons {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0; /* Prevent buttons container from shrinking */
        }

        /* Base button styles */
        .chart-button {
          color: ${TEXT_PRIMARY};
          border: none;
          padding: 0 16px; /* Horizontal padding only */
          height: ${BUTTON_HEIGHT};
          border-radius: ${BUTTON_BORDER_RADIUS};
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
          white-space: nowrap;
          display: flex;
          align-items: center; /* Vertically center text/icon */
          justify-content: center; /* Horizontally center text/icon */
          letter-spacing: 0.5px;
          text-transform: uppercase;
          min-width: 100px; /* Ensure buttons have a minimum width */
          text-align: center;
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
          color: ${BUTTON_PRIMARY_TEXT};
        }
        .update-button:hover:not(:disabled) { /* Ensure hover only applies when enabled */
          background-color: ${BUTTON_PRIMARY_HOVER_BG};
        }

        /* Secondary button (Fullscreen) */
        .full-screen-toggle {
          background-color: ${BUTTON_SECONDARY_BG};
          color: ${TEXT_PRIMARY};
        }
        .full-screen-toggle:hover:not(:disabled) { /* Ensure hover only applies when enabled */
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
          padding: 20px; /* Padding around the content */
          box-sizing: border-box;
        }
        .full-screen-content {
          position: relative;
          width: 100%;
          height: 100%;
          background-color: ${FULLSCREEN_CONTENT_BG};
          border-radius: ${CONTAINER_BORDER_RADIUS};
          overflow: hidden; /* Content scrolls if needed, but chart area is fixed */
          display: flex;
          flex-direction: column; /* Arrange banner and chart vertically */
          box-shadow: 0 5px 25px ${SHADOW_COLOR};
        }
        /* Ensure the chart area in fullscreen fills the remaining space */
        .full-screen-content > div:nth-of-type(2) {
            flex-grow: 1; /* Takes up remaining vertical space */
            min-height: 0; /* Override potential min-height from normal view styles if needed */
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
          z-index: 20; /* Above chart, below modal potentially */
          pointer-events: none; /* Don't intercept clicks */
        }

        /* Plotly specific overrides if necessary */
        :global(.plotly) {
           /* Example: override default plotly bg if needed */
           /* background-color: transparent !important; */
        }
         :global(.plot-container .plotly) {
             background-color: transparent !important;
         }

      `}</style>
    </div>
  );
};

// Use React.memo for performance optimization if props are unlikely to change unnecessarily
// If chartData/prevChartData are large and change frequently, memo might not help much
export default React.memo(ChartDisplay);