# scripts/ - Utility Scripts

<!-- NAV_START -->
<div align="center">
  <a href="..\README.md">🏠 Home (Root)</a> |
  <a href="..\src\README.md">💻 Source Code</a> |
  <a href="..\docs\README.md">📚 Documentation</a> |
  <a href="..\docs\hardware\README.md">⚙️ Hardware</a> |
  <a href="..\data\README.md">💾 Data</a>
</div>
<hr>
<!-- NAV_END -->


**P-WOS Development & Analysis Tools**

---

## 📁 Structure

```
scripts/
├── analysis/           # Data analysis tools
│   └── (7 files)       # Log analyzers, data inspection
│
├── data/               # Data management
│   └── (5 files)       # CSV/DB tools, data cleanup
│
├── setup/              # Environment setup
│   └── (3 files)       # Install, configure, init
│
├── simulation/         # Simulation utilities
│   └── (1 file)        # Scenario runners
│
├── testing/            # Testing utilities
│   └── (4 files)       # Debug tools, quick tests
│
├── build_frontend.bat  # Build React production
└── start_system.bat    # Start all components
```

---

## Key Scripts

| Script | Purpose |
|--------|---------|
| `start_system.bat` | Launch all services |
| `build_frontend.bat` | Build React for production |
| `analysis/*` | Log and data analysis |
| `testing/*` | Debug and quick tests |

---

## Run Commands

```bash
# Start entire system
scripts/start_system.bat

# Build frontend
scripts/build_frontend.bat
```
\n\n