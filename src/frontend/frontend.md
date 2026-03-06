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
│   ├── components/           # Reusable UI components
│   │   ├── Gauge.tsx         # Circular gauge
│   │   ├── Layout.tsx        # App layout
│   │   └── Sidebar.tsx       # Navigation
│   │
│   ├── services/
│   │   └── api.ts            # Backend API client
│   │
│   ├── hooks/                # Custom React hooks
│   ├── types/                # TypeScript type definitions
│   ├── test/                 # Frontend tests
│   └── App.tsx               # Main app entry
│
├── e2e/                      # Playwright end-to-end tests
├── dist/                     # Production build
├── package.json              # Dependencies
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind CSS config
└── playwright.config.ts      # E2E test config
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
| Playwright | - | E2E testing |

---

## Key Features

- **Water Savings Comparison** — Reactive vs Predictive display
- **Real-time Sensor Data** — Live moisture, temp, humidity
- **ML Predictions** — Action recommendations
- **System Logs** — Activity monitoring
- **Dark Mode** — Glassmorphism UI

---

## Run Commands

```bash
# Install dependencies
npm install

# Development server (hot reload)
npm run dev

# Production build
npm run build

# E2E tests
npx playwright test
```

---

## Ports

| Mode | URL |
|------|-----|
| Development | http://localhost:5173 |
| Production | http://localhost:5000 |
