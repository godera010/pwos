# P-WOS Project Structure
## Complete File Organization

---

## ROOT DIRECTORY STRUCTURE

```
pwos-project/
│
├── docs/                           # All documentation
│   ├── master_prompt.md           # AI agent master instructions
│   ├── instructions.md            # Build instructions for agents
│   ├── tasks.md                   # Task checklist for agents
│   ├── guidelines.md              # Development guidelines
│   ├── tests.md                   # Testing procedures
│   ├── files_structure.md         # This file
│   ├── tech_stack_summary.md      # Technology overview
│   ├── technical_analysis.md      # Complete build requirements
│   ├── simulation_guide.md        # Simulation setup
│   ├── ml_model_guide.md          # ML development guide
│   └── hardware_shopping_list.md  # Hardware components
│
├── src/                           # Source code
│   ├── simulation/                # Simulation components
│   │   ├── esp32_simulator.py    # Virtual hardware
│   │   ├── weather_simulator.py  # Weather API mock
│   │   └── README.md
│   │
│   ├── backend/                   # Backend API
│   │   ├── app.py                # Main API server
│   │   ├── database.py           # Database operations
│   │   ├── mqtt_subscriber.py    # MQTT listener
│   │   ├── models/               # ML models
│   │   │   ├── ml_model_v1.py   # Rule-based model
│   │   │   ├── ml_predictor.py  # ML wrapper
│   │   │   ├── train_model.py   # Training script
│   │   │   └── data_collector.py
│   │   ├── utils/                # Utilities
│   │   │   ├── logger.py
│   │   │   └── config.py
│   │   └── requirements.txt      # Python dependencies
│   │
│   ├── frontend/                  # Web interface
│   │   ├── dashboard.html        # Main dashboard
│   │   ├── assets/
│   │   │   ├── css/
│   │   │   │   └── styles.css
│   │   │   └── js/
│   │   │       └── main.js
│   │   └── README.md
│   │
│   └── firmware/                  # ESP32 code (future)
│       ├── main.ino              # Arduino sketch
│       ├── config.h              # Configuration
│       ├── sensors.h             # Sensor functions
│       └── README.md
│
├── data/                          # Data storage
│   ├── sensor_data.db            # SQLite database
│   ├── training_data.csv         # ML training data
│   ├── trained_model.pkl         # Saved model
│   ├── model_metadata.json       # Model info
│   └── logs/                     # Log files
│       ├── system.log
│       ├── errors.log
│       └── mqtt.log
│
├── tests/                         # Test files
│   ├── test_simulator.py         # Simulator tests
│   ├── test_api.py               # API tests
│   ├── test_ml_model.py          # ML model tests
│   ├── test_database.py          # Database tests
│   └── integration/              # Integration tests
│       ├── test_full_pipeline.py
│       └── test_mqtt_flow.py
│
├── scripts/                       # Utility scripts
│   ├── setup.sh                  # Initial setup
│   ├── start_all.sh              # Start all services
│   ├── stop_all.sh               # Stop all services
│   ├── export_data.py            # Data export
│   └── backup_database.py        # Backup utility
│
├── config/                        # Configuration files
│   ├── mqtt_config.json          # MQTT settings
│   ├── api_config.json           # API settings
│   ├── .env.example              # Environment template
│   └── .env                      # Environment variables (gitignored)
│
├── deployments/                   # Deployment configs
│   ├── docker/
│   │   ├── Dockerfile
│   │   └── docker-compose.yml
│   ├── railway/
│   │   └── railway.json
│   └── render/
│       └── render.yaml
│
├── .github/                       # GitHub configs
│   ├── workflows/
│   │   ├── tests.yml             # CI/CD tests
│   │   └── deploy.yml            # Auto deploy
│   └── ISSUE_TEMPLATE/
│       └── bug_report.md
│
├── .gitignore                     # Git ignore rules
├── README.md                      # Project overview
├── LICENSE                        # License file
├── CHANGELOG.md                   # Version history
└── CONTRIBUTING.md                # Contribution guide
```

---

## DIRECTORY EXPLANATIONS

### `/docs` - Documentation
**Purpose:** All project documentation and guides  
**Who uses it:** Developers, AI agents, users  
**Key files:**
- `master_prompt.md` - AI agent instructions
- `instructions.md` - Step-by-step build guide
- `tasks.md` - Task checklist
- Technical guides and references

### `/src` - Source Code
**Purpose:** All application code  
**Structure:**
- `simulation/` - Virtual hardware for testing
- `backend/` - API and ML logic
- `frontend/` - User interface
- `firmware/` - ESP32 code (when hardware arrives)

### `/data` - Data Storage
**Purpose:** Databases, logs, trained models  
**Note:** Add to `.gitignore` (don't commit large files)

### `/tests` - Test Suite
**Purpose:** Automated testing  
**Types:**
- Unit tests (individual functions)
- Integration tests (component interaction)
- End-to-end tests (full system)

### `/scripts` - Automation Scripts
**Purpose:** Setup, deployment, maintenance  
**Examples:**
- `start_all.sh` - Launch entire system
- `export_data.py` - Export for analysis

### `/config` - Configuration
**Purpose:** Settings files  
**Note:** `.env` contains secrets (gitignored)

### `/deployments` - Deployment Configs
**Purpose:** Cloud deployment configurations  
**Platforms:** Docker, Railway, Render

---

## FILE NAMING CONVENTIONS

### Python Files
- `lowercase_with_underscores.py`
- Classes: `PascalCase`
- Functions: `snake_case`
- Constants: `UPPER_CASE`

### Documentation
- `lowercase_with_underscores.md`
- Clear, descriptive names
- README in each major directory

### Configuration
- `snake_case.json`
- `.env` for secrets
- `config.py` for Python configs

---

## CRITICAL FILES

### Must Have:
1. `README.md` - Project overview
2. `requirements.txt` - Python dependencies
3. `.gitignore` - What not to commit
4. `docs/master_prompt.md` - AI agent guide
5. `docs/instructions.md` - Build steps

### Should Have:
6. `CHANGELOG.md` - Track changes
7. `LICENSE` - Legal terms
8. `CONTRIBUTING.md` - How to contribute
9. `tests/` - Test suite
10. `scripts/setup.sh` - Easy setup

---

## FILE DEPENDENCIES MAP

```
master_prompt.md
    │
    ├──> tech_stack_summary.md (understand architecture)
    ├──> technical_analysis.md (know what to build)
    ├──> simulation_guide.md (setup environment)
    ├──> ml_model_guide.md (implement ML)
    ├──> hardware_shopping_list.md (future reference)
    ├──> instructions.md (step-by-step)
    ├──> tasks.md (what to do)
    ├──> guidelines.md (how to do it)
    └──> tests.md (verify it works)

instructions.md
    │
    ├──> tasks.md (break into steps)
    ├──> guidelines.md (follow standards)
    └──> tests.md (validate each step)

tasks.md
    │
    ├──> tests.md (confirm completion)
    └──> guidelines.md (maintain quality)
```

---

## DATA FLOW

```
Simulation:
esp32_simulator.py → MQTT Broker → mqtt_subscriber.py → database.py → sensor_data.db

API Request:
dashboard.html → app.py → ml_predictor.py → Response

Training:
sensor_data.db → data_collector.py → training_data.csv → train_model.py → trained_model.pkl
```

---

## GITIGNORE RULES

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
*.egg-info/

# Data
data/*.db
data/*.csv
data/logs/
*.pkl

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/
```

---

## VERSION CONTROL STRATEGY

### Branch Structure:
```
main
├── develop
│   ├── feature/simulation
│   ├── feature/backend-api
│   ├── feature/ml-model
│   └── feature/frontend
└── release/v1.0
```

### Commit Message Format:
```
type(scope): subject

Examples:
feat(simulation): add moisture decay simulation
fix(api): correct MQTT reconnection logic
docs(readme): update installation instructions
test(ml): add model accuracy tests
```

---

## SIZE ESTIMATES

| Directory | Approx Size | Notes |
|-----------|-------------|-------|
| `/docs` | 5-10 MB | Text files |
| `/src` | 1-2 MB | Code only |
| `/data` | 10-500 MB | Grows over time |
| `/tests` | 500 KB | Test code |
| `/scripts` | 100 KB | Shell/Python scripts |
| **Total (initial)** | **<20 MB** | Without collected data |
| **Total (after 1 month)** | **100-500 MB** | With sensor data |

---

## BACKUP STRATEGY

### What to Back Up:
1. **Code** → Git repository (GitHub)
2. **Database** → Daily exports to CSV
3. **Trained models** → Version with metadata
4. **Logs** → Weekly archives
5. **Config** → Git (without secrets)

### What NOT to Back Up:
- Temporary files (`__pycache__`)
- Virtual environments (`venv/`)
- Large raw data (keep summaries)
- Generated files

---

## ACCESS PERMISSIONS

### Public (GitHub):
- All code
- Documentation
- Tests
- Example configs

### Private:
- `.env` (API keys, passwords)
- Production database
- User data
- Deployment secrets

---

## SCALABILITY PLAN

### Current (Development):
```
Single machine
All services local
SQLite database
Static HTML frontend
```

### Future (Production):
```
Backend: Railway/Render
Database: PostgreSQL (cloud)
Frontend: Netlify/Vercel
MQTT: HiveMQ Cloud
Monitoring: Sentry/LogRocket
```

---

## FILE LIFECYCLE

### Development:
1. Create in `/src`
2. Test in `/tests`
3. Document in `/docs`
4. Commit to Git
5. Deploy

### Data:
1. Collect in runtime
2. Store in `/data`
3. Export to CSV (weekly)
4. Archive old data (monthly)
5. Delete raw logs (after 3 months)

### Models:
1. Train from data
2. Evaluate performance
3. Save to `/data`
4. Version with metadata
5. Deploy to API

---

## QUICK NAVIGATION

```bash
# Start development
cd pwos-project/

# View documentation
cd docs/
cat master_prompt.md

# Edit code
cd src/backend/
code app.py

# Run tests
cd tests/
pytest

# Start system
cd scripts/
./start_all.sh

# Check logs
cd data/logs/
tail -f system.log
```

---

## DEPENDENCY TREE

```
Project Root
│
├── Python 3.9+
│   ├── paho-mqtt (MQTT)
│   ├── flask (API)
│   ├── scikit-learn (ML)
│   └── pandas (Data)
│
├── Mosquitto (MQTT Broker)
│
├── SQLite (Database)
│
└── Node.js (Optional)
    └── npm packages (if needed)
```

---

## MAINTENANCE SCHEDULE

### Daily:
- Check system logs
- Monitor data collection
- Review errors

### Weekly:
- Export data to CSV
- Review model performance
- Update documentation

### Monthly:
- Retrain ML model
- Archive old logs
- Update dependencies

### Quarterly:
- Major feature updates
- Performance optimization
- Security audit

---

This structure provides:
✅ Clear organization  
✅ Easy navigation  
✅ Scalable architecture  
✅ Version control ready  
✅ Deployment ready  
✅ AI agent friendly  
✅ Team collaboration ready
