import React from 'react';

/**
 * ErrorMessage component for displaying error messages in a consistent style
 * @param {Object} props - Component props
 * @param {string} props.message - The error message to display
 */
const ErrorMessage = ({ message }) => {
  if (!message) return null;
  
  // Check if it's a ticker not found error
  const isTickerError = message.includes('No data found for ticker');
  
  return (
    <div className={`error-message ${isTickerError ? 'ticker-error' : ''}`}>
      <p>{message}</p>
      
      {isTickerError && (
        <div className="error-suggestions">
          <p>Suggestions:</p>
          <ul>
            <li>Check if the ticker symbol is spelled correctly</li>
            <li>Make sure the company is publicly traded</li>
            <li>Try a well-known ticker like "AAPL", "MSFT", or "NVDA"</li>
          </ul>
        </div>
      )}
      
      <style jsx>{`
        .error-message {
          padding: 15px;
          background-color: rgba(255, 0, 0, 0.1);
          border-left: 4px solid #ff0000;
          margin-bottom: 20px;
          border-radius: 0 4px 4px 0;
        }
        
        .ticker-error {
          background-color: rgba(255, 0, 0, 0.15);
          border-left: 6px solid #ff0000;
        }
        
        .error-message p {
          margin: 0 0 10px 0;
          font-weight: ${isTickerError ? 'bold' : 'normal'};
        }
        
        .error-suggestions {
          margin-top: 10px;
        }
        
        .error-suggestions p {
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        .error-suggestions ul {
          margin: 0;
          padding-left: 20px;
        }
        
        .error-suggestions li {
          margin-bottom: 3px;
        }
      `}</style>
    </div>
  );
};

export default ErrorMessage; 