import React, { useMemo } from 'react';
import { logger } from '../../utils/logger';

// --- Helper Functions ---

/**
 * Formats a date string or timestamp into a more readable format.
 * @param {string} dateString - The ISO 8601 date string.
 * @returns {string} - Formatted date string, e.g., "2023-10-27 15:45:30".
 */
const formatTimestamp = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('sv-SE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    } catch (e) {
        logger.warn(`Could not format date: ${dateString}`, e);
        return dateString;
    }
};

/**
 * Formats a number as a currency string (USD).
 * @param {number} value - The number to format.
 * @returns {string} - Formatted currency string, e.g., "$1,234.56".
 */
const formatCurrency = (value) => {
    if (typeof value !== 'number') return 'N/A';
    return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};


// --- JournalTable Component ---

/**
 * A component to display trade data in a table.
 * @param {Object} props - The component props.
 * @param {Array} props.trades - The array of trade objects to display.
 * @param {boolean} props.isLoading - A flag indicating if data is currently loading.
 */
const JournalTable = ({ trades, isLoading }) => {
    const tableHeaders = useMemo(() => [
        "Symbol", "Status", "PNL (USD)", "R-Multiple", "Direction", "Entry Time",
        "Entry Price", "Exit Time", "Exit Price", "Risk (USD)", "Commissions", "Type"
    ], []);

    if (isLoading && trades.length === 0) {
        return <div className="loading-message">Loading trades...</div>;
    }
    
    if (!isLoading && trades.length === 0) {
        return <div className="empty-message">No trades found.</div>;
    }

    return (
        <>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            {tableHeaders.map(header => <th key={header}>{header}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {trades.map(trade => (
                            <tr key={trade.id}>
                                <td data-label="Symbol">{trade.symbol}</td>
                                <td data-label="Status">
                                    <span className={`status ${trade.status?.toLowerCase()}`}>{trade.status || 'N/A'}</span>
                                </td>
                                <td data-label="PNL (USD)">{formatCurrency(trade.final_pnl_usd)}</td>
                                <td data-label="R-Multiple">{trade.actual_r_multiple_on_risk?.toFixed(2) || 'N/A'}</td>
                                <td data-label="Direction">{trade.direction}</td>
                                <td data-label="Entry Time">{formatTimestamp(trade.entry_timestamp)}</td>
                                <td data-label="Entry Price">{trade.entry_price?.toFixed(5)}</td>
                                <td data-label="Exit Time">{formatTimestamp(trade.exit_timestamp)}</td>
                                <td data-label="Exit Price">{trade.exit_price?.toFixed(5)}</td>
                                <td data-label="Risk (USD)">{formatCurrency(trade.initial_total_risk_usd)}</td>
                                <td data-label="Commissions">{formatCurrency(trade.total_commission_fees_usd)}</td>
                                <td data-label="Type">{trade.trade_type || 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <style jsx>{`
                /* Styles specific to the Journal Table */
                .loading-message, .empty-message {
                    text-align: center;
                    padding: 2rem;
                    font-size: 1.2rem;
                    color: #9e9e9e;
                }
                
                .table-container {
                    overflow-x: auto;
                    margin: 2rem 0;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    background-color: #263238;
                    color: #eceff1;
                    font-size: 14px;
                }

                th, td {
                    padding: 12px 15px;
                    text-align: left;
                    border-bottom: 1px solid #37474f;
                }

                th {
                    background-color: #37474f;
                    font-weight: 600;
                    color: #4dd0e1;
                    position: sticky;
                    top: 0;
                }

                tr:hover {
                    background-color: #37474f;
                }

                .status {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-weight: bold;
                    text-transform: uppercase;
                    font-size: 12px;
                }
                .status.win { background-color: rgba(100, 255, 218, 0.2); color: #64ffda; }
                .status.loss { background-color: rgba(255, 82, 82, 0.2); color: #ff5252; }
                .status.break_even { background-color: rgba(255, 209, 128, 0.2); color: #ffd180; }

                .narrative-cell {
                    max-width: 350px;
                    white-space: pre-wrap;
                    word-break: break-word;
                    font-size: 13px;
                    color: #b0bec5;
                }
            `}</style>
        </>
    );
};

export default JournalTable; 