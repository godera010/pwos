# P-WOS Test Suite Documentation

> Complete reference for every test file and individual test case in P-WOS.

## Running Tests

```bash
# Activate virtual environment
.venv\Scripts\activate

# Run entire suite
cd src/backend
pytest tests/ -v

# Run by category
pytest tests/unit/ -v           # Unit tests only
pytest tests/integration/ -v    # Integration tests only
pytest tests/scenarios/ -v      # Scenario tests only
pytest tests/performance/ -v    # Benchmarks only

# Run single file
pytest tests/unit/test_weather_api.py -v
```

---

## Shared Configuration

### `conftest.py`
**Path:** `src/backend/tests/conftest.py`

Global test fixtures shared across all test categories.

| Fixture | Type | Description |
|---|---|---|
| `predictor` | `MLPredictor` | Fresh ML predictor instance per test |
| `mock_sensor_data` | `dict` | Standard sensor payload (45% moisture, 25°C, 60% RH) |

Test logs are written to `logs/test/test.log` (UTF-8 encoded).

---

## Unit Tests

### 1. `validation.py` — Input Validation  
**Path:** `src/backend/tests/unit/validation.py`  
**Class:** `TestInputValidation` (~20 tests)

Tests boundary checking and type safety for all system inputs.

| Test | What It Verifies |
|---|---|
| `test_soil_moisture_valid_range` | Valid moisture values 0–100 are accepted |
| `test_soil_moisture_out_of_bounds` | Rejects -1, 101, -0.01, 100.1 (parametrized) |
| `test_temperature_out_of_bounds` | Rejects -51, 61, 1000°C (parametrized) |
| `test_humidity_out_of_bounds` | Rejects -1, 101% (parametrized) |
| `test_device_id_validation` | Device IDs must be alphanumeric (no path traversal) |
| `test_forecast_minutes_non_negative` | Detects negative forecast values |
| `test_wind_speed_non_negative` | Detects negative wind speed |
| `test_pump_duration_limit` | Duration > 60s exceeds hard limit |
| `test_control_action_enum` | Only ON/OFF actions accepted (rejects RESET) |
| `test_timestamps_format` | Validates ISO 8601 timestamp parsing |
| `test_invalid_timestamp` | Rejects malformed timestamps |
| `test_sql_injection_string` | Detects basic SQL injection patterns |
| `test_handle_null_sensor_values` | Verifies None sensor value handling |
| `test_missing_required_fields` | Detects missing `soil_moisture` field |
| `test_vpd_zero_division_prevention` | VPD calc doesn't crash on edge inputs |
| `test_rain_probability_range` | Rejects probability > 100% |
| `test_string_instead_of_float` | Raises `ValueError` on invalid string→float |
| `test_bool_instead_of_int` | Type strictness check for bool vs int |
| `test_extra_fields_ignored` | Extra JSON fields don't cause crashes |
| `test_json_parsing_error` | Malformed JSON raises `JSONDecodeError` |

---

### 2. `calculations.py` — ML Calculations  
**Path:** `src/backend/tests/unit/calculations.py`  
**Class:** `TestCalculations` (6 tests)

Tests the mathematical core of the ML predictor.

| Test | What It Verifies |
|---|---|
| `test_vpd_calculation_standard` | Decay rate at 25°C/60% RH; noon > night |
| `test_moisture_decay_extreme_heat` | Decay rate > 1.0 at 35°C/40% RH |
| `test_rain_confidence_imminent` | Rain in < 2h → `wait=True`, confidence ≥ 0.9 |
| `test_rain_confidence_distant_dry` | Rain in 10h + dry soil (20%) → don't wait |
| `test_saturation_risk` | 90% moisture → `SATURATED`; 80% → not saturated |
| `test_false_dry_detection` | High wind + low humidity + rapid drop → false dry |

---

### 3. `database_ops.py` — Database Operations  
**Path:** `src/backend/tests/unit/database_ops.py`  
**Class:** `TestDatabaseOps` (10 tests)

Tests database CRUD operations with mocked PostgreSQL connections.

| Test | What It Verifies |
|---|---|
| `test_connection_failure_handling` | Raises exception on DB connection timeout |
| `test_get_statistics_empty_db` | Returns zeros when tables are empty |
| `test_insert_log_special_chars` | Emoji/Unicode in logs doesn't crash |
| `test_get_recent_readings_limit` | LIMIT param is correctly passed to SQL |
| `test_insert_watering_event_null_after` | Watering event with null post-moisture |
| `test_sql_query_structure_sensors` | INSERT INTO sensor_readings query is valid |
| `test_get_logs_error_handling` | Raises exception when DB is down |
| `test_ml_decision_insert` | ML decisions INSERT INTO ml_decisions |
| `test_init_database_idempotency` | init_database() can run twice (IF EXISTS) |
| `test_close_connection_called` | Connection is closed after operations |

---

### 4. `decision_logic.py` — ML Decision Logic  
**Path:** `src/backend/tests/unit/decision_logic.py`  
**Class:** `TestDecisionLogic` (5 tests)

Tests the rule-based decision engine inside `MLPredictor.predict_next_watering()`.

| Test | What It Verifies |
|---|---|
| `test_emergency_watering_low_moisture` | 10% moisture → `NOW` + `CRITICAL` (rules override model) |
| `test_rain_delay_logic` | 30% moisture + rain in 60 min → `STALL` + `RAIN_EXPECTED` |
| `test_vpd_delay_midday` | High VPD at 1 PM → `STALL` + `VPD_DELAY` |
| `test_stop_if_raining` | Active rain (intensity 5.0) → `STOP` + `RAINING` |
| `test_proactive_morning_watering` | 5 AM + 40% moisture + high VPD → `NOW` + `PREHEAT` |

---

### 5. `utils.py` — Utility Functions  
**Path:** `src/backend/tests/unit/utils.py`  
**Class:** `TestUtils` (10 tests)

Tests standalone utility functions including VPD calculator.

| Test | What It Verifies |
|---|---|
| `test_vpd_standard` | 25°C/60% RH → VPD ≈ 1.25 kPa |
| `test_vpd_saturated` | 100% humidity → VPD = 0.0 |
| `test_vpd_dry_hot` | 35°C/20% RH → VPD > 3.0 kPa |
| `test_vpd_cold_wet` | 10°C/90% RH → VPD < 0.2 kPa |
| `test_vpd_freezing` | 0°C → still calculates valid VPD |
| `test_vpd_invalid_humidity_high` | Robustness against humidity > 100% |
| `test_date_parsing_util` | Date parser utility (placeholder) |
| `test_decay_rate_math` | 0.5 × 1.2 = 0.6 |
| `test_safe_float_conversion` | "12.5" → 12.5; "invalid" → default 5.0 |
| `test_clamp_function` | Clamps 150 → 100, -10 → 0, 50 → 50 |

---

### 6. `test_weather_api.py` — Weather API  
**Path:** `src/backend/tests/unit/test_weather_api.py`  
**Classes:** 5 test classes (24 tests total)

Comprehensive tests for the `WeatherAPI` class — parsing, fallback, caching, and format consistency.

#### `TestParseOWMForecast` (10 tests)
| Test | What It Verifies |
|---|---|
| `test_parse_wind_speed_conversion` | 3.5 m/s × 3.6 = 12.6 km/h |
| `test_parse_temperature_humidity` | Extracts temp=22.5, humidity=65 from OWM |
| `test_parse_cloud_cover` | Cloud cover from `clouds.all` = 45% |
| `test_parse_precipitation_chance` | pop=0.3 → 30% |
| `test_parse_rain_intensity` | 4.5mm × 20 = 90% intensity |
| `test_parse_condition_cloudy` | Current weather condition = "Clouds" |
| `test_parse_condition_raining` | Current weather condition = "Rain" |
| `test_parse_rain_forecast_minutes` | Minutes until rain from forecast items |
| `test_parse_source_openweathermap` | Source field = "openweathermap" |
| `test_parse_empty_forecast` | Empty forecast → safe defaults (0 wind, 25°C) |

#### `TestSimulateWeather` (2 tests)
| Test | What It Verifies |
|---|---|
| `test_simulate_with_mqtt_data` | Returns MQTT sim data (wind=8.5, source=simulation) |
| `test_simulate_without_mqtt_data` | No MQTT → fallback defaults (wind=0, source=fallback) |

#### `TestGetForecast` (2 tests)
| Test | What It Verifies |
|---|---|
| `test_openweathermap_mode_calls_fetch` | OWM mode calls `_fetch_openweathermap` |
| `test_simulation_mode_calls_simulate` | Sim mode calls `_simulate_weather` |

#### `TestOWMFallback` (4 tests)
| Test | What It Verifies |
|---|---|
| `test_fallback_to_simulator_on_api_error` | API error → falls back to simulator |
| `test_fallback_to_simulator_on_timeout` | Timeout → falls back to simulator |
| `test_simulator_returns_safe_defaults_when_unavailable` | No sim data → safe "fallback" source |
| `test_cache_prevents_repeated_api_calls` | Cached result returned without re-fetching |

#### `TestUnifiedFormat` (3 tests)
| Test | What It Verifies |
|---|---|
| `test_owm_format_has_all_keys` | OWM result has all 10 required keys |
| `test_simulation_format_has_all_keys` | Simulation result has all 10 required keys |
| `test_fallback_format_has_all_keys` | Fallback result has all 10 required keys |

---

## Integration Tests

### 7. `api_endpoints.py` — API Endpoints  
**Path:** `src/backend/tests/integration/api_endpoints.py`  
**Class:** `TestAPIEndpoints` (4 tests)

End-to-end tests for Flask API routes.

| Test | What It Verifies |
|---|---|
| `test_health_check` | `GET /api/health` → 200 + `status: online` |
| `test_predict_endpoint` | `GET /api/predict-next-watering` → 200 + valid action |
| `test_control_pump_manual` | `POST /api/control/pump` → 200 + MQTT publish called |
| `test_logs_retrieval` | `GET /api/logs` → 200 + returns list |

---

### 8. `data_flow.py` — Data Flow  
**Path:** `src/backend/tests/integration/data_flow.py`  
**Class:** `TestDataFlow` (2 tests)

Tests the sensor data → database pipeline.

| Test | What It Verifies |
|---|---|
| `test_db_insert_sensor_reading` | Sensor data INSERT executes with correct SQL |
| `test_system_state_persistence` | AUTO/MANUAL state toggle persists (placeholder) |

---

### 9. `error_handling.py` — Error Handling  
**Path:** `src/backend/tests/integration/error_handling.py`  
**Class:** `TestErrorHandling` (5 tests)

Tests API robustness against malformed requests and internal failures.

| Test | What It Verifies |
|---|---|
| `test_404_not_found` | Unknown `/api/*` route serves React app (200) |
| `test_control_pump_missing_body` | Missing JSON body → 400 or 500 (not crash) |
| `test_sensor_history_invalid_limit_param` | `limit=abc` → uses default, returns 200 |
| `test_weather_endpoint_failure` | Weather endpoint always returns 200 with valid keys |
| `test_predict_endpoint_internal_error` | ML crash → 500 + error message in JSON |

---

### 10. `weather_fallback.py` — Weather Fallback  
**Path:** `src/backend/tests/integration/weather_fallback.py`  
**Classes:** 3 test classes (8 tests)

Tests weather source priority (OWM > Simulator > Fallback) in app.py.

#### `TestWeatherSourcePriority` (4 tests)
| Test | What It Verifies |
|---|---|
| `test_real_mode_ignores_sim_weather` | OWM mode blocks simulator MQTT data |
| `test_sim_mode_accepts_sim_weather` | Sim mode accepts simulator MQTT data |
| `test_real_mode_fetches_real_weather_on_sensor_update` | Sensor MQTT → triggers OWM fetch |
| `test_real_mode_sensor_update_survives_api_failure` | OWM failure doesn't lose sensor data |

#### `TestWeatherFallbackEndpoint` (3 tests)
| Test | What It Verifies |
|---|---|
| `test_weather_endpoint_returns_200` | `/api/weather/forecast` always 200 |
| `test_weather_endpoint_has_required_keys` | Response contains temperature, condition |
| `test_weather_endpoint_wind_is_reasonable` | Wind 0–150 km/h (realistic bounds) |

#### `TestDataFlowConsistency` (2 tests)
| Test | What It Verifies |
|---|---|
| `test_weather_source_is_openweathermap_in_real_mode` | Logged source = "openweathermap" |
| `test_weather_source_is_simulation_in_sim_mode` | Logged source = "simulation" |

---

### 11. `simulation_api.py` — Simulation API  
**Path:** `src/backend/tests/integration/simulation_api.py`  
**Class:** `TestSimulationAPI` (5 tests)

Tests the simulation step/reset/state API endpoints.

| Test | What It Verifies |
|---|---|
| `test_reset_default_scenario` | Reset → mixed_weather, running=false |
| `test_reset_custom_scenario` | Reset heat_wave → temp=38°C |
| `test_simulation_step_logic` | Step → step=1, hour=8.25 |
| `test_get_simulation_state` | State includes fields + weather |
| `test_invalid_scenario_fallback` | Invalid name → mixed_weather default |

---

### 12. `test_analytics_aggregated.py` — Analytics Aggregation  
**Path:** `src/backend/tests/integration/test_analytics_aggregated.py`  
**Class:** `TestAggregatedAnalytics` (4 tests)

Live database integration tests using a dedicated `pwos_test_db`.

| Test | What It Verifies |
|---|---|
| `test_basic_functionality_and_aggregation_correctness` | AVG(moisture)=55, SUM(duration)=75 |
| `test_bucket_alignment` | 15-min buckets align to XX:00:00 boundaries |
| `test_edge_cases_empty_and_mismatched` | Empty DB, events-only, readings-only |
| `test_parameter_validation` | Invalid params (hours=broken) → safe defaults |

> **Note:** Requires PostgreSQL running. Uses `pwos_test_db` (auto-created/dropped per session).

---

## Scenario Tests

### 13. `edge_cases.py` — Sensor Anomalies  
**Path:** `src/backend/tests/scenarios/edge_cases.py`  
**Class:** `TestEdgeCases` (5 tests)

Tests system behavior under abnormal sensor conditions.

| Test | What It Verifies |
|---|---|
| `test_sudden_moisture_spike` | 10→90% spike → STOP or MONITOR (not NOW) |
| `test_sensor_drift_handling` | Consistent weird values (placeholder) |
| `test_negative_readings` | -50% moisture robustness (placeholder) |
| `test_all_zeros_scenario` | All zeros → NOW (critical watering) |
| `test_max_values_scenario` | All 100 → never water |

---

### 14. `conflict_resolution.py` — Logic Conflicts  
**Path:** `src/backend/tests/scenarios/conflict_resolution.py`  
**Class:** `TestConflictResolution` (3 tests)

Tests priority resolution when multiple rules conflict.

| Test | What It Verifies |
|---|---|
| `test_manual_override_persists` | Manual mode persists against auto logic (placeholder) |
| `test_rain_vs_critical_dry` | Rain + 5% moisture → NOW (critical wins over rain) |
| `test_heatwave_vs_critical_dry` | Heatwave + 10% moisture → NOW (survival wins) |

---

### 15. `environmental.py` — Environmental Scenarios  
**Path:** `src/backend/tests/scenarios/environmental.py`  
**Class:** `TestEnvironmentalScenarios` (3 tests)

Tests real-world weather-driven decision scenarios.

| Test | What It Verifies |
|---|---|
| `test_rain_event_scenario` | Dry→Rain transition → STOP + RAINING |
| `test_heatwave_prevention` | 38°C/15% RH at 2 PM → STALL (VPD too high) |
| `test_high_wind_safety` | Wind 25 km/h → STALL (spray drift) |

---

## Performance Tests

### 16. `benchmarks.py` — Performance Benchmarks  
**Path:** `src/backend/tests/performance/benchmarks.py`  
**Class:** `TestPerformance` (2 tests)

| Test | What It Verifies |
|---|---|
| `test_inference_latency` | 100 predictions avg < 100ms |
| `test_decision_throughput` | > 0 decisions/sec under load |

---

## Test Summary

| Category | Files | Test Classes | Total Tests |
|---|---|---|---|
| **Unit** | 6 | 7 | ~75 |
| **Integration** | 6 | 8 | ~25 |
| **Scenarios** | 3 | 3 | ~11 |
| **Performance** | 1 | 1 | 2 |
| **Total** | **16** | **19** | **~113** |
