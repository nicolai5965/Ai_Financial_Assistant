import React, { useState, useEffect, useRef } from 'react';
const logger = require('../../utils/logger');
import { fetchStockChart } from '../../services/api/stock';

// Import the new components
import ChartConfigurationForm from './ChartConfigurationForm';
import IndicatorConfigurationPanel from './IndicatorConfigurationPanel';
import ChartDisplay from './ChartDisplay';
import ErrorMessage from './ErrorMessage';

// Default panel placement for each indicator
const DEFAULT_PANEL_PLACEMENT = {
  'SMA': 'main',
  'EMA': 'main',
  'Bollinger Bands': 'main',
  'VWAP': 'main',
  'Ichimoku Cloud': 'main',
  'RSI': 'oscillator',
  'Stochastic Oscillator': 'oscillator',
  'MACD': 'macd',
  'ATR': 'volatility',
  'OBV': 'volume'
};

// Default indicator parameters
const DEFAULT_INDICATOR_PARAMS = {
  'SMA': { window: 20 },
  'EMA': { window: 20 },
  'Bollinger Bands': { window: 20, std_dev: 2 },
  'RSI': { window: 14 },
  'MACD': { fast_window: 12, slow_window: 26, signal_window: 9 },
  'ATR': { window: 14 },
  'Stochastic Oscillator': { k_window: 14, d_window: 3 },
  'Ichimoku Cloud': { conversion_period: 9, base_period: 26, lagging_span_b_period: 52 }
  // VWAP and OBV don't have configurable parameters
};

// Default configuration
const DEFAULT_CONFIG = {
  ticker: 'NVDA',
  days: 30,
  interval: '1h',
  indicators: [],
  chartType: 'candlestick'
};

/**
 * StockChart component for displaying stock charts with technical indicators.
 * Acts as the main container orchestrating the form, indicator panel, and chart display.
 */
const StockChart = () => {
  // State for form controls
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for the chart data
  const [chartData, setChartData] = useState(null);
  
  // State for indicator configurations
  const [indicatorConfigs, setIndicatorConfigs] = useState({});
  
  // State for panel assignments
  const [panelAssignments, setPanelAssignments] = useState({});
  
  // Ref to keep track of the previous chart while loading new one
  const prevChartRef = useRef(null);
  
  // Load initial chart on component mount
  useEffect(() => {
    logger.debug('StockChart component mounted, loading initial chart');
    loadChart(DEFAULT_CONFIG);
  }, []);
  
  // Automatically reload chart when configuration changes
  useEffect(() => {
    // Skip the initial render
    if (config === DEFAULT_CONFIG) return;
    
    // Use a debounce to prevent too many requests
    const handler = setTimeout(() => {
      logger.debug('Config changed, reloading chart');
      loadChart(config);
    }, 500); // 500ms debounce
    
    // Clean up timeout
    return () => clearTimeout(handler);
  }, [config]); // Re-run when config changes
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
    logger.debug(`Config ${name} changed to ${value}`);
  };
  
  // Handle indicator selection
  const handleIndicatorChange = (e) => {
    const value = e.target.value;
    
    // Check if the indicator is already selected in current config
    const isSelected = config.indicators.some(ind => 
      typeof ind === 'string' ? ind === value : ind.name === value
    );
    
    // Create state update objects
    let newIndicators;
    let newConfigs = { ...indicatorConfigs };
    let newPanelAssignments = { ...panelAssignments };
    
    if (isSelected) {
      // Remove the indicator
      newIndicators = config.indicators.filter(ind => 
        typeof ind === 'string' ? ind !== value : ind.name !== value
      );
      
      // Also remove from configurations and panel assignments
      delete newConfigs[value];
      delete newPanelAssignments[value];
    } else {
      // Add the indicator with default config if it has parameters
      if (value in DEFAULT_INDICATOR_PARAMS) {
        // Create a new configuration object with default values
        const defaultParams = DEFAULT_INDICATOR_PARAMS[value];
        newConfigs[value] = { ...defaultParams };
        
        // Add to indicators list as an object with name
        newIndicators = [...config.indicators, { name: value }];
        
        // Set default panel assignment
        newPanelAssignments[value] = DEFAULT_PANEL_PLACEMENT[value] || 'main';
      } else {
        // Add simple string for indicators without parameters
        newIndicators = [...config.indicators, value];
        
        // Set default panel assignment
        newPanelAssignments[value] = DEFAULT_PANEL_PLACEMENT[value] || 'main';
      }
    }
    
    // Batch the state updates to reduce re-renders
    setIndicatorConfigs(newConfigs);
    setPanelAssignments(newPanelAssignments);
    setConfig(prev => {
      const updatedConfig = { ...prev, indicators: newIndicators };
      logger.debug(`Indicators updated: ${newIndicators.map(ind => 
        typeof ind === 'string' ? ind : ind.name).join(', ')}`);
      return updatedConfig;
    });
  };
  
  // Handle parameter change for indicators
  const handleParamChange = (indicatorName, paramName, value) => {
    // Create new configs object
    const newConfigs = {
      ...indicatorConfigs,
      [indicatorName]: {
        ...indicatorConfigs[indicatorName],
        [paramName]: Number(value)
      }
    };
    
    // Create new indicators array for config
    const newIndicators = config.indicators.map(ind => {
      if (typeof ind === 'object' && ind.name === indicatorName) {
        return { name: indicatorName, ...newConfigs[indicatorName] };
      }
      return ind;
    });
    
    // Log once
    logger.debug(`Updated ${paramName} for ${indicatorName} to ${value}`);
    
    // Batch updates to minimize renders
    setIndicatorConfigs(newConfigs);
    setConfig(prev => ({
      ...prev,
      indicators: newIndicators
    }));
  };
  
  // Handle panel assignment change for indicators
  const handlePanelChange = (indicatorName, panelName) => {
    // Create new assignments object
    const newAssignments = {
      ...panelAssignments,
      [indicatorName]: panelName
    };
    
    // Log
    logger.debug(`Updated panel for ${indicatorName} to ${panelName}`);
    
    // Update panel assignments
    setPanelAssignments(newAssignments);
  };
  
  // Load chart data from API
  const loadChart = async (chartConfig) => {
    setIsLoading(true);
    setError(null);
    
    // Store current chart for display while loading
    if (chartData) {
      prevChartRef.current = chartData.chart;
    }
    
    try {
      logger.info(`Loading chart for ${chartConfig.ticker} with ${chartConfig.indicators.length} indicators`);
      
      // Apply the latest indicator configurations and panel assignments before sending
      const configToSend = {
        ...chartConfig,
        indicators: chartConfig.indicators.map(ind => {
          if (typeof ind === 'string') {
            // For simple string indicators, add panel assignment
            return {
              name: ind,
              panel: panelAssignments[ind] || DEFAULT_PANEL_PLACEMENT[ind] || 'main'
            };
          } else {
            const name = ind.name;
            // Ensure all parameter values are numbers, not strings
            const params = { 
              name,
              panel: panelAssignments[name] || DEFAULT_PANEL_PLACEMENT[name] || 'main'
            };
            
            if (indicatorConfigs[name]) {
              Object.entries(indicatorConfigs[name]).forEach(([key, value]) => {
                // Convert string values to numbers for numeric parameters
                if (typeof value === 'string' && !isNaN(value)) {
                  params[key] = Number(value);
                } else {
                  params[key] = value;
                }
              });
            }
            
            return params;
          }
        })
      };
      
      logger.debug('Sending chart configuration:', configToSend);
      
      const data = await fetchStockChart(configToSend);
      setChartData(data);
      logger.info('Chart data loaded successfully');
    } catch (err) {
      // Extract the most helpful error message
      let errorMessage = err.message || 'Unknown error';
      
      // Check if it's an API error with more details
      if (errorMessage.includes('Error processing request') || 
          errorMessage.includes('Validation Error')) {
        logger.error('API Error Details:', err);
        
        // Try to extract specific error about indicator configuration
        if (errorMessage.includes('IndicatorConfig')) {
          errorMessage = 'Error with indicator configuration. Please check the parameters and try again.';
        }
      }
      
      setError(errorMessage);
      logger.error(`Failed to load chart: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form submission for ticker/time period changes
  const handleSubmit = (e) => {
    e.preventDefault();
    logger.info('Submitting new ticker/time period configuration');
    loadChart(config);
  };

  return (
    <div className="stock-chart-container">
      <h2>Stock Chart Analysis</h2>
      
      {/* Configuration Form */}
      <ChartConfigurationForm
        config={config}
        onInputChange={handleInputChange}
        onIndicatorChange={handleIndicatorChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
      
      {/* Indicator Parameter Configuration Panels */}
      {config.indicators.length > 0 && (
        <IndicatorConfigurationPanel
          selectedIndicators={config.indicators}
          indicatorConfigs={indicatorConfigs}
          panelAssignments={panelAssignments}
          onParamChange={handleParamChange}
          onPanelChange={handlePanelChange}
        />
      )}
      
      {/* Error Message */}
      <ErrorMessage message={error} />
      
      {/* Chart Display */}
      <ChartDisplay
        chartData={chartData?.chart}
        isLoading={isLoading}
        prevChartData={prevChartRef.current}
      />
      
      <style jsx>{`
        .stock-chart-container {
          padding: 20px;
          background-color: #1B1610;
          border-radius: 8px;
          margin: 20px 0;
          color: #fff;
        }
      `}</style>
    </div>
  );
};

export default StockChart; 