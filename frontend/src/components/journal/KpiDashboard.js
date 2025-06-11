import React, { useState, useEffect } from 'react';
import { fetchJournalStatistics } from '../../services/api/journal';
import { logger } from '../../utils/logger';
import StatBox from './kpi/StatBox';

const KpiDashboard = ({ refreshKey }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadStatistics = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchJournalStatistics();
                setStats(data);
            } catch (err) {
                logger.error("Failed to load journal statistics:", err);
                setError(err.message || 'Could not load statistics.');
            } finally {
                setLoading(false);
            }
        };

        loadStatistics();
    }, [refreshKey]); // Depend on refreshKey to trigger a re-fetch

    // --- Derived Metric Calculations ---

    const formatCurrency = (value) => {
        if (typeof value !== 'number') return 'N/A';
        return value.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
        });
    };

    const calculateWinLossRate = () => {
        if (!stats || (stats.win_count + stats.loss_count === 0)) {
            return 'N/A';
        }
        const rate = (stats.win_count / (stats.win_count + stats.loss_count)) * 100;
        return `${rate.toFixed(1)}%`;
    };

    const currentBalance = stats ? stats.initial_account_balance + stats.total_pnl : 0;
    const pnlColor = stats && stats.total_pnl < 0 ? '#ef5350' : '#66bb6a'; // Red for loss, Green for profit
    const winLossRate = calculateWinLossRate();

    if (loading) {
        return <div className="kpi-loading">Loading Statistics...</div>;
    }

    if (error) {
        return <div className="kpi-error">Error: {error}</div>;
    }
    
    if (!stats) return null;

    return (
        <div className="kpi-dashboard">
            <StatBox 
                title="Current Balance"
                value={formatCurrency(currentBalance)}
            />
            <StatBox 
                title="Total P&L"
                value={formatCurrency(stats.total_pnl)}
                color={pnlColor}
            />
            <StatBox 
                title="Win/Loss Rate"
                value={winLossRate}
                disclaimer="(Excludes breakeven trades)"
            />
            <StatBox 
                title="Avg. Expected R"
                value={stats.avg_expected_r ? stats.avg_expected_r.toFixed(2) : 'N/A'}
                unit="R"
            />
            <StatBox 
                title="Avg. Actual R"
                value={stats.avg_actual_r ? stats.avg_actual_r.toFixed(2) : 'N/A'}
                unit="R"
            />

            <style jsx>{`
                .kpi-dashboard {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: space-around;
                    margin-bottom: 2rem;
                    padding: 1rem;
                    background-color: #1c272c;
                    border-radius: 8px;
                }
                .kpi-loading, .kpi-error {
                    text-align: center;
                    padding: 2rem;
                    margin-bottom: 2rem;
                    font-size: 1.1rem;
                    color: #b0bec5;
                    background-color: #1c272c;
                    border-radius: 8px;
                }
                .kpi-error {
                    color: #ef5350;
                }
            `}</style>
        </div>
    );
};

export default KpiDashboard; 