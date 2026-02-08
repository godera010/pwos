# Frontend Details

## Overview
The frontend is a **React Single Page Application (SPA)** that provides real-time monitoring and control of the P-WOS system.

---

## Which Files & Why

### `pages/Dashboard.tsx` - Main Interface
**Why:** Central hub for all system information.  
**How:** Fetches data every 5 seconds, displays in organized cards.

**Card Components:**
1. **Sensor Status** - Live moisture, temp, humidity gauges
2. **ML Prediction** - Next action recommendation
3. **Weather Forecast** - Temperature, rain chance
4. **Water Savings** - Reactive vs Predictive comparison
5. **System Logs** - Recent activity feed

### `components/Gauge.tsx` - Visual Indicators
**Why:** Gauges are intuitive for at-a-glance status.  
**How:** SVG-based circular gauge with color coding.

**Color Logic:**
- 🔴 Red (0-30%): Critical - needs water
- 🟡 Yellow (30-50%): Low - monitor
- 🟢 Green (50-80%): Optimal
- 🔵 Blue (80-100%): Saturated

### `services/api.ts` - Backend Communication
**Why:** Centralized API calls, single source of truth.  
**How:** Axios-based with TypeScript interfaces.

**Key Interfaces:**
```typescript
interface SensorData {
  soil_moisture: number;
  temperature: number;
  humidity: number;
  timestamp: string;
}

interface PredictionData {
  recommended_action: 'WATER_NOW' | 'STALL' | 'WAIT';
  system_status: 'CRITICAL' | 'LOW' | 'OPTIMAL';
  ml_analysis: { confidence: number; features_used: object };
}

interface SimulationState {
  fields: { reactive: SystemField; predictive: SystemField };
  water_saved: number;
  savings_percent: number;
}
```

---

## Design Decisions

### Why React 19?
- Component-based architecture
- Huge ecosystem
- Team familiarity
- React 19 concurrent features for smooth updates

### Why Vite (not Create React App)?
| Aspect | Vite | CRA |
|--------|------|-----|
| Dev startup | < 1s | 10-30s |
| Hot reload | Instant | 2-5s |
| Build size | Smaller | Larger |
| Maintenance | Active | Deprecated |

### Why TypeScript?
- Catch errors at compile time
- Better IDE support (autocomplete)
- Self-documenting code
- Required for large projects

### Why Tailwind CSS?
- Utility-first = less CSS to write
- Consistent design tokens
- No class name collisions
- Tree-shaking = tiny bundle

### Why Dark Mode + Glassmorphism?
- Modern aesthetic
- Easier on eyes for monitoring
- Glassmorphism creates depth
- Matches IoT dashboard trends

---

## State Management

**No Redux/Zustand needed.** Why?
- Data flows one direction (API → Components)
- No complex state mutations
- React 19's use() hook handles async
- Local state sufficient for UI toggles

**Data Flow:**
```
API Server
    │
    ▼ fetch every 5s
useState hooks
    │
    ▼ props
Child components
```

---

## Performance Optimizations

### 1. Conditional Rendering
```tsx
{simState && (
  <WaterSavingsCard data={simState} />
)}
```
Only renders when data exists.

### 2. Memoization
Heavy components wrapped in `React.memo()`.

### 3. Debounced Updates
API responses update state, but visual updates are batched.

---

## Responsive Design

| Breakpoint | Layout |
|------------|--------|
| < 640px | Single column |
| 640-1024px | 2 columns |
| > 1024px | 4 columns (12-grid) |

**Mobile-First Approach:**
- Base styles for mobile
- `md:` prefix for tablet
- `lg:` prefix for desktop

---

## Future Enhancements

1. **WebSocket** - Real-time updates without polling
2. **PWA** - Install as mobile app
3. **Charts** - Historical trend visualization
4. **Notifications** - Push alerts for critical moisture
