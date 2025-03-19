import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { logger } from '../../utils/logger';
import { checkApiHealth } from '../../services/api/stock';
import MarketHoursWidget from '../../components/stock/MarketHoursWidget';
import CompanyInfoWidget from '../../components/stock/CompanyInfoWidget';

// Color constants for styling
const COLORS = {
  HEALTHY: '#4CAF50',
  UNHEALTHY: '#F44336',
  BUTTON_PRIMARY: '#79B6F2',
  BUTTON_HOVER: '#5a9cd9',
  DARK_BLUE: '#0d1b2a',
  SHADOW_BLACK: '#1B1610',
  WHITE: '#fff',
  LIGHT_GRAY: '#f8f8f8'
};

// API status message constants
const API_MESSAGES = {
  CHECKING: 'Checking API status...',
  CONNECTED: 'API is connected and ready',
  FAILED: 'API connection failed. Please ensure the backend server is running.'
};

/**
 * Generates a simple unique ID for component instance tracking
 * @returns {string} A unique identifier string
 */
const generateInstanceId = () => {
  return 'page-' + Math.random().toString(36).substring(2, 9);
};

// Dynamically import the StockChart component with SSR disabled
const StockChart = dynamic(() => import('../../components/stock/StockChart'), {
  ssr: false,
  loading: () => <p>Loading Stock Analysis Tool...</p>
});

/**
 * Stock Market Analysis page component
 * Provides stock chart analysis functionality with API health check
 */
const StocksPage = () => {
  // Create a unique instance ID for this page component for reliable tracking
  const instanceId = useRef(generateInstanceId());
  
  // API health status state
  const [apiStatus, setApiStatus] = useState({
    checked: false,
    healthy: false,
    message: API_MESSAGES.CHECKING
  });

  // Add state for current ticker
  const [currentTicker, setCurrentTicker] = useState('AAPL'); // Default ticker

  // Log when page component mounts and unmounts
  useEffect(() => {
    const id = instanceId.current;
    logger.debug(`StocksPage component mounted (instance: ${id})`);
    
    return () => {
      logger.debug(`StocksPage component unmounting (instance: ${id})`);
    };
  }, []);

  // Check API status on component mount
  useEffect(() => {
    const performApiHealthCheck = async () => {
      const id = instanceId.current;
      logger.info(`Checking API health (instance: ${id})`);
      
      try {
        // Attempt API health check
        const isHealthy = await checkApiHealth();
        
        // Update API status based on health check result
        setApiStatus({
          checked: true,
          healthy: isHealthy,
          message: isHealthy ? API_MESSAGES.CONNECTED : API_MESSAGES.FAILED
        });
        
        logger.info(`API health check complete (instance: ${id}). Status: ${isHealthy ? 'healthy' : 'unhealthy'}`);
      } catch (error) {
        // Handle any errors during health check
        const errorMessage = error?.message || 'Unknown error occurred';
        logger.error(`API health check error (instance: ${id}): ${errorMessage}`);
        
        setApiStatus({
          checked: true,
          healthy: false,
          message: `API connection error: ${errorMessage}`
        });
      }
    };
    
    performApiHealthCheck();
  }, []);

  // Render the connection error component when API is unhealthy
  const renderConnectionError = () => (
    <div className="connection-error">
      <h3>Cannot connect to the analysis service</h3>
      <p>
        Please ensure the backend server is running by executing:
        <code>python start_api_server.py</code> in the backend directory.
      </p>
      {apiStatus.checked && (
        <button onClick={() => window.location.reload()}>
          Retry Connection
        </button>
      )}
    </div>
  );

  // Render the API status indicator
  const renderApiStatusIndicator = () => (
    <div className={`api-status ${apiStatus.healthy ? 'healthy' : 'unhealthy'}`}>
      <span className="status-indicator"></span>
      <span className="status-text">{apiStatus.message || 'Status unknown'}</span>
    </div>
  );

  // Callback to update the current ticker when the StockChart ticker changes
  const handleTickerChange = (ticker) => {
    logger.debug(`Ticker changed to: ${ticker}`);
    setCurrentTicker(ticker);
  };

  return (
    <div className="stocks-page">
      {/* API Status Indicator positioned above the title */}
      {renderApiStatusIndicator()}
      
      <h1>Stock Market Analysis</h1>
      
      {/* Info widgets container with both Market Hours and Company Info */}
      {apiStatus.healthy && currentTicker && (
        <div className="info-widgets-container">
          <MarketHoursWidget ticker={currentTicker} />
          <CompanyInfoWidget ticker={currentTicker} />
        </div>
      )}
      
      {/* Conditionally render StockChart or connection error based on API health */}
      {apiStatus.healthy ? (
        <StockChart onTickerChange={handleTickerChange} />
      ) : (
        renderConnectionError()
      )}
      
      <style jsx>{`
        .stocks-page {
          padding: 20px;
          color: ${COLORS.WHITE};
        }
        
        h1 {
          margin-bottom: 20px;
          color: ${COLORS.LIGHT_GRAY};
        }
        
        .info-widgets-container {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        /* Responsive styling for smaller screens */
        @media (max-width: 768px) {
          .info-widgets-container {
            flex-direction: column;
          }
        }
        
        .api-status {
          display: inline-flex;
          align-items: center;
          margin-bottom: 20px;
          padding: 10px 15px;
          border-radius: 4px;
          background-color: ${COLORS.DARK_BLUE};
          width: auto;
        }
        
        .api-status.healthy {
          border-left: 4px solid ${COLORS.HEALTHY};
        }
        
        .api-status.unhealthy {
          border-left: 4px solid ${COLORS.UNHEALTHY};
        }
        
        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 10px;
        }
        
        .healthy .status-indicator {
          background-color: ${COLORS.HEALTHY};
          box-shadow: 0 0 8px ${COLORS.HEALTHY};
        }
        
        .unhealthy .status-indicator {
          background-color: ${COLORS.UNHEALTHY};
          box-shadow: 0 0 8px ${COLORS.UNHEALTHY};
        }
        
        .connection-error {
          background-color: ${COLORS.SHADOW_BLACK};
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
        }
        
        .connection-error code {
          display: block;
          background-color: ${COLORS.DARK_BLUE};
          padding: 10px;
          margin: 10px 0;
          border-radius: 4px;
          font-family: monospace;
        }
        
        button {
          padding: 10px 15px;
          background-color: ${COLORS.BUTTON_PRIMARY};
          color: ${COLORS.DARK_BLUE};
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          margin-top: 10px;
        }
        
        button:hover {
          background-color: ${COLORS.BUTTON_HOVER};
        }
      `}</style>
    </div>
  );
};

export default StocksPage; 