import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Plotly from 'plotly.js-dist-min'; // Import Plotly for the resize method

// Import logger utility
const logger = require('../../utils/logger');

// Dynamically import Plot with no SSR to avoid server-side rendering issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Constants for chart dimensions
const CHART_HEIGHT = '600px';
const CHART_WIDTH = '100%';

/**
 * ChartDisplay component for rendering the Plotly chart and managing loading states.
 * Handles displaying the chart, loading spinner, and previous chart during loading.
 * Includes full-screen toggle functionality via a modal overlay.
 */
const ChartDisplay = ({ chartData, isLoading, prevChartData }) => {
  // State to track full-screen mode
  const [isFullScreen, setIsFullScreen] = useState(false);
  // Ref to store debounce timeout for resize handling
  const resizeTimeoutRef = useRef(null);
  // Ref to track if the component is mounted
  const isMountedRef = useRef(true);
  // Ref to store the Plot's DOM element
  const plotDivRef = useRef(null);

  // Toggle full-screen mode and log the event
  const toggleFullScreen = () => {
    const newState = !isFullScreen;
    setIsFullScreen(newState);
    logger.info(`Chart full-screen mode ${newState ? 'enabled' : 'disabled'}`);
  };

  // Process chart data to ensure consistent layout settings.
  // This helper is used for both current and previous chart data.
  const processChartData = (data) => {
    if (!data) return { data: [], layout: {} };
    try {
      const parsedData = JSON.parse(data);
      // Ensure layout exists and enforce autosize
      parsedData.layout = parsedData.layout || {};
      parsedData.layout.autosize = true;
      return parsedData;
    } catch (error) {
      logger.error("Error processing chart data:", error);
      return { data: [], layout: {} };
    }
  };

  // Store fixed chart height as a number to avoid repeated parsing
  const fixedChartHeight = parseInt(CHART_HEIGHT);

  // Process chart data once and reuse it to avoid duplicate JSON parsing.
  const hasChartData = Boolean(chartData);
  const processedChartData = hasChartData ? processChartData(chartData) : { data: [], layout: {} };
  const processedPrevChartData = prevChartData ? processChartData(prevChartData) : { data: [], layout: {} };

  // Extract chart title from the already processed chart data.
  // This removes the need to parse JSON again.
  const getChartTitle = () => {
    const layout = processedChartData.layout || {};
    return layout.title?.text || layout.title || "Chart";
  };

  // Handle resize events with debouncing to optimize performance.
  const handleResize = () => {
    if (!plotDivRef.current) return;
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && plotDivRef.current) {
        // Use Plotly's resize method to recalculate layout
        Plotly.Plots.resize(plotDivRef.current);
        logger.debug("Plotly resize triggered");
      }
    }, 250);
  };

  // Extracted handler for Plotly relayout events to enforce fixed chart height.
  // This replaces the inline function previously used.
  const handleRelayout = (layout) => {
    if (layout.height && layout.height !== fixedChartHeight) {
      Plotly.Plots.resize(plotDivRef.current);
      logger.debug("Plotly resize triggered via relayout");
    }
  };

  // Set up event listeners for window resize and Escape key to exit full-screen mode.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
        logger.info('Chart full-screen mode disabled via Escape key');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [isFullScreen]);

  // Plotly configuration options, centralized for consistency
  const plotlyConfig = {
    responsive: true,
    displayModeBar: false,
    modeBarButtonsToAdd: ['toImage'],
    modeBarButtonsToRemove: ['sendDataToCloud'],
    displaylogo: false,
  };

  return (
    <div className="chart-display">
      {/* Chart Banner for regular view (non-fullscreen) */}
      {!isFullScreen && hasChartData && (
        <div className="chart-banner">
          <h3 className="chart-title">{getChartTitle()}</h3>
          <button 
            onClick={toggleFullScreen} 
            className="full-screen-toggle"
            title="Toggle full-screen mode"
          >
            Full Screen
          </button>
        </div>
      )}

      {/* Regular chart view (non-fullscreen) */}
      {!isFullScreen && hasChartData && (
        <div style={{ position: 'relative' }}>
          <div ref={plotDivRef} style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}>
            <Plot 
              data={processedChartData.data}
              layout={processedChartData.layout}
              style={{ width: "100%", height: "100%" }}
              useResizeHandler={true}
              config={plotlyConfig}
              onRelayout={handleRelayout} // Using the extracted handler for clarity
            />
          </div>
          {/* Loading overlay if loading with previous chart data */}
          {isLoading && prevChartData && (
            <div className="loading-overlay">
              <div className="loading-spinner">Loading...</div>
            </div>
          )}
        </div>
      )}

      {/* Loading state when there is no previous data */}
      {isLoading && !prevChartData && <p>Loading chart...</p>}

      {/* Full-screen modal view */}
      {isFullScreen && hasChartData && (
        <div className="full-screen-modal">
          <div className="full-screen-content">
            <div className="chart-banner fullscreen">
              <h3 className="chart-title">{getChartTitle()}</h3>
              <button 
                onClick={toggleFullScreen} 
                className="full-screen-toggle"
                title="Exit full-screen mode"
              >
                Exit Full Screen
              </button>
            </div>
            <div ref={plotDivRef} style={{ width: "100%", height: "calc(100% - 50px)" }}>
              <Plot 
                data={processedChartData.data}
                layout={processedChartData.layout}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler={true}
                config={plotlyConfig}
              />
            </div>
            <div className="keyboard-hint">
              Press ESC to exit full-screen
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .chart-display {
          position: relative;
          min-height: 600px;
          margin-top: 20px;
        }
        
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10;
        }
        
        .loading-spinner {
          background-color: rgba(0, 0, 0, 0.7);
          padding: 15px 30px;
          border-radius: 4px;
          color: #fff;
        }
        
        /* Chart banner styles */
        .chart-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #333333;
          color: white;
          padding: 8px 16px;
          border-top-left-radius: 4px;
          border-top-right-radius: 4px;
          height: 50px;
          position: relative;
          z-index: 5;
        }
        
        .chart-banner.fullscreen {
          border-radius: 0;
          width: 100%;
        }
        
        .chart-title {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 80%;
        }
        
        /* Full-screen toggle button styles */
        .full-screen-toggle {
          background-color: rgba(0, 0, 0, 0.5);
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        
        .full-screen-toggle:hover {
          background-color: rgba(0, 0, 0, 0.7);
        }
        
        /* Full-screen modal styles */
        .full-screen-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.9);
          z-index: 1000;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .full-screen-content {
          position: relative;
          width: 95%;
          height: 90%;
          background-color: #1B1610;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .keyboard-hint {
          position: absolute;
          bottom: 10px;
          right: 10px;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
};

export default ChartDisplay;
