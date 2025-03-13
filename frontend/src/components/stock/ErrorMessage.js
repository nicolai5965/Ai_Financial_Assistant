import React from 'react';

/**
 * ErrorMessage component for displaying error messages in a consistent style
 * @param {Object} props - Component props
 * @param {string} props.message - The error message to display
 * @returns {React.ReactNode|null} - Returns the error component or null if no message
 */
const ErrorMessage = ({ message }) => {
  // If no message is provided, don't render anything
  if (!message) return null;
  
  // Check if it's a ticker not found error
  const isTickerError = message.includes('No data found for ticker');
  
  // CSS class determined by error type
  const errorClass = `error-message ${isTickerError ? 'ticker-error' : ''}`;
  
  // Font weight varies based on error type
  const messageFontWeight = isTickerError ? 'bold' : 'normal';
  
  // Color constants for styling consistency
  const ERROR_BORDER_COLOR = '#ff0000';
  const ERROR_BG_COLOR = 'rgba(255, 0, 0, 0.1)';
  const TICKER_ERROR_BG_COLOR = 'rgba(255, 0, 0, 0.15)';
  
  return (
    <div className={errorClass}>
      <p>{message}</p>
      
      {/* Only show suggestions for ticker-related errors */}
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
          background-color: ${ERROR_BG_COLOR};
          border-left: 4px solid ${ERROR_BORDER_COLOR};
          margin-bottom: 20px;
          border-radius: 0 4px 4px 0;
        }
        
        .ticker-error {
          background-color: ${TICKER_ERROR_BG_COLOR};
          border-left: 6px solid ${ERROR_BORDER_COLOR};
        }
        
        .error-message p {
          margin: 0 0 10px 0;
          font-weight: ${messageFontWeight};
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