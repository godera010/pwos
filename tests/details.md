# Tests Details

## Overview
The test suite ensures **code quality and validates the project hypothesis** (15% water savings).

---

## Which Files & Why

### `test_simulation_logic.py` (11 Tests) - Core Physics
**Why:** Simulation must be realistic for ML to learn correctly.  
**How:** Pytest fixtures create controlled scenarios.

**Test Categories:**

#### VPD & Moisture Tests
| Test | Purpose |
|------|---------|
| `test_high_vpd_decay` | Verify decay accelerates in heatwave |
| `test_low_vpd_retention` | Verify moisture stable in cool/humid |
| `test_rain_moisture_increase` | Verify rain adds moisture |
| `test_dynamic_weather` | Verify system adapts to changes |

#### Pump Control Tests
| Test | Purpose |
|------|---------|
| `test_pump_gradual_increase` | Verify 1.5%/step absorption |
| `test_pump_stop_mid_cycle` | Verify pump can be interrupted |
| `test_pump_extend_duration` | Verify duration can be extended |

#### Extreme Scenarios
| Test | Purpose |
|------|---------|
| `test_heatwave_scenario` | VPD > 2.0, rapid decay |
| `test_wind_false_dry` | Wind causes false low readings |
| `test_sensor_failure` | NaN/spike detection |
| `test_pump_failure` | Moisture drops despite command |

### `test_water_savings.py` - Hypothesis Validation
**Why:** Must prove 15% water savings for thesis.  
**How:** Run 2-week simulation comparing reactive vs predictive.

**Methodology:**
1. Reset simulation to 60% moisture
2. Run 1344 steps (14 days × 96 steps/day)
3. Compare water used by both systems
4. Calculate savings percentage

**Expected:** ≥15% savings  
**Achieved:** 16.7% savings ✅

### `test_integration.py` - End-to-End
**Why:** Verify all components work together.  
**How:** Start backend, verify endpoints, check ML predictions.

**Tests:**
1. Backend health check
2. Sensor data flow
3. ML prediction response
4. Pump control round-trip

### `test_api.py` - REST Endpoints
**Why:** API contracts must be stable.  
**How:** Test each endpoint with expected/error inputs.

### `test_database.py` - Data Persistence
**Why:** Data must be stored and retrieved correctly.  
**How:** CRUD operations on sensor readings table.

### `test_ml.py` - Model Accuracy
**Why:** Predictions must be reliable.  
**How:** Test against known scenarios.

---

## Test Philosophy

### Why Pytest (not unittest)?
- Less boilerplate
- Better fixtures
- Rich plugin ecosystem
- Clearer assertions

### Why These Specific Tests?
Tests derive from:
1. **Requirements** - What must the system do?
2. **Failure modes** - What could go wrong?
3. **Edge cases** - What unusual inputs exist?

### Test Coverage Strategy
| Layer | Coverage Target |
|-------|-----------------|
| Simulation | 90%+ (critical) |
| ML Predictor | 80%+ |
| API | 70%+ |
| Frontend | 50%+ (manual) |

---

## Running Tests

```bash
# All tests with verbose output
pytest tests/ -v

# Specific file
pytest tests/test_simulation_logic.py -v

# With coverage report
pytest tests/ --cov=src --cov-report=html

# Water savings (separate script)
python tests/test_water_savings.py
```

---

## Continuous Integration

For future CI/CD:
```yaml
# .github/workflows/test.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pip install -r requirements.txt
      - run: pytest tests/ -v
```
