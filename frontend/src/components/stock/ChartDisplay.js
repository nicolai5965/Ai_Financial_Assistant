import React, { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Plotly from 'plotly.js-dist-min';
import { logger } from '../../utils/logger';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const CHART_HEIGHT = '600px';
const CHART_WIDTH = '100%';

const ChartDisplay = ({ chartData, isLoading, prevChartData, onUpdateClick }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const resizeTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const plotDivRef = useRef(null);
  const prevChartDivRef = useRef(null);

  const toggleFullScreen = () => {
    const newState = !isFullScreen;
    setIsFullScreen(newState);
    logger.info(`ChartDisplay: Full-screen mode ${newState ? 'enabled' : 'disabled'}`);
  };

  const handleUpdate = () => {
    if (onUpdateClick) {
      logger.info('ChartDisplay: Manual chart update requested');
      onUpdateClick();
    }
  };

  const processChartData = (data) => {
    logger.debug('ChartDisplay: Processing chart data:', { rawData: data });
    if (!data) {
      logger.debug('ChartDisplay: No data provided to process');
      return { data: [], layout: {}, originalTitle: "" };
    }
    try {
      const parsedData = typeof data === "string" ? JSON.parse(data) : data;
      logger.debug('ChartDisplay: Successfully parsed data:', { parsedData });
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
      logger.debug('ChartDisplay: Processed chart data:', {
        dataLength: parsedData.data?.length || 0,
        hasLayout: !!parsedData.layout,
        originalTitle
      });
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

  const fixedChartHeight = parseInt(CHART_HEIGHT);

  const hasChartData = Boolean(chartData);
  const processedChartData = useMemo(() => {
    return hasChartData ? processChartData(chartData) : { data: [], layout: {}, originalTitle: "" };
  }, [chartData]);

  const processedPrevChartData = useMemo(() => {
    return prevChartData ? processChartData(prevChartData) : { data: [], layout: {}, originalTitle: "" };
  }, [prevChartData]);

  const getChartTitle = () => {
    return processedChartData.originalTitle || "Chart";
  };

  const handleResize = () => {
    if (!plotDivRef.current) return;
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && plotDivRef.current) {
        Plotly.Plots.resize(plotDivRef.current);
        logger.debug("ChartDisplay: Plotly resize triggered");
      }
    }, 250);
  };

  const handleRelayout = (layout) => {
    const heightChangeThreshold = 1;
    if (layout.height && Math.abs(layout.height - fixedChartHeight) > heightChangeThreshold) {
      Plotly.Plots.resize(plotDivRef.current);
      logger.debug("ChartDisplay: Plotly resize triggered via relayout (significant height change)");
    } else {
      logger.debug("ChartDisplay: Minor height change in relayout, ignored");
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
        logger.info('ChartDisplay: full-screen mode disabled via Escape key');
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    isMountedRef.current = true;
        // NEW: Store the previous chart's content when new data is loading.
        if (isLoading && prevChartData && plotDivRef.current) {
            prevChartDivRef.current = plotDivRef.current.innerHTML;
        }
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [isFullScreen, isLoading, prevChartData]); // Add isLoading and prevChartData

  const plotlyConfig = {
    responsive: true,
    displayModeBar: false,
    modeBarButtonsToAdd: ['toImage'],
    modeBarButtonsToRemove: ['sendDataToCloud'],
    displaylogo: false,
  };

  return (
    <div className="chart-display">
      {!isFullScreen && hasChartData && (
        <div className="chart-banner">
          <h3 className="chart-title">{getChartTitle()}</h3>
          <div className="banner-buttons">
            <button
              onClick={handleUpdate}
              className="update-button"
              title="Update chart and KPIs"
              disabled={isLoading}
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

      {/* Regular chart view (non-fullscreen) - Conditionally render Plot or placeholder */}
        {!isFullScreen && hasChartData && (
            <div style={{ position: 'relative' }}>
                {/* Render the actual Plot component only when NOT loading */}
                {!isLoading && (
                    <div ref={plotDivRef} style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}>
                        <Plot
                            data={processedChartData.data}
                            layout={processedChartData.layout}
                            style={{ width: "100%", height: "100%" }}
                            useResizeHandler={true}
                            config={plotlyConfig}
                            onRelayout={handleRelayout}
                        />
                    </div>
                )}

                {/* Render a placeholder with the PREVIOUS chart's content while loading */}
                {isLoading && prevChartData && (
                    <div
                        ref={plotDivRef}
                        style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}
                        dangerouslySetInnerHTML={{ __html: prevChartDivRef.current || '' }}
                    />
                )}
                {/* Loading overlay, now simpler */}
                {isLoading && (
                    <div className="loading-overlay">
                        <div className="loading-spinner">Loading...</div>
                    </div>
                )}
            </div>
        )}

      {/* Loading state when there is no previous data */}
      {isLoading && !prevChartData && <p>Loading chart...</p>}

    {/* Full-screen modal view - Conditionally render Plot or placeholder*/}
    {isFullScreen && hasChartData && (
        <div className="full-screen-modal">
          <div className="full-screen-content">
            <div className="chart-banner fullscreen">
              <h3 className="chart-title">{getChartTitle()}</h3>
              <div className="banner-buttons">
                <button
                  onClick={handleUpdate}
                  className="update-button"
                  title="Update chart and KPIs"
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating...' : 'Update'}
                </button>
                <button
                  onClick={toggleFullScreen}
                  className="full-screen-toggle"
                  title="Exit full-screen mode"
                >
                  Exit Full Screen
                </button>
              </div>
            </div>
                {!isLoading && (
                    <div ref={plotDivRef} style={{ width: "100%", height: "calc(100% - 50px)" }}>
                    <Plot
                        data={processedChartData.data}
                        layout={processedChartData.layout}
                        style={{ width: "100%", height: "100%" }}
                        useResizeHandler={true}
                        config={plotlyConfig}
                    />
                    </div>
                )}

                {/* Render a placeholder with the PREVIOUS chart's content while loading */}
                {isLoading && prevChartData && (
                    <div
                        ref={plotDivRef}
                        style={{  width: "100%", height: "calc(100% - 50px)" }}
                        dangerouslySetInnerHTML={{ __html: prevChartDivRef.current || '' }}
                    />
                )}
            <div className="keyboard-hint">
              Press ESC to exit full-screen
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .chart-display {
          position: relative;
          min-height: 670px;
          margin-top: 5px;
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
          margin: 0px;
          font-size: 20px;
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

        .banner-buttons {
          display: flex;
          align-items: center;
        }

        .update-button {
          background-color:rgb(35, 37, 175);
          color: white;
          margin-right: 15px;
          padding: 8px 25px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .update-button:hover {
          background-color:rgb(24, 26, 122);
        }

        .update-button:disabled {
          background-color:rgb(35, 37, 175);
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default React.memo(ChartDisplay);