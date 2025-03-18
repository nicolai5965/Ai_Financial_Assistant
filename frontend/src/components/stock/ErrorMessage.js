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
  
  // Check if it's a generic processing error
  const isProcessingError = message.includes('Unable to process your request');
  
  // CSS class determined by error type
  const errorClass = `error-message ${isTickerError ? 'ticker-error' : ''} ${isProcessingError ? 'processing-error' : ''}`;
  
  // Font weight varies based on error type
  const messageFontWeight = isTickerError || isProcessingError ? 'bold' : 'normal';
  
  // Color constants for styling consistency
  const ERROR_BORDER_COLOR = '#ff0000';
  const ERROR_BG_COLOR = 'rgba(255, 0, 0, 0.1)';
  const TICKER_ERROR_BG_COLOR = 'rgba(255, 0, 0, 0.15)';
  const PROCESSING_ERROR_BG_COLOR = 'rgba(255, 165, 0, 0.15)'; // Orange tint for processing errors
  const PROCESSING_ERROR_BORDER_COLOR = '#ff9900';
  
  // Icon based on error type
  const errorIcon = isTickerError ? '⚠️' : (isProcessingError ? '⚙️' : '❌');
  
  return (
    <div className={errorClass}>
      <div className="error-header">
        <span className="error-icon">{errorIcon}</span>
        <p>{message}</p>
      </div>
      
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
      
      {/* Show suggestions for processing errors */}
      {isProcessingError && (
        <div className="error-suggestions">
          <p>Suggestions:</p>
          <ul>
            <li>Try entering a valid stock ticker like "AAPL", "MSFT", or "NVDA"</li>
            <li>Check your internet connection</li>
            <li>Wait a few moments and try again</li>
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
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .error-header {
          display: flex;
          align-items: flex-start;
        }
        
        .error-icon {
          margin-right: 10px;
          font-size: 18px;
        }
        
        .ticker-error {
          background-color: ${TICKER_ERROR_BG_COLOR};
          border-left: 6px solid ${ERROR_BORDER_COLOR};
        }
        
        .processing-error {
          background-color: ${PROCESSING_ERROR_BG_COLOR};
          border-left: 6px solid ${PROCESSING_ERROR_BORDER_COLOR};
        }
        
        .error-message p {
          margin: 0 0 10px 0;
          font-weight: ${messageFontWeight};
        }
        
        .error-suggestions {
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
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