import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
const logger = require('../../utils/logger');
import { checkApiHealth } from '../../services/api/stock';

// Dynamically import the StockChart component
const StockChart = dynamic(() => import('../../components/stock/StockChart'), {
  ssr: false,
  loading: () => <p>Loading Stock Analysis Tool...</p>
});

const StocksPage = () => {
  const [apiStatus, setApiStatus] = useState({
    checked: false,
    healthy: false,
    message: 'Checking API status...'
  });

  // Check API status on component mount
  useEffect(() => {
    const checkAPI = async () => {
      try {
        logger.info('Checking API health');
        
        // Perform the health check with error handling
        let isHealthy = false;
        
        try {
          isHealthy = await checkApiHealth();
        } catch (healthError) {
          logger.error(`Error during health check: ${healthError?.message || 'Unknown error'}`);
          isHealthy = false;
        }
        
        setApiStatus({
          checked: true,
          healthy: isHealthy,
          message: isHealthy 
            ? 'API is connected and ready' 
            : 'API connection failed. Please ensure the backend server is running.'
        });
        
        logger.info(`API health check complete. Status: ${isHealthy ? 'healthy' : 'unhealthy'}`);
      } catch (error) {
        const errorMessage = error?.message || 'Unknown error occurred';
        logger.error(`API health check error: ${errorMessage}`);
        
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
      <h1>Stock Market Analysis</h1>
      
      {/* API Status Indicator */}
      <div className={`api-status ${apiStatus.healthy ? 'healthy' : 'unhealthy'}`}>
        <span className="status-indicator"></span>
        <span className="status-text">{apiStatus.message || 'Status unknown'}</span>
      </div>
      
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
          display: flex;
          align-items: center;
          margin-bottom: 20px;
          padding: 10px 15px;
          border-radius: 4px;
          background-color: #0d1b2a;
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