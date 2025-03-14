/**
 * Test page for KPI Dashboard integration
 * 
 * This page demonstrates the KPI Dashboard with all metric groups and tooltips.
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { KpiDashboard } from '../components/stock/kpi';
import { fetchStockKpis } from '../services/api/kpi';

export default function TestKpiPage() {
  const [kpiData, setKpiData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticker, setTicker] = useState('AAPL');

  // Fetch KPI data on component mount or when ticker changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`Fetching KPI data for ${ticker}`);
        const data = await fetchStockKpis(
          ticker, 
          ['price', 'volume', 'volatility', 'fundamental'],
          '1d'
        );
        
        setKpiData(data);
        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
        console.error(`Error fetching KPI data: ${err.message}`);
      }
    };

    fetchData();
  }, [ticker]);

  // Handle ticker input change
  const handleTickerChange = (e) => {
    setTicker(e.target.value.toUpperCase());
  };

  // Handle refresh button click
  const handleRefresh = () => {
    // Re-fetch data for the current ticker
    if (ticker) {
      const fetchData = async () => {
        try {
          setIsLoading(true);
          setError(null);
          
          console.log(`Refreshing KPI data for ${ticker}`);
          const data = await fetchStockKpis(
            ticker, 
            ['price', 'volume', 'volatility', 'fundamental'],
            '1d',
            false // don't use cache for refresh
          );
          
          setKpiData(data);
          setIsLoading(false);
        } catch (err) {
          setError(err.message);
          setIsLoading(false);
          console.error(`Error refreshing KPI data: ${err.message}`);
        }
      };
  
      fetchData();
    }
  };

  // Handle KPI click to demonstrate tooltip functionality
  const handleKpiClick = (kpi) => {
    console.log('KPI clicked:', kpi.name);
  };

  return (
    <div className="container">
      <Head>
        <title>KPI Dashboard Test</title>
        <meta name="description" content="Test page for KPI Dashboard integration" />
      </Head>

      <main>
        <h1>KPI Dashboard Test</h1>
        
        <div className="ticker-input">
          <input 
            type="text" 
            value={ticker} 
            onChange={handleTickerChange} 
            placeholder="Enter ticker symbol"
          />
          <button onClick={handleRefresh}>Refresh</button>
        </div>

        <div className="dashboard-container">
          <KpiDashboard 
            kpiData={kpiData}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onKpiClick={handleKpiClick}
            viewPreferences={{
              visibleGroups: ['price', 'volume', 'volatility', 'fundamental'],
              expandedGroups: ['price', 'volume', 'volatility', 'fundamental'],
            }}
          />
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 1rem;
          background-color: #121212;
          color: #ffffff;
        }

        main {
          padding: 2rem 0;
          max-width: 1200px;
          margin: 0 auto;
        }

        h1 {
          margin-bottom: 2rem;
          font-size: 1.5rem;
        }

        .ticker-input {
          display: flex;
          margin-bottom: 2rem;
        }

        input {
          padding: 0.5rem 1rem;
          font-size: 1rem;
          border: 1px solid #444;
          background-color: #222;
          color: #fff;
          border-radius: 4px 0 0 4px;
          flex-grow: 1;
          max-width: 200px;
        }

        button {
          padding: 0.5rem 1rem;
          font-size: 1rem;
          background-color: #2a2a2a;
          color: white;
          border: 1px solid #444;
          border-left: none;
          border-radius: 0 4px 4px 0;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        button:hover {
          background-color: #3a3a3a;
        }

        .dashboard-container {
          border: 1px solid #333;
          border-radius: 6px;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
} 