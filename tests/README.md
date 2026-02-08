# tests/ - Test Suite

**P-WOS Automated Testing**

---

## 📁 Structure

```
tests/
├── conftest.py              # Pytest fixtures
├── test_api.py              # API endpoint tests
├── test_database.py         # Database operation tests
├── test_integration.py      # Full system integration
├── test_ml.py               # ML model tests
├── test_simulation_logic.py # Simulation physics tests (11 tests)
└── test_water_savings.py    # Hypothesis validation test
```

---

## Test Files

| File | Tests | Description |
|------|-------|-------------|
| `test_simulation_logic.py` | 11 | VPD decay, pump control, extreme scenarios |
| `test_water_savings.py` | 1 | 2-week validation (16.7% savings) |
| `test_integration.py` | 4 | Backend + ML + MQTT flow |
| `test_api.py` | - | REST API endpoints |
| `test_database.py` | - | SQLite operations |
| `test_ml.py` | - | ML predictor tests |

---

## Run Commands

```bash
# Run all tests
pytest tests/ -v

# Specific test file
pytest tests/test_simulation_logic.py -v

# Water savings validation (2-week sim)
python tests/test_water_savings.py

# Integration test
python tests/test_integration.py
```

---

## Key Tests

### Simulation Logic (11 Tests)
- High VPD decay (heatwave)
- Low VPD retention (cool/humid)
- Rain moisture increase
- Dynamic weather changes
- Pump gradual watering
- Pump stop/extend
- Heatwave scenario
- Wind false-dry detection
- Sensor failure anomaly
- Pump failure detection

### Water Savings Validation
- ✅ **16.7% savings** achieved (target: 15%)
- Runs 1344 steps (2 weeks simulated)
