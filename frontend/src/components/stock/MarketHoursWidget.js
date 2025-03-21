import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger';

/**
 * MarketHoursWidget - Displays current market status and countdown timer
 * for when the market will open or close
 * 
 * @param {Object} props Component props
 * @param {Object} props.data Market hours data from dashboard endpoint
 */
const MarketHoursWidget = ({ data }) => {

  console.log("Debug Console log:MarketHoursWidget: data:", data); // Will be deleted after testing
  
  // Keep countdown state for timer functionality
  const [countdown, setCountdown] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Color constants from StockSettingsSidebar to match app theme
  const COLORS = {
    PRIMARY_DARK: 'rgba(13, 27, 42, 1)',      // Dark blue
    PRIMARY_LIGHT: 'rgba(26, 42, 58, 1)',     // Light blue
    ACCENT_PRIMARY: 'rgba(92, 230, 207, 1)',  // Cyan
    ACCENT_HOVER: 'rgba(59, 205, 186, 1)',    // Darker cyan
    TEXT_PRIMARY: 'rgba(248, 248, 248, 1)',   // White text
    TEXT_SECONDARY: 'rgba(204, 204, 204, 1)', // Light gray text
    SHADOW_COLOR: 'rgba(0, 0, 0, 0.5)',       // Black shadow
    SECTION_BG_COLOR: 'rgba(10, 20, 30, 0.6)',
    SECTION_BORDER: '1px solid rgba(92, 230, 207, 0.2)',
    SECTION_SHADOW: '0 2px 10px rgba(0, 0, 0, 0.2)',
    STATUS_OPEN: 'rgba(76, 175, 80, 1)',      // Green for open market using rgba
    STATUS_CLOSED: 'rgba(244, 67, 54, 1)'     // Red for closed market using rgba
  };

  // Function to format time
  const formatTime = (hours, minutes, seconds) => {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Function to update the countdown timer
  const updateCountdown = (secondsUntilChange) => {
    const hours = Math.floor(secondsUntilChange / 3600);
    const minutes = Math.floor((secondsUntilChange % 3600) / 60);
    const seconds = Math.floor(secondsUntilChange % 60);
    
    setCountdown({ hours, minutes, seconds });
  };

  // Effect to update the countdown every second
  useEffect(() => {
    if (!data) return;

    // Update the countdown immediately
    updateCountdown(data.seconds_until_change);

    // Set up interval to update countdown every second
    const timer = setInterval(() => {
      setCountdown(prev => {
        let totalSeconds = prev.hours * 3600 + prev.minutes * 60 + prev.seconds - 1;
        
        // If countdown reaches zero, parent will handle refresh
        if (totalSeconds <= 0) {
          return prev;
        }
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [data]);

  // Main container style to match app theme
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px',
    padding: '12px 16px',
    borderRadius: '8px',
    width: '250px',
    backgroundColor: COLORS.SECTION_BG_COLOR,
    border: COLORS.SECTION_BORDER,
    boxShadow: COLORS.SECTION_SHADOW,
    color: COLORS.TEXT_PRIMARY,
    transition: 'box-shadow 0.3s ease'
  };

  // Hover effect for container
  const containerHoverStyle = {
    ...containerStyle,
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3), 0 0 1px rgba(92, 230, 207, 0.3)'
  };

  // Status indicator styles
  const statusStyles = {
    open: {
      backgroundColor: COLORS.STATUS_OPEN,
      color: COLORS.PRIMARY_DARK,
      fontWeight: 'bold',
      textShadow: '0 1px 1px rgba(0, 0, 0, 0.2)'
    },
    closed: {
      backgroundColor: COLORS.STATUS_CLOSED,
      color: COLORS.PRIMARY_DARK,
      fontWeight: 'bold',
      textShadow: '0 1px 1px rgba(0, 0, 0, 0.2)'
    }
  };

  // No data state
  if (!data) {
    return null;
  }

  return (
    <div 
      style={containerStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = containerHoverStyle.boxShadow;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = containerStyle.boxShadow;
      }}
    >
      <div
        style={{
          ...statusStyles[data.is_market_open ? 'open' : 'closed'],
          padding: '10px 16px',
          borderRadius: '4px',
          marginRight: '16px',
          minWidth: '10px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase'
        }}
      >
        {data.is_market_open ? 'OPEN' : 'CLOSED'}
      </div>
      
      <div>
        <div style={{ 
          fontSize: '14px', 
          marginBottom: '6px', 
          color: COLORS.TEXT_SECONDARY,
          letterSpacing: '0.5px'
        }}>
          <strong style={{ color: COLORS.ACCENT_PRIMARY }}>{data.exchange}</strong> market {data.is_market_open ? 'closes' : 'opens'} in:
        </div>
        <div style={{ 
          fontSize: '22px', 
          fontWeight: 'bold',
          color: COLORS.TEXT_PRIMARY,
          letterSpacing: '1px',
          textShadow: '0 0 10px rgba(92, 230, 207, 0.4)'
        }}>
          {formatTime(countdown.hours, countdown.minutes, countdown.seconds)}
        </div>
      </div>
    </div>
  );
};

export default MarketHoursWidget; 