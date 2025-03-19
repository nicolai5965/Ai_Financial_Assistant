import React, { useState, useEffect } from 'react';
import { fetchCompanyInfo } from '../../services/api/stock';
import { logger } from '../../utils/logger';

/**
 * CompanyInfoWidget - Displays company information including name, sector, industry, country, and website
 * 
 * @param {Object} props Component props
 * @param {string} props.ticker Current stock ticker symbol
 */
const CompanyInfoWidget = ({ ticker }) => {
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Color constants to match app theme (same as MarketHoursWidget)
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

  // Fetch company information
  const getCompanyInfo = async () => {
    if (!ticker) return;
    
    try {
      setLoading(true);
      const response = await fetchCompanyInfo(ticker);
      
      // Check if the response contains an error
      if (response.error) {
        logger.error(`Error fetching company info: ${response.message}`);
        setError('Failed to load company information');
        setCompanyInfo(null);
      } else {
        setCompanyInfo(response);
        setError(null);
        logger.debug(`Company info loaded for ${ticker}`, response);
      }
    } catch (err) {
      // This catch is only for unexpected errors, not API errors
      logger.error(`Unexpected error fetching company info: ${err.message || 'Unknown error'}`);
      setError('Failed to load company information');
      setCompanyInfo(null);
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch company info when the ticker changes
  useEffect(() => {
    getCompanyInfo();
  }, [ticker]);

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

  // Loading state
  if (loading && !companyInfo) {
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <div style={{ borderTop: `2px solid ${COLORS.ACCENT_PRIMARY}`, borderRadius: '50%', width: '20px', height: '20px', marginRight: '10px', animation: 'spin 1s linear infinite' }}></div>
          <div style={{ color: COLORS.TEXT_PRIMARY }}>Loading company info...</div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={containerStyle}>
        <div style={{ color: COLORS.STATUS_CLOSED, width: '100%', textAlign: 'center' }}>{error}</div>
      </div>
    );
  }

  // No data state
  if (!companyInfo) {
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
        {companyInfo.name}
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <span style={{ color: COLORS.TEXT_SECONDARY }}>Sector: </span>
        <span style={{ color: COLORS.TEXT_PRIMARY }}>{companyInfo.sector}</span>
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <span style={{ color: COLORS.TEXT_SECONDARY }}>Industry: </span>
        <span style={{ color: COLORS.TEXT_PRIMARY }}>{companyInfo.industry}</span>
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <span style={{ color: COLORS.TEXT_SECONDARY }}>Country: </span>
        <span style={{ color: COLORS.TEXT_PRIMARY }}>{companyInfo.country}</span>
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <span style={{ color: COLORS.TEXT_SECONDARY }}>Website: </span>
        {companyInfo.website && companyInfo.website !== 'N/A' ? (
          <a 
            href={companyInfo.website} 
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
            {companyInfo.website.replace(/^https?:\/\//, '')}
          </a>
        ) : (
          <span style={{ color: COLORS.TEXT_PRIMARY }}>{companyInfo.website}</span>
        )}
      </div>
    </div>
  );
};

export default CompanyInfoWidget; 