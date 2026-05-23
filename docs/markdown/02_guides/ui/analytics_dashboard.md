# Analytics Dashboard Guide

The P-WOS Analytics Dashboard (`Analytics.tsx`) visualizes historical sensor data, irrigation cycles, and AI automation decisions in a scalable, time-aligned user interface.

## Architecture

The analytics system coordinates between the PostgreSQL database, the Flask Backend API, and the React Frontend using Recharts. 

### 1. Data Fetching and Aggregation

Instead of downloading raw telemetry points which easily scale into tens of thousands of rows over a 30-day period, the dashboard requests an **aggregated timeline** from the backend route `/api/analytics/aggregated`.

* **Dynamic Interval Bucketing:** The React frontend maps human-readable timeframes (like "24H", "7D", "30D") into strict hours and interval chunks (e.g., 24 hours parsed into 15-minute buckets). 
* **Backend processing:** The backend routes these intervals directly into PostgreSQL using `DATE_TRUNC`. The database natively compiles the averages of sensor readings and sums the watering durations (and counts AI-triggered events) over those precise boundaries.
* **URL Encoding:** The `interval` parameter (e.g., `15 minutes`) is URL-encoded via `encodeURIComponent()` to handle the space character reliably.

### 2. Time-Scale UI Alignment

To bridge the gap between continuous telemetry measurements (like Soil Moisture) and discrete event actions (like Irrigation Duration), Recharts relies heavily on accurate timeline plotting:

* **Numeric Unix Epochs:** The frontend maps the string timestamps parsed from the backend into numeric Unix epochs, assigning the Recharts `XAxis` the `scale="time"` and `type="number"` properties. 
* **Timestamp Snapping:** Before gap-filling, the `fillMissingBuckets` helper snaps each data point's timestamp to the nearest bucket boundary using `Math.round(timestamp / intervalMs) * intervalMs`. This compensates for millisecond-level precision differences from PostgreSQL's `to_timestamp()`, ensuring that real data actually matches the generated time grid.
* **Null-Value Gap Filling:** When the backend SQL aggregation omits intervals where no data points exist, the `fillMissingBuckets` function injects gap entries with `null` sensor values (not zero) and an `_isGap: true` flag. This prevents gaps from polluting KPI averages or causing chart lines to drop to zero.
* **`connectNulls` Lines:** All `<Line>` components use the `connectNulls` prop, which tells Recharts to draw continuous lines through the real data points, skipping over null gaps rather than dropping to the baseline.
* **Y-Axis Domains:** The left Y-axis uses `domain={[0, 'auto']}` and the right Y-axis (humidity) uses `domain={[0, 100]}` to prevent auto-scaling anomalies from corrupted or extreme values.
* **Vertical Grids:** The `<CartesianGrid vertical={true} />` property creates a visual gridline connecting the active Irrigation events stacked on the X-axis up towards their resulting temporal impact on the Soil Moisture trendline.

### 3. Dynamic KPI Filtering

The dashboard Key Performance Indicator (KPI) cards sit above the charts and actively reflect the calculations of the currently selected time window:

* **Avg Temperature:** Filters out gap-filled entries (`d._isGap !== true && d.temperature !== null`) before computing the `reduce` average. This prevents zero-padded gaps from diluting the real temperature average.
* **Avg Humidity:** Same gap-aware filtering pattern as temperature.
* **Avg Soil Health:** Averages all buckets possessing an original recorded moisture value (`_original_moisture !== null`).
* **Readings Count:** Displays only real data points (`data.filter(d => !d._isGap).length`), not the total array length which includes gap entries.
* **Total Waterings:** Dynamically tallies buckets where the total irrigation duration > 0.
* **AI Decisions:** Computes a `reduce` summation over the `ai_event_count` property returned by the backend.

This ensures that the metric numbers displayed are exactly localized to the chronological context of the active chart viewport, and are not corrupted by gap-filling artifacts.

### 4. Tooltip Handling

The custom `CustomTooltip` component filters out entries with `null` values before rendering, so hovering over a gap-filled time bucket does not display "NaN" or "0" values for sensor readings.

### 5. CSV Export

The CSV export function excludes gap-filled entries (`data.filter(d => !d._isGap)`) and uses null-safe accessors (`d.temperature != null ? d.temperature.toFixed(2) : ''`) to prevent `null.toFixed()` crashes.
