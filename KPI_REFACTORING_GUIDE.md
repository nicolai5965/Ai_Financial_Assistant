# KPI System Refactoring Guide

## Table of Contents
1. [Core Concept](#core-concept)
2. [File Structure and Changes](#file-structure-and-changes)
3. [Implementation Details](#implementation-details)
4. [Data Flow](#data-flow)
5. [Code Examples](#code-examples)
6. [Benefits](#benefits)

## Core Concept

### Current State vs New State

**Current State:**
- `KpiCard` receives complete `kpi` object prop containing all data
- Tooltip logic partially duplicated
- Business logic spread across frontend and backend

**New State:**
- `KpiCard` receives only `kpiId`
- Uses shared React Context (`KpiContext`)
- Centralized definitions in backend
- Clear separation of concerns

### Why This Change?
- Decouples presentation from data structure
- Centralizes business logic in backend
- Makes components more reusable
- Improves maintainability

## File Structure and Changes

### Backend Files

1. **`backend/app/stock_analysis/kpi/schemas.py`**
```python
from typing import TypedDict, List, Optional, Union, Literal

class KpiThreshold(TypedDict):
    value: Union[float, str]  # Can be number or ">2", "<0.8" etc.
    label: str
    type: Literal["positive", "neutral", "negative"]
    description: str

class KpiVisualization(TypedDict):
    type: Literal["number", "percentage", "ratio", "currency", "volume"]
    format: Optional[dict]
    chart_type: Optional[Literal["line", "bar", "area"]]
    color_scheme: Optional[List[str]]

class KpiDescription(TypedDict):
    main: str
    interpretation: str
    thresholds: Optional[List[KpiThreshold]]
    calculation_method: Optional[str]
    frequency: Optional[str]
    data_source: Optional[str]
    related_kpis: Optional[List[str]]
    visualization: Optional[KpiVisualization]

class KpiMetadata(TypedDict):
    group: str
    subgroup: Optional[str]
    importance: Literal["primary", "secondary", "auxiliary"]
    update_interval: str
    requires_market_open: bool

class KpiDefinition(TypedDict):
    id: str
    name: str
    short_name: Optional[str]
    description: KpiDescription
    metadata: KpiMetadata
```

2. **`backend/app/stock_analysis/kpi/registry.py`**
```python
from .schemas import KpiDefinition

VOLUME_RATIO_KPI: KpiDefinition = {
    "id": "volume_ratio",
    "name": "Volume Ratio",
    "short_name": "Vol Ratio",
    "description": {
        "main": "Compares current trading volume to average volume",
        "interpretation": "Indicates trading activity relative to normal levels",
        "thresholds": [
            {
                "value": ">2",
                "label": "High Volume",
                "type": "positive",
                "description": "Significantly higher than average trading activity"
            },
            {
                "value": "0.8-2",
                "label": "Normal",
                "type": "neutral",
                "description": "Trading within normal range"
            },
            {
                "value": "<0.8",
                "label": "Low Volume",
                "type": "negative",
                "description": "Lower than average trading activity"
            }
        ],
        "calculation_method": "Current day's volume divided by 30-day average volume",
        "frequency": "Real-time during market hours",
        "visualization": {
            "type": "ratio",
            "format": {"decimal_places": 2},
            "chart_type": "line"
        }
    },
    "metadata": {
        "group": "volume",
        "importance": "primary",
        "update_interval": "realtime",
        "requires_market_open": True
    }
}

KPI_REGISTRY = {
    "volume_ratio": VOLUME_RATIO_KPI,
    # Add other KPIs...
}
```

### Frontend Files

1. **`frontend/src/types/kpi.ts`**
```typescript
export interface KpiThreshold {
  value: number | string;
  label: string;
  type: 'positive' | 'neutral' | 'negative';
  description: string;
}

export interface KpiVisualization {
  type: 'number' | 'percentage' | 'ratio' | 'currency' | 'volume';
  format?: Record<string, any>;
  chartType?: 'line' | 'bar' | 'area';
  colorScheme?: string[];
}

export interface KpiDescription {
  main: string;
  interpretation: string;
  thresholds?: KpiThreshold[];
  calculationMethod?: string;
  frequency?: string;
  dataSource?: string;
  relatedKpis?: string[];
  visualization?: KpiVisualization;
}

export interface KpiMetadata {
  group: string;
  subgroup?: string;
  importance: 'primary' | 'secondary' | 'auxiliary';
  updateInterval: string;
  requiresMarketOpen: boolean;
}

export interface Kpi {
  id: string;
  name: string;
  shortName?: string;
  value: any;
  description: KpiDescription;
  metadata: KpiMetadata;
}

export type KpiValueMap = { [key: string]: number | string | null };
export type KpiDefinitionMap = { [key: string]: KpiDefinition };
```

2. **`frontend/src/contexts/KpiContext.js`**
```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';

const KpiContext = createContext();

export const KpiProvider = ({ children }) => {
  const [definitions, setDefinitions] = useState({});
  const [values, setValues] = useState({});
  const [loadingState, setLoadingState] = useState({
    definitions: true,
    values: true
  });
  const [errorState, setErrorState] = useState({
    definitions: null,
    values: null
  });

  // Fetch definitions on mount
  useEffect(() => {
    const fetchDefinitions = async () => {
      try {
        const response = await fetch('/api/kpi/definitions');
        const data = await response.json();
        setDefinitions(data);
        setLoadingState(prev => ({ ...prev, definitions: false }));
      } catch (error) {
        setErrorState(prev => ({ ...prev, definitions: error.message }));
        setLoadingState(prev => ({ ...prev, definitions: false }));
      }
    };

    fetchDefinitions();
  }, []);

  // Value fetching logic (implement based on your needs)
  const fetchValues = async (ticker) => {
    try {
      const response = await fetch(`/api/kpi/values/${ticker}`);
      const data = await response.json();
      setValues(data);
      setLoadingState(prev => ({ ...prev, values: false }));
    } catch (error) {
      setErrorState(prev => ({ ...prev, values: error.message }));
      setLoadingState(prev => ({ ...prev, values: false }));
    }
  };

  return (
    <KpiContext.Provider value={{
      definitions,
      values,
      loadingState,
      errorState,
      fetchValues
    }}>
      {children}
    </KpiContext.Provider>
  );
};

export const useKpi = () => useContext(KpiContext);
```

3. **`frontend/src/utils/kpiUtils.js`**
```javascript
export const formatKpiValue = (value, visualization) => {
  if (value === null || value === undefined) return 'N/A';

  const type = visualization?.type || 'number';
  const format = visualization?.format || {};

  switch (type) {
    case 'number':
      return Number(value).toFixed(format.decimal_places || 0);
    case 'percentage':
      return `${(value * 100).toFixed(format.decimal_places || 1)}%`;
    case 'ratio':
      return Number(value).toFixed(format.decimal_places || 2);
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: format.currency || 'USD'
      }).format(value);
    case 'volume':
      return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short'
      }).format(value);
    default:
      return String(value);
  }
};

export const getKpiValueColor = (value, thresholds) => {
  if (!thresholds || !value) return '#cccccc'; // Neutral color

  for (const threshold of thresholds) {
    const { value: threshValue, type } = threshold;
    
    if (typeof threshValue === 'string') {
      // Handle string comparisons like ">2", "<0.8"
      const [operator, num] = threshValue.match(/([<>])(.+)/).slice(1);
      const compareValue = parseFloat(num);
      
      if ((operator === '>' && value > compareValue) ||
          (operator === '<' && value < compareValue)) {
        return type === 'positive' ? '#4caf50' : 
               type === 'negative' ? '#f44336' : 
               '#cccccc';
      }
    } else if (typeof threshValue === 'number' && value === threshValue) {
      return type === 'positive' ? '#4caf50' : 
             type === 'negative' ? '#f44336' : 
             '#cccccc';
    }
  }

  return '#cccccc'; // Default neutral color
};
```

## Implementation Details

### Modified Components

1. **KpiCard Changes**
- Remove direct data handling
- Use `useKpi` hook
- Pass only `kpiId` prop
- Use utility functions for formatting

2. **KpiTooltip Changes**
- Remove conditional render functions
- Use definition from context
- Dynamic rendering based on definition structure

3. **KpiGroup/Dashboard Changes**
- Manage active tooltip state
- Use context for definitions and values
- Handle card click events

## Data Flow

1. Initial Load:
   - `KpiProvider` fetches definitions
   - Stores in context

2. Value Updates:
   - `KpiProvider` fetches values
   - Updates context

3. Component Rendering:
   - Components access data via `useKpi`
   - Format using utility functions
   - Render based on definitions

4. User Interactions:
   - Click events update active states
   - Tooltips render based on active states

## Benefits

1. **Maintainability**
   - Centralized definitions
   - Clear separation of concerns
   - Easier updates

2. **Consistency**
   - Unified formatting
   - Consistent styling
   - Single source of truth

3. **Scalability**
   - Easy to add new KPIs
   - Frontend adapts automatically
   - Reusable components

4. **Type Safety**
   - Strong typing throughout
   - Better IDE support
   - Fewer runtime errors

## Implementation Steps

1. Create backend schema and registry
2. Set up API endpoints
3. Create frontend types
4. Implement KpiContext
5. Create utility functions
6. Update existing components
7. Test and verify

## Testing Strategy

1. Unit tests for utility functions
2. Integration tests for context
3. Component tests for rendering
4. End-to-end tests for user interactions

## Migration Strategy

1. Create new files alongside existing ones
2. Gradually migrate components
3. Test thoroughly
4. Remove old implementation

Remember to implement changes incrementally and maintain backward compatibility during the migration process. 