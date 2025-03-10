import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Plot with no SSR to avoid server-side rendering issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

/**
 * ChartDisplay component for rendering the Plotly chart and managing loading states
 * Handles displaying the chart, loading spinner, and previous chart during loading
 */
const ChartDisplay = ({ chartData, isLoading, prevChartData }) => {
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
      
      {/* Show current chart when not loading */}
      {!isLoading && chartData && (
        <Plot 
          data={chartData ? JSON.parse(chartData).data || [] : []}
          layout={chartData ? JSON.parse(chartData).layout || {} : {}}
          style={{ width: "100%", height: "600px" }}
          useResizeHandler={true}
        />
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
      `}</style>
    </div>
  );
};

export default ChartDisplay; 