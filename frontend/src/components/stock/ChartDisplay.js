import React, { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Plotly from 'plotly.js-dist-min'; // Import Plotly for the resize method
import { logger } from '../../utils/logger'; // Import logger utility

// Dynamically import Plot component with no SSR to avoid server-side rendering issues.
// This ensures Plotly.js, which relies on browser APIs, only runs on the client-side.
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Constants for default chart dimensions
const CHART_HEIGHT = '600px';
const CHART_WIDTH = '100%';

/**
 * ChartDisplay component for rendering a Plotly chart.
 *
 * Features:
 * - Displays the chart based on `chartData`.
 * - Shows a loading state:
 *   - If loading initially (no `prevChartData`), displays "Loading chart...".
 *   - If updating (has `prevChartData`), displays the *previous* chart with a "Loading..." overlay.
 * - Handles full-screen mode toggling.
 * - Provides a manual update button.
 * - Includes resize handling with debouncing for performance.
 * - Cleans up event listeners on unmount.
 */
const ChartDisplay = ({ chartData, isLoading, prevChartData, onUpdateClick }) => {
  // Log incoming props on change for easier debugging
  useEffect(() => {
    logger.debug('ChartDisplay: Props update received:', {
      hasChartData: !!chartData,
      isLoading,
      hasPrevChartData: !!prevChartData,
      hasUpdateCallback: !!onUpdateClick,
    });
  }, [chartData, isLoading, prevChartData, onUpdateClick]);

  // State to track if the chart is in full-screen mode
  const [isFullScreen, setIsFullScreen] = useState(false);
  // Ref to store the debounce timeout ID for resize handling
  const resizeTimeoutRef = useRef(null);
  // Ref to track if the component is currently mounted (to prevent state updates/actions after unmount)
  const isMountedRef = useRef(true);
  // Ref to the div containing the Plotly chart, used for resize operations
  const plotDivRef = useRef(null);

  /**
   * Toggles the full-screen state for the chart.
   */
  const toggleFullScreen = () => {
    const newState = !isFullScreen;
    setIsFullScreen(newState);
    logger.info(`ChartDisplay: Full-screen mode ${newState ? 'enabled' : 'disabled'}`);
    // Note: Resizing might be needed after entering/exiting full screen,
    // relying on the window resize listener or potentially triggering manually.
  };

  /**
   * Handler for the 'Update' button click. Calls the provided callback.
   */
  const handleUpdate = () => {
    if (onUpdateClick) {
      logger.info('ChartDisplay: Manual chart update requested via button');
      onUpdateClick();
    } else {
      logger.warn('ChartDisplay: Update button clicked, but no onUpdateClick callback provided.');
    }
  };

  /**
   * Processes the raw chart data (string or object) into a format usable by Plotly.
   * - Parses JSON string if necessary.
   * - Ensures a layout object exists and sets autosize to true.
   * - Extracts the original title and removes it from the layout (to be displayed in the banner).
   * @param {string | object} data - The raw chart data.
   * @returns {{data: Array, layout: object, originalTitle: string}} Processed data, layout, and title.
   */
  const processChartData = (data) => {
    // logger.debug('ChartDisplay: Processing chart data:', { data }); // Optional: Log raw data if needed
    if (!data) {
      // logger.debug('ChartDisplay: No data provided to processChartData');
      return { data: [], layout: {}, originalTitle: "" };
    }
    try {
      // Handle both stringified JSON and already parsed objects
      const parsedData = typeof data === "string" ? JSON.parse(data) : data;
      // logger.debug('ChartDisplay: Successfully parsed/received data:', { parsedData }); // Optional: Log parsed data

      // Ensure layout object exists and enable autosize for responsiveness
      parsedData.layout = parsedData.layout || {};
      parsedData.layout.autosize = true;

      // Extract the original title to display in the banner, then remove from chart layout
      let originalTitle = "";
      if (parsedData.layout.title) {
        if (typeof parsedData.layout.title === 'string') {
          originalTitle = parsedData.layout.title;
          // Remove the title directly from the chart layout
          parsedData.layout.title = "";
        } else if (parsedData.layout.title.text) {
          originalTitle = parsedData.layout.title.text;
          // Remove the title text but keep the title object structure if needed elsewhere
          parsedData.layout.title.text = "";
        }
      }

      // logger.debug('ChartDisplay: Finished processing chart data:', { // Optional: Log processing outcome
      //   dataLength: parsedData.data?.length || 0,
      //   hasLayout: !!parsedData.layout,
      //   originalTitle
      // });

      return {
        data: parsedData.data || [], // Ensure data is always an array
        layout: parsedData.layout,
        originalTitle
      };
    } catch (error) {
      logger.error("ChartDisplay: Error processing chart data:", error);
      // Return default structure on error to prevent crashing
      return { data: [], layout: {}, originalTitle: "" };
    }
  };

  // Memoize processed chart data to avoid redundant parsing on re-renders unless the raw data changes.
  const processedChartData = useMemo(() => {
    logger.debug('ChartDisplay: Memoizing processedChartData...');
    return processChartData(chartData);
  }, [chartData]); // Dependency: Re-run only if chartData changes

  // Memoize processed *previous* chart data.
  const processedPrevChartData = useMemo(() => {
    logger.debug('ChartDisplay: Memoizing processedPrevChartData...');
    return processChartData(prevChartData);
  }, [prevChartData]); // Dependency: Re-run only if prevChartData changes


  // Determine if there is current chart data to display
  const hasCurrentChartData = Boolean(processedChartData.data && processedChartData.data.length > 0);
  // Determine if there was previous chart data (used for showing overlay during update)
  const hasPreviousChartData = Boolean(processedPrevChartData.data && processedPrevChartData.data.length > 0);

  /**
   * Gets the title to display in the chart banner. Uses the extracted original title or a default.
   * @returns {string} The chart title.
   */
  const getChartTitle = () => {
    return processedChartData.originalTitle || "Chart"; // Fallback title
  };

  // Store fixed chart height as a number for comparison in relayout handler
  const fixedChartHeight = parseInt(CHART_HEIGHT);

  /**
   * Handles window resize events with debouncing to avoid excessive Plotly resize calls.
   */
  const handleResize = () => {
    // Don't attempt resize if the plot div isn't mounted/referenced
    if (!plotDivRef.current) return;

    // Clear any existing pending resize timeout
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    // Set a new timeout to trigger resize after a delay (e.g., 250ms)
    resizeTimeoutRef.current = setTimeout(() => {
      // Check if component is still mounted and ref exists before resizing
      if (isMountedRef.current && plotDivRef.current) {
        try {
          // Use Plotly's resize method on the container div
          Plotly.Plots.resize(plotDivRef.current);
          logger.debug("ChartDisplay: Plotly resize triggered by window resize (debounced)");
        } catch (error) {
          logger.error("ChartDisplay: Error during Plotly resize:", error);
        }
      }
    }, 250); // Debounce time
  };

  /**
   * Handler for Plotly's 'relayout' event.
   * This can be triggered by user interactions like zooming/panning.
   * We check if the height significantly changed and force a resize if needed,
   * sometimes Plotly's internal adjustments might slightly alter height.
   * @param {object} eventData - Data about the relayout event.
   */
  const handleRelayout = (eventData) => {
    // Define a small threshold to ignore minor floating point differences
    const heightChangeThreshold = 1;
    // Check if the layout event includes height information and if it differs significantly from our target
    if (eventData && eventData.height && Math.abs(eventData.height - fixedChartHeight) > heightChangeThreshold) {
      if (plotDivRef.current) {
        // Force resize to potentially correct layout issues
        Plotly.Plots.resize(plotDivRef.current);
        logger.debug("ChartDisplay: Plotly resize triggered via relayout event (height changed significantly)");
      }
    } else {
       // logger.debug("ChartDisplay: Relayout event occurred, but height change was negligible or height not present."); // Optional: Log minor events
    }
  };

  // Effect hook for setting up and cleaning up global event listeners (resize, Escape key)
  useEffect(() => {
    // Handler for keydown events (specifically listening for Escape key to exit full-screen)
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
        logger.info('ChartDisplay: Full-screen mode disabled via Escape key');
      }
    };

    // Add event listeners when component mounts
    window.addEventListener('keydown', handleKeyDown, { passive: true }); // Use passive for potentially better scroll performance
    window.addEventListener('resize', handleResize, { passive: true }); // Use passive for potentially better scroll performance

    // Set mounted ref to true
    isMountedRef.current = true;

    // Cleanup function: Remove event listeners and clear any pending timeouts when the component unmounts
    return () => {
      isMountedRef.current = false; // Mark as unmounted
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      // Clear any pending resize timeout to prevent resize calls after unmount
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      logger.debug("ChartDisplay: Cleaned up event listeners and resize timeout.");
    };
  }, [isFullScreen, handleResize]); // Re-run effect if isFullScreen changes (handleKeyDown depends on it), or if handleResize function identity changes (though it's stable here)

  // Configuration options for the Plotly chart
  const plotlyConfig = {
    responsive: true,          // Makes the chart responsive to container size changes
    displayModeBar: false,     // Hide the default Plotly mode bar initially
    modeBarButtonsToAdd: ['toImage'], // Add specific buttons (like download as image)
    modeBarButtonsToRemove: ['sendDataToCloud'], // Remove unwanted buttons
    displaylogo: false,        // Hide the Plotly logo
  };

  // --- Determine what to render ---

  // Choose the data and layout to display.
  // IMPORTANT: We *always* render the <Plot> component with the *current* `processedChartData`
  // if `hasCurrentChartData` is true. Plotly internally handles updates efficiently when
  // the `data` or `layout` props change. We do NOT unmount the Plot component during loading.
  const displayData = processedChartData.data;
  const displayLayout = processedChartData.layout;

  // Determine if the loading overlay should be shown.
  // This happens when `isLoading` is true AND we have `hasPreviousChartData`.
  // This ensures the overlay only appears during *updates*, not initial loads without prior data.
  const showLoadingOverlay = isLoading && hasPreviousChartData;

  // Determine if the initial "Loading chart..." text should be shown.
  // This happens when `isLoading` is true, but we DON'T have *any* chart data yet (neither current nor previous).
  const showInitialLoadingMessage = isLoading && !hasCurrentChartData && !hasPreviousChartData;


  return (
    <div className="chart-display">
      {/* --- Chart Banner (Title and Buttons) --- */}
      {/* Render banner only in normal view and if there's chart data */}
      {!isFullScreen && hasCurrentChartData && (
        <div className="chart-banner">
          <h3 className="chart-title" title={getChartTitle()}>{getChartTitle()}</h3>
          <div className="banner-buttons">
            <button
              onClick={handleUpdate}
              className="update-button"
              title="Update chart and associated KPIs"
              disabled={isLoading} // Disable button while loading
            >
              {isLoading ? 'Updating...' : 'Update'}
            </button>
            <button
              onClick={toggleFullScreen}
              className="full-screen-toggle"
              title="Toggle full-screen mode"
            >
              Full Screen
            </button>
          </div>
        </div>
      )}

      {/* --- Chart Area (Normal View) --- */}
      {!isFullScreen && (
        // Container needs relative positioning for the absolute overlay
        <div style={{ position: 'relative' }}>
          {/* Render the Plotly chart IF there is data */}
          {hasCurrentChartData && (
            <div ref={plotDivRef} style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}>
              <Plot
                data={displayData}         // Pass the current data
                layout={displayLayout}     // Pass the current layout
                style={{ width: "100%", height: "100%" }}
                useResizeHandler={true}    // Use react-plotly.js's internal resize handler
                config={plotlyConfig}      // Pass the defined configuration
                onRelayout={handleRelayout} // Attach the relayout handler
                // Optionally add a key if you encounter issues where Plotly doesn't update correctly
                // e.g., key={JSON.stringify(processedChartData.layout?.uirevision || 'defaultKey')}
              />
            </div>
          )}

          {/* Loading Overlay: Rendered ON TOP of the chart if updating */}
          {showLoadingOverlay && (
            <div className="loading-overlay">
              <div className="loading-spinner">Loading...</div>
            </div>
          )}

          {/* Initial Loading Message: Rendered when loading for the first time */}
          {showInitialLoadingMessage && (
            // Style this appropriately, perhaps centered within the chart area height
            <div style={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                  className="update-button"
                  title="Update chart and associated KPIs"
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating...' : 'Update'}
                </button>
                <button
                  onClick={toggleFullScreen} // Same function toggles back
                  className="full-screen-toggle"
                  title="Exit full-screen mode"
                >
                  Exit Full Screen
                </button>
              </div>
            </div>

            {/* Chart Area in Full Screen - Needs relative position for overlay */}
            <div style={{ position: 'relative', width: "100%", height: "calc(100% - 50px)" }}>
              {/* Render the Plotly chart IF there is data */}
              {hasCurrentChartData && (
                 // Assign ref here too if resize needed in fullscreen independently,
                 // but usually the window resize handles it. If issues, consider a separate ref or logic.
                <div ref={plotDivRef} style={{ width: "100%", height: "100%" }}>
                  <Plot
                    data={displayData}
                    layout={displayLayout}
                    style={{ width: "100%", height: "100%" }}
                    useResizeHandler={true}
                    config={plotlyConfig}
                    onRelayout={handleRelayout} // Can use the same handler
                  />
                </div>
              )}

               {/* Loading Overlay in Full Screen */}
               {showLoadingOverlay && (
                  // The overlay needs to cover the chart area within the modal
                  <div className="loading-overlay" style={{ height: "100%" /* Ensure it covers the chart area */ }}>
                     <div className="loading-spinner">Loading...</div>
                  </div>
               )}

               {/* Initial Loading Message in Full Screen */}
               {showInitialLoadingMessage && (
                 <div style={{ height: "100%", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <p>Loading chart...</p>
                 </div>
               )}
            </div>

            {/* Hint for exiting full-screen */}
            <div className="keyboard-hint">
              Press ESC to exit full-screen
            </div>
          </div>
        </div>
      )}

      {/* --- Styles --- */}
      <style jsx>{`
        .chart-display {
          position: relative; /* Ensure positioning context if needed */
          /* Adjust min-height based on chart + banner, or remove if layout handles it */
          min-height: calc(${CHART_HEIGHT} + 50px + 5px); /* chart + banner + margin */
          margin-top: 5px;
          border: 1px solid #444; /* Optional: border for visual separation */
          border-radius: 4px;     /* Match banner radius */
          overflow: hidden;       /* Contain banner radius */
          background-color: #222; /* Optional: background for the container */
        }

        /* Overlay for loading state, shown on top of the chart */
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%; /* Cover the entire parent div (which contains the chart) */
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent background */
          z-index: 10; /* Ensure it's above the Plotly chart */
          pointer-events: none; /* Allow interaction with elements behind if needed, though likely not for the chart */
        }

        .loading-spinner {
          background-color: rgba(0, 0, 0, 0.8); /* Darker background for spinner text */
          padding: 15px 30px;
          border-radius: 4px;
          color: #fff;
          font-size: 16px;
        }

        /* Chart banner styles */
        .chart-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #333333;
          color: white;
          padding: 8px 16px;
          /* Don't need top radius if border-radius is on chart-display */
          /* border-top-left-radius: 4px; */
          /* border-top-right-radius: 4px; */
          height: 50px; /* Fixed height for the banner */
          box-sizing: border-box;
          /* position: relative; // Not needed unless stacking within banner */
          /* z-index: 5; // Only needed if overlapping with chart content, but shouldn't */
        }

        .chart-banner.fullscreen {
          /* Fullscreen banner might not need rounded corners */
          border-radius: 0;
          width: 100%;
        }

        .chart-title {
          margin: 0;
          font-size: 18px; /* Slightly smaller */
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: calc(100% - 200px); /* Adjust based on button widths */
        }

        .banner-buttons {
          display: flex;
          align-items: center;
          gap: 10px; /* Add space between buttons */
        }

        /* Update button styles */
        .update-button, .full-screen-toggle {
          background-color: #4CAF50; /* Example Green */
          color: white;
          border: none;
          padding: 8px 16px; /* Consistent padding */
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s ease;
          white-space: nowrap; /* Prevent wrapping */
        }
        .update-button {
             background-color:rgb(35, 37, 175); /* Specific color for update */
        }


        .update-button:hover {
           background-color:rgb(24, 26, 122);
        }
         .full-screen-toggle {
             background-color: rgba(255, 255, 255, 0.2); /* Lighter background for toggle */
         }
        .full-screen-toggle:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }

        .update-button:disabled {
          background-color: #555; /* Grey out when disabled */
          color: #aaa;
          cursor: not-allowed;
        }

        /* Full-screen modal styles */
        .full-screen-modal {
          position: fixed; /* Cover viewport */
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.95); /* Darker overlay */
          z-index: 1000; /* High z-index to be on top */
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px; /* Add some padding around the content */
          box-sizing: border-box;
        }

        .full-screen-content {
          position: relative; /* For positioning hint */
          width: 100%; /* Take full width of padded modal */
          height: 100%; /* Take full height of padded modal */
          background-color: #1B1610; /* Dark background for chart contrast */
          border-radius: 8px; /* Optional rounded corners */
          overflow: hidden; /* Clip content */
          display: flex;
          flex-direction: column; /* Stack banner and chart vertically */
        }

        .keyboard-hint {
          position: absolute;
          bottom: 10px;
          right: 15px;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          opacity: 0.8; /* Slightly more visible */
          z-index: 20; /* Above chart content */
        }
      `}</style>
    </div>
  );
};

// Memoize the component to prevent re-renders if props haven't changed.
// Useful if the parent component re-renders frequently for other reasons.
export default React.memo(ChartDisplay);