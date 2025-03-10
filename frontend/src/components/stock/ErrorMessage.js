import React from 'react';

/**
 * ErrorMessage component for displaying error messages in a consistent style
 * @param {Object} props - Component props
 * @param {string} props.message - The error message to display
 */
const ErrorMessage = ({ message }) => {
  if (!message) return null;
  
  return (
    <div className="error-message">
      <p>Error: {message}</p>
      
      <style jsx>{`
        .error-message {
          padding: 10px;
          background-color: rgba(255, 0, 0, 0.1);
          border-left: 4px solid #ff0000;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
};

export default ErrorMessage; 