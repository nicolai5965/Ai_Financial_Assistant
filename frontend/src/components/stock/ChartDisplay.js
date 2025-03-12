import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Import logger utility
const logger = require('../../utils/logger');

// Dynamically import Plot with no SSR to avoid server-side rendering issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

/**
 * ChartDisplay component for rendering the Plotly chart and managing loading states
 * Handles displaying the chart, loading spinner, and previous chart during loading
 * Now includes full-screen toggle functionality via a modal overlay
 * Adds a banner above the plot with title and fullscreen button
 */
const ChartDisplay = ({ chartData, isLoading, prevChartData }) => {
  // State to track full-screen mode
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Toggle full-screen mode
  const toggleFullScreen = () => {
    const newState = !isFullScreen;
    setIsFullScreen(newState);
    logger.info(`Chart full-screen mode ${newState ? 'enabled' : 'disabled'}`);
  };
  
  // Add event listener for escape key to exit full-screen mode
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
        logger.info('Chart full-screen mode disabled via Escape key');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullScreen]);

  // Extract chart title from chartData if available
  const getChartTitle = () => {
    if (!chartData) return "Chart";
    try {
      const layout = JSON.parse(chartData).layout || {};
      return layout.title?.text || layout.title || "Chart";
    } catch (error) {
      logger.error("Error extracting chart title:", error);
      return "Chart";
    }
  };

  return (
    <div className="chart-display">
      {isLoading && !prevChartData && <p>Loading chart...</p>}
      
      {/* Show previous chart while loading */}
      {isLoading && prevChartData && (
        <div className="loading-overlay">
          <Plot 
            data={prevChartData ? JSON.parse(prevChartData).data || [] : []}
            layout={prevChartData ? JSON.parse(prevChartData).layout || {} : {}}
            style={{ width: "100%", height: "600px" }}
            useResizeHandler={true}
          />
          <div className="loading-spinner">
            Loading...
          </div>
        </div>
      )}
      
      {/* Chart banner and regular chart view */}
      {!isLoading && chartData && !isFullScreen && (
        <>
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
          <Plot 
            data={chartData ? JSON.parse(chartData).data || [] : []}
            layout={chartData ? JSON.parse(chartData).layout || {} : {}}
            style={{ width: "100%", height: "600px" }}
            useResizeHandler={true}
            config={{
              responsive: true,
              displayModeBar: false, // Show mode bar on hover in regular view
              modeBarButtonsToAdd: ['toImage'],
              modeBarButtonsToRemove: ['sendDataToCloud'],
              displaylogo: false, // Hide the plotly logo
            }}
          />
        </>
      )}
      
      {/* Full-screen modal */}
      {isFullScreen && chartData && (
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
            <Plot 
              data={chartData ? JSON.parse(chartData).data || [] : []}
              layout={chartData ? JSON.parse(chartData).layout || {} : {}}
              style={{ width: "100%", height: "calc(100% - 50px)" }}
              useResizeHandler={true}
              config={{
                responsive: true,
                displayModeBar: false, // Always show the mode bar in full-screen
                modeBarButtonsToAdd: ['toImage'],
                modeBarButtonsToRemove: ['sendDataToCloud'],
                displaylogo: false, // Hide the plotly logo
              }}
            />
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
          position: relative;
        }
        
        .loading-spinner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: rgba(0, 0, 0, 0.7);
          padding: 15px 30px;
          border-radius: 4px;
          z-index: 10;
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
          background-color: #1B1610; /* Shadow Black to match app's theme */
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