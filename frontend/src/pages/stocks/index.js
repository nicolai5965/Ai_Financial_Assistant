import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
const logger = require('../../utils/logger');
import { checkApiHealth } from '../../services/api/stock';

// Generate a simple unique ID for component instance tracking
const generateInstanceId = () => {
  return 'page-' + Math.random().toString(36).substring(2, 9);
}

// Dynamically import the StockChart component
const StockChart = dynamic(() => import('../../components/stock/StockChart'), {
  ssr: false,
  loading: () => <p>Loading Stock Analysis Tool...</p>
});

const StocksPage = () => {
  // Create a unique instance ID for this page component
  const instanceId = useRef(generateInstanceId());
  
  const [apiStatus, setApiStatus] = useState({
    checked: false,
    healthy: false,
    message: 'Checking API status...'
  });

  // Log when page component mounts
  useEffect(() => {
    logger.debug(`StocksPage component mounted (instance: ${instanceId.current})`);
    
    return () => {
      logger.debug(`StocksPage component unmounting (instance: ${instanceId.current})`);
    };
  }, []);

  // Check API status on component mount
  useEffect(() => {
    const checkAPI = async () => {
      try {
        logger.info(`Checking API health (instance: ${instanceId.current})`);
        
        // Perform the health check with error handling
        let isHealthy = false;
        
        try {
          isHealthy = await checkApiHealth();
        } catch (healthError) {
          logger.error(`Error during health check (instance: ${instanceId.current}): ${healthError?.message || 'Unknown error'}`);
          isHealthy = false;
        }
        
        setApiStatus({
          checked: true,
          healthy: isHealthy,
          message: isHealthy 
            ? 'API is connected and ready' 
            : 'API connection failed. Please ensure the backend server is running.'
        });
        
        logger.info(`API health check complete (instance: ${instanceId.current}). Status: ${isHealthy ? 'healthy' : 'unhealthy'}`);
      } catch (error) {
        const errorMessage = error?.message || 'Unknown error occurred';
        logger.error(`API health check error (instance: ${instanceId.current}): ${errorMessage}`);
        
        setApiStatus({
          checked: true,
          healthy: false,
          message: `API connection error: ${errorMessage}`
        });
      }
    };
    
    checkAPI();
  }, []);

  return (
    <div className="stocks-page">
      {/* API Status Indicator - moved above the title */}
      <div className={`api-status ${apiStatus.healthy ? 'healthy' : 'unhealthy'}`}>
        <span className="status-indicator"></span>
        <span className="status-text">{apiStatus.message || 'Status unknown'}</span>
      </div>
      
      <h1>Stock Market Analysis</h1>
      
      {/* Render StockChart only if API is healthy */}
      {apiStatus.healthy ? (
        <StockChart />
      ) : (
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
      )}
      
      <style jsx>{`
        .stocks-page {
          padding: 20px;
          color: #fff;
        }
        
        h1 {
          margin-bottom: 20px;
          color: #f8f8f8;
        }
        
        .api-status {
          display: inline-flex; /* Changed from flex to inline-flex */
          align-items: center;
          margin-bottom: 20px;
          padding: 10px 15px;
          border-radius: 4px;
          background-color: #0d1b2a;
          width: auto; /* Let it be only as wide as content */
        }
        
        .api-status.healthy {
          border-left: 4px solid #4CAF50;
        }
        
        .api-status.unhealthy {
          border-left: 4px solid #F44336;
        }
        
        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 10px;
        }
        
        .healthy .status-indicator {
          background-color: #4CAF50;
          box-shadow: 0 0 8px #4CAF50;
        }
        
        .unhealthy .status-indicator {
          background-color: #F44336;
          box-shadow: 0 0 8px #F44336;
        }
        
        .connection-error {
          background-color: #1B1610;
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
        }
        
        .connection-error code {
          display: block;
          background-color: #0d1b2a;
          padding: 10px;
          margin: 10px 0;
          border-radius: 4px;
          font-family: monospace;
        }
        
        button {
          padding: 10px 15px;
          background-color: #79B6F2;
          color: #0d1b2a;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          margin-top: 10px;
        }
        
        button:hover {
          background-color: #5a9cd9;
        }
      `}</style>
    </div>
  );
};

export default StocksPage; 