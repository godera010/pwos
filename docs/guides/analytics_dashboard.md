# Analytics Dashboard Guide

The P-WOS Analytics Dashboard (`Analytics.tsx`) visualizes historical sensor data, irrigation cycles, and AI automation decisions in a scalable, time-aligned user interface.

## Architecture

The analytics system coordinates between the PostgreSQL database, the Flask Backend API, and the React Frontend using Recharts. 

### 1. Data Fetching and Aggregation

Instead of downloading raw telemetry points which easily scale into tens of thousands of rows over a 30-day period, the dashboard requests an **aggregated timeline** from the backend route `/api/analytics/aggregated`.

* **Dynamic Interval Bucketing:** The React frontend maps human-readable timeframes (like "24H", "7D", "30D") into strict hours and interval chunks (e.g., 24 hours parsed into 15-minute buckets). 
* **Backend processing:** The backend routes these intervals directly into PostgreSQL using `DATE_TRUNC`. The database natively compiles the averages of sensor readings and sums the watering durations (and counts AI-triggered events) over those precise boundaries.

### 2. Time-Scale UI Alignment

To bridge the gap between continuous telemetry measurements (like Soil Moisture) and discrete event actions (like Irrigation Duration), Recharts relies heavily on accurate timeline plotting:

* **Numeric Unix Epochs:** The frontend maps the string timestamps parsed from the backend into numeric Unix epochs, assigning the Recharts `XAxis` the `scale="time"` and `type="number"` properties. 
* **Missing Bucket Interpolation:** Because the backend SQL aggregates *omit* intervals where absolutely no data points exist, Recharts defaults to compressing those missing chronological spaces—misaligning bars that share an axis. The `fillMissingBuckets` helper function scans the dataset and injects "zero-state" objects for any skipped timeframe intervals, forcing the graph to space correctly 1-to-1 horizontally.
* **Vertical Grids:** The `<CartesianGrid vertical={true} />` property creates a visual gridline connecting the active Irrigation events stacked on the X-axis up towards their resulting temporal impact on the Soil Moisture trendline.

### 3. Dynamic KPI Filtering

The dashboard Key Performance Indicator (KPI) cards sit above the charts and actively reflect the calculations of the currently selected time window:
* **Total Waterings:** Dynamically tallies buckets where the total irrigation duration > 0.
* **AI Decisions:** Computes a `reduce` summation over the `ai_event_count` property returned by the backend.
* **Avg Soil Health:** Averages all buckets possessing an original recorded moisture value.

This ensures that the metric numbers displayed are exactly localized to the chronological context of the active chart viewport. 
