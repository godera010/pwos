# frontend/ - React Dashboard

**P-WOS Web Interface**

---

## 📁 Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx     # Main dashboard (water savings)
│   │   ├── HardwarePanel.tsx # Hardware status
│   │   └── SettingsPanel.tsx # System settings
│   │
│   ├── components/
│   │   ├── Gauge.tsx         # Circular gauge
│   │   ├── Layout.tsx        # App layout
│   │   └── Sidebar.tsx       # Navigation
│   │
│   ├── services/
│   │   └── api.ts            # Backend API client
│   │
│   ├── hooks/                # Custom React hooks
│   └── App.tsx               # Main app entry
│
├── dist/                     # Production build
├── package.json              # Dependencies
├── vite.config.ts            # Vite configuration
└── tailwind.config.js        # Tailwind CSS config
```

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI Framework |
| Vite | 5 | Build tool |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3 | Styling |
| Chart.js | - | Data visualization |
| Lucide React | - | Icons |

---

## Key Features

- **Water Savings Comparison** - Reactive vs Predictive display
- **Real-time Sensor Data** - Live moisture, temp, humidity
- **ML Predictions** - Action recommendations
- **System Logs** - Activity monitoring
- **Dark Mode** - Glass morphism UI

---

## Run Commands

```bash
# Install dependencies
npm install

# Development server (hot reload)
npm run dev

# Production build
npm run build
```

---

## Ports

| Mode | URL |
|------|-----|
| Development | http://localhost:5173 |
| Production | http://localhost:5000 |
