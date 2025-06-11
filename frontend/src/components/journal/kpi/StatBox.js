import React from 'react';

const StatBox = ({ title, value, unit, color, disclaimer }) => {
    const valueStyle = {
        color: color || '#e0e0e0', // Default color if none is provided
    };

    return (
        <div className="stat-box">
            <h3 className="stat-title">{title}</h3>
            <p className="stat-value" style={valueStyle}>
                {value}
                {unit && <span className="stat-unit">{unit}</span>}
            </p>
            {disclaimer && <p className="stat-disclaimer">{disclaimer}</p>}
            <style jsx>{`
                .stat-box {
                    background-color: #263238; /* Dark Slate Grey */
                    border: 1px solid #4dd0e1;  /* Cyan Theme Color */
                    border-radius: 8px;
                    padding: 1.25rem;
                    flex-grow: 1;
                    text-align: center;
                    margin: 0.5rem; /* Add some margin for spacing */
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .stat-title {
                    margin: 0 0 0.5rem 0;
                    font-size: 1rem;
                    font-weight: 500;
                    color: #b0bec5; /* Light grey for the title */
                }
                .stat-value {
                    margin: 0;
                    font-size: 2rem;
                    font-weight: bold;
                    line-height: 1.2;
                    margin-bottom: ${disclaimer ? '0.25rem' : '0'};
                }
                .stat-unit {
                    font-size: 1.25rem;
                    margin-left: 0.25rem;
                    color: #78909c; /* Lighter grey for the unit */
                }
                .stat-disclaimer {
                    font-size: 0.75rem;
                    color: #78909c;
                    margin: 0;
                    font-style: italic;
                    line-height: 1;
                }
            `}</style>
        </div>
    );
};

export default StatBox; 