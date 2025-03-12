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

  return (
    <div className="chart-display">
      {isLoading && !prevChartData && <p>Loading chart...</p>}
      
      {/* Full-screen toggle button */}
      {!isLoading && chartData && (
        <button 
          onClick={toggleFullScreen} 
          className="full-screen-toggle"
          title="Toggle full-screen mode"
        >
          {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
        </button>
      )}
      
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
      
      {/* Show current chart when not loading */}
      {!isLoading && chartData && !isFullScreen && (
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
      )}
      
      {/* Full-screen modal */}
      {isFullScreen && chartData && (
        <div className="full-screen-modal">
          <div className="full-screen-content">
            <Plot 
              data={chartData ? JSON.parse(chartData).data || [] : []}
              layout={chartData ? JSON.parse(chartData).layout || {} : {}}
              style={{ width: "100%", height: "100%" }}
              useResizeHandler={true}
              config={{
                responsive: true,
                displayModeBar: false, // Always show the mode bar in full-screen
                modeBarButtonsToAdd: ['toImage'],
                modeBarButtonsToRemove: ['sendDataToCloud'],
                displaylogo: false, // Hide the plotly logo
              }}
            />
            <button 
              onClick={toggleFullScreen} 
              className="exit-full-screen"
              title="Exit full-screen mode"
            >
              Exit Full Screen
            </button>
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
        
        /* Full-screen toggle button styles */
        .full-screen-toggle {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 5;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        
        .full-screen-toggle:hover {
          background-color: rgba(0, 0, 0, 0.9);
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
        }
        
        .exit-full-screen {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 1001;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        
        .exit-full-screen:hover {
          background-color: rgba(0, 0, 0, 0.9);
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