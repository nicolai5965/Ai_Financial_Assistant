import React from 'react';
import { logger } from '../../utils/logger';

/**
 * CompanyInfoWidget - Displays company information including name, sector, industry, country, and website
 * 
 * @param {Object} props Component props
 * @param {Object} props.data Company information data from dashboard endpoint
 */
const CompanyInfoWidget = ({ data }) => {
  // Color constants to match app theme

  console.log("Debug Console log:CompanyInfoWidget: data:", data); // Will be deleted after testing
  
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

  // Main container style to match app theme
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
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
      <div style={{ 
        fontSize: '18px', 
        fontWeight: 'bold', 
        marginBottom: '10px',
        color: COLORS.ACCENT_PRIMARY,
        borderBottom: `1px solid ${COLORS.ACCENT_PRIMARY}`,
        paddingBottom: '5px'
      }}>
        {data.name}
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <span style={{ color: COLORS.TEXT_SECONDARY }}>Sector: </span>
        <span style={{ color: COLORS.TEXT_PRIMARY }}>{data.sector}</span>
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <span style={{ color: COLORS.TEXT_SECONDARY }}>Industry: </span>
        <span style={{ color: COLORS.TEXT_PRIMARY }}>{data.industry}</span>
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <span style={{ color: COLORS.TEXT_SECONDARY }}>Country: </span>
        <span style={{ color: COLORS.TEXT_PRIMARY }}>{data.country}</span>
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <span style={{ color: COLORS.TEXT_SECONDARY }}>Website: </span>
        {data.website && data.website !== 'N/A' ? (
          <a 
            href={data.website} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: COLORS.ACCENT_PRIMARY,
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.color = COLORS.ACCENT_HOVER;
              e.target.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = COLORS.ACCENT_PRIMARY;
              e.target.style.textDecoration = 'none';
            }}
          >
            {data.website.replace(/^https?:\/\//, '')}
          </a>
        ) : (
          <span style={{ color: COLORS.TEXT_PRIMARY }}>{data.website}</span>
        )}
      </div>
    </div>
  );
};

export default CompanyInfoWidget; 