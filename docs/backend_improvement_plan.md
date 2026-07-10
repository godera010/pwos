# Backend Improvement Plan

Derived from the backend code review of 2026-07-10 (grade: B+, 87/100). Items are ordered
by severity. Each item lists the file, the defect, and the fix applied.

---

## Phase 1 — Critical bug fixes

### 1.1 Dead `pump_scale_factor` in ML predictions — DONE
- **File:** `src/backend/models/ml_predictor.py` (~line 305)
- **Defect:** `db.get_system_setting('pump_scale_factor', '1.0')` references an undefined
  name `db` (the instance attribute is `self.db`). The call always raises `NameError`,
  the surrounding `except` swallows it, and `scale_factor` silently stays `1.0`.
  The pump-scale setting has never affected predictions.
- **Fix:** Use `self.db.get_system_setting(...)`.

### 1.2 Watering events silently skipped when sensor reads 0.0 — DONE
- **File:** `src/backend/app.py` (`control_pump`, ~line 373)
- **Defect:** `if action == 'ON' and moisture_before:` — a legitimate `0.0` moisture
  reading is falsy, so the watering event is never logged.
- **Fix:** `if action == 'ON' and moisture_before is not None:`.

### 1.3 Leftover test schedule retrains 5×/day — DONE
- **File:** `src/backend/scheduler.py` (~line 53)
- **Defect:** Retraining is scheduled daily at midnight *and* every 6 hours; the 6-hour
  job is a leftover marked "for testing".
- **Fix:** Remove the 6-hour job; keep the daily midnight retrain.

### 1.4 Model-load logging crashes on missing metadata key — DONE
- **File:** `src/backend/models/ml_predictor.py` (`_load_model`, ~line 65)
- **Defect:** `f"...{self.metadata.get('accuracy','?'):.4f}"` raises `ValueError` when
  `accuracy` is absent (formats the string `'?'` with `:.4f`).
- **Fix:** Format defensively without applying a float format spec to a fallback string.

---

## Phase 2 — Robustness

### 2.1 Thread-safe shared state — DONE
- **File:** `src/backend/app.py`
- **Defect:** `latest_sensor_data` and `system_state` are mutated from the MQTT thread
  and read from Flask request threads with no synchronization.
- **Fix:** Add a module-level `state_lock` (`threading.Lock`); take it around all
  mutations and multi-key reads (snapshot with `dict(...)` for readers).

### 2.2 Unbounded thread spawn for ML decision logging — DONE
- **File:** `src/backend/app.py` (`predict_next_watering`)
- **Defect:** A new `threading.Thread` is created per prediction request just to insert
  the decision row.
- **Fix:** One daemon worker thread draining a `queue.Queue`; the endpoint enqueues.

### 2.3 Unchecked MQTT publish result for pump commands — DONE
- **File:** `src/backend/app.py` (`control_pump`)
- **Defect:** The watering event is recorded regardless of whether the MQTT publish
  succeeded (`result.rc` never inspected).
- **Fix:** Log a warning when `result.rc != MQTT_ERR_SUCCESS` and surface `mqtt_ok` in
  the response.

### 2.4 Brittle positional row access on `SELECT *` — DONE
- **Files:** `src/backend/database.py` (`get_readings_by_timerange`), `src/backend/app.py`
- **Defect:** `get_sensor_history` reads `row[9]` (vpd) from a `SELECT *`; any column
  reorder or addition silently corrupts the API response.
- **Fix:** Select an explicit column list so positions are contractual.

### 2.5 Scratch file at backend root — DONE
- **File:** `src/backend/test_db.py`
- **Defect:** Ad-hoc scratch script (inserts a watering event) sitting in the package
  root; pytest's `python_files = *.py` means anything named like this risks accidental
  collection.
- **Fix:** Deleted (tracked in git history if ever needed).

---

## Phase 3 — ML methodology: break the circular labeling

### 3.1 Outcome-based labels instead of rule-derived labels — DONE
- **File:** `src/backend/ai_service/data_extractor.py`
- **Defect:** The training label `needs_watering_soon` is computed deterministically from
  the same features the model sees (current moisture vs. threshold + the same suppression
  formula reapplied at inference). The Random Forest re-learns the if-statements,
  producing a meaningless 100% accuracy — the trainer's own leakage warning fires.
- **Fix:** Label from *future outcomes*: a row is positive when the observed soil
  moisture drops below the crop's critical threshold within the next `LOOKAHEAD_HOURS`
  (default 3h), computed with a reverse rolling minimum over the time-sorted series.
  The suppression formula is removed from labeling entirely — it remains an
  inference-time safety gate in `ml_predictor.py`, where it belongs. Applied to local
  telemetry, the crop-region expansion, and the Mendeley/Zenodo loaders.
- **Retrain result (2026-07-10):** Retrained on 855k rows with the new labels.
  Honest metrics: **F1 0.7638, accuracy 74.4%, ROC-AUC 0.838**, label balance 43.8%
  positive. Feature importances are now distributed (moisture_rolling_6 36%,
  soil_moisture 33%, hour 8%, moisture_change_rate 7%, crop traits ~13% combined) —
  the leakage warning no longer fires. The pipeline's rollback gate correctly refused
  the "regression" from the inflated 0.9998 F1, so the model was promoted manually
  once (`v20260710_061649_outcome_labels`, logged to the model registry,
  `model_needs_reload` flag set). Future retrains now gate against the honest baseline.

---

## Phase 5 — Data-grounded model improvements (2026-07-10) — DONE

A data audit compared the training pipeline against `data/` and the live PostgreSQL DB:

| Source | Rows | Weather ↔ future-moisture correlation |
|---|---|---|
| Live DB `sensor_readings` | 266k (212k with OpenWeatherMap weather) | r ≈ +0.001 — weather is recorded but moisture never responds to it (simulated/potted) |
| Zenodo maize (`data/raw/maize_cowpea`) | ~217k across 5 loggers / 6 probes | **r ≈ +0.25 for rain**; +0.7%/3h moisture gain when raining — the only genuinely co-observed source |
| Mendeley tomato | 15k | has no rain/wind columns at all |
| Zimbabwe weather CSVs | 3×15 days | weather only, no moisture — previously randomly injected over local telemetry |

Changes made accordingly:
- **Removed random weather injection** in `data_extractor.py` (it made weather
  uncorrelated with the label by construction — the model had learned to ignore
  weather: importances 0.1–0.2%). Local telemetry keeps its actually recorded
  weather; `precipitation_chance`/`forecast_temp` now come from the DB instead of
  `np.random`.
- **Ingest all 5 Zenodo dataloggers** (6 moisture probes, capped 120k rows) instead
  of one; probe theta mapped to system % via agronomic anchors (wilting 0.05 v/v →
  30%, field capacity 0.25 v/v → 90%) replacing the ad-hoc ×200 scaling that put the
  median arid reading below every crop threshold (~90% positive stratum).
- **Timestamp normalization** at export + `format='mixed'` parsing in the trainer —
  mixed formats had silently dropped 130k rows (nearly all of the co-observed data).
- **Lookahead tuned empirically to 6h** (3h → weather never decides the label;
  24h → 79% positive, model degenerates to always-water).
- **Excluded `synthetic_training_data.csv`** from training: its labels use the legacy
  rule-based scheme and contradict outcome-based labels.
- **Dropped `growth_stage`** feature (constant 2 everywhere, importance 0.0).
- **Isotonic probability calibration** on a chronological 10% slice
  (`CalibratedClassifierCV`), since decision logic gates on `predict_proba`
  thresholds. Brier score: 0.397 raw → 0.169 calibrated.

**Deployed model `v20260710_075720_outcome_labels`** (335k rows, 44.5% positive):
accuracy 73.2%, ROC-AUC 0.797, F1 0.786 (precision 0.90 / recall 0.70).
Weather features now carry ~28% combined importance (forecast_temp 9.4%,
wind 7.4%, precipitation 5.7%) vs ~0.5% before. All tests pass (114 passed,
4 skipped). Note: CV fold variance remains high (chronologically concatenated
heterogeneous datasets) — interpret single-fold numbers cautiously.

---

## Phase 4 — Deferred / accepted risks (not changed)

- **Mock-detection in production code** (`database.py` checks
  `isinstance(psycopg2.connect, Mock)`): works, but test-awareness belongs in fixtures.
  Defer to a dedicated refactor (inject a connection factory).
- **Weather fetch inside the MQTT callback** (`app.py on_message`): worst case two 5s
  HTTP calls block the MQTT loop, but the 10-minute cache makes this rare. Revisit if
  message loss is observed.
- **CORS wildcard with credentials in debug mode**: debug-only; do not ship with
  `FLASK_DEBUG=1`.
- ~~**Performance test thresholds**~~ — RESOLVED, see Phase 6.

---

## Phase 6 — Prediction latency & test isolation (2026-07-10) — DONE

Profiling showed 84 of the 85ms per prediction was the Random Forest being
traversed twice (`predict` + `predict_proba`, ~42ms each), each call dominated
by joblib parallel-dispatch overhead: the forest was saved with `n_jobs=-1`,
which costs ~40ms of thread-pool setup per single-row call.

- **`ml_predictor.py`**: force `n_jobs=1` on the loaded model and everything
  nested inside it (`_force_single_thread`), and infer once via `predict_proba`
  (deriving the class by argmax) instead of predicting twice.
- **Result:** p50 15.2ms / p95 22.2ms / p99 35.2ms (was p50 ~85ms, p95 >100ms);
  throughput 61 decisions/sec (was 6.7). Both performance tests now pass.
- **Test isolation** (perf tests passed standalone but failed inside the full
  suite): `app.py` and `weather_api.py` no longer connect to the live MQTT broker
  under pytest — with a simulator running locally, broker traffic was doing DB
  writes and weather fetches inside the test process, spiking p95 to ~250ms.
  The stress test now also pins the scenario's crop via a `get_active_crop` patch,
  since the predictor otherwise reads the active crop from the shared DB and a
  concurrently running frontend changes test behavior mid-run.
- Full suite: **132 tests — 128 passed, 4 skipped, 0 failed — in 53s** (was 5m50s).

---

## Phase 7 — End-to-end reaction latency (2026-07-10) — DONE

Symptom: moving the sensor into dry soil showed the new reading immediately,
but the decision arrived seconds later. Full pipeline budget traced:

| Hop | Before | After |
|---|---|---|
| ESP32 sample → publish | ≤1s (SAMPLE_INTERVAL 1000) | unchanged |
| MQTT → backend memory | ~1ms, **up to 10s** when a weather cache-miss ran 2×5s HTTP calls inside the MQTT callback | never blocks (see below) |
| Autopilot reaction | up to **5s** idle poll + reload-check HTTP every cycle | **instant wake** on ≥2% moisture jump; reload-check throttled to 60s |
| Prediction | 16ms (Phase 6) | unchanged |
| Pump command → relay | ~10–50ms | unchanged |
| NOW cooldown | 90s between pump triggers | unchanged (by design) |

Changes:
- **`automation_controller.py`**: subscribes to `pwos/sensor/data`; a moisture
  jump ≥ `WAKE_DELTA_PCT` (2%) sets an event that interrupts the poll sleep, so
  the "sensor into dry soil" case is decided in ~1–2s (sensor interval + HTTP
  chain) instead of up to 6s+. Fixed polling remains the fallback when the
  broker is down. Model reload-check throttled from every cycle to every 60s.
- **`app.py` / `weather_api.py`**: sensor ingest merges weather inline only when
  `weather_api.has_fresh_cache()` (sub-ms); otherwise a single-flight background
  thread fetches it. The MQTT callback — which all subsequent sensor messages
  queue behind — never performs network I/O anymore. Worst case before: with the
  weather API down, ingest froze ~10s every 60s.
- **`latency_probe.py`** (new, backend root): measures the live system hop by
  hop — API RTTs, MQTT-publish→API-visible ingest latency, pump command path —
  plus a summary of fixed by-design delays. Run with backend + Mosquitto up.

Remaining floors (by design): 1s sensor publish interval, 90s NOW cooldown,
and the 2s active-poll fallback for gradual (sub-2%) moisture drift.

---

## Phase 8 — Why the system, not the model, stopped the pump (2026-07-10) — DONE

Observed: pump cycles were usually terminated by the safety cutoff rather than
running their model-recommended duration. Audit of `watering_events`,
`system_logs`, and `system_settings` explained it:

- **`pump_scale_factor` is set to `0.01` in the DB** (via `set_pump_scale.py`,
  intended for pot-scale watering) — but until the Phase-1 `db`→`self.db` fix it
  was **never applied** (silent `NameError`). Durations were therefore
  field-sized (30–60s+) in a small pot: the probe saturated within seconds and
  the autopilot's in-cycle cutoff stopped the pump — "the system stopped it."
- **`0.01` is intentional (bench-scale test rig).** Now that the factor applies,
  understand its consequence: all durations collapse to the 2s floor (10–120s
  unscaled × 0.01 < 2s), so the model still decides *when* to water but its
  *duration* output is flat — the system runs as bang-bang control (2s pulse →
  90s cooldown → re-check), with the `moisture_max` cutoff as the regulator.
  That is a valid mode for a bench pot. To make proportional durations visible
  (drier soil → longer watering), use `py set_pump_scale.py 0.05`–`0.1`
  (spreads durations across 2–12s; below 0.05 the integer-second hardware
  granularity leaves no resolution anyway). The predictor logs a throttled
  warning (10-min interval) whenever the scale factor flattens durations.
- **Settings key mismatch in the autopilot** — it read `crop_high_threshold` /
  `crop_critical_moisture`, keys `/api/settings` never provided, so the in-cycle
  cutoff always used the 85% fallback and the MANUAL-mode safety floor always
  used 15%, ignoring configured values. Now mapped to the real keys:
  cutoff = `moisture_max`, safety floor = `moisture_threshold × 0.5`.
- Known gap (not fixed): `moisture_after` capture uses an in-process 60s Timer,
  so backend restarts during testing leave NULLs in `watering_events`.

---

## Verification

- Run: `py -m pytest tests --ignore=tests/performance` from `src/backend`.
- All unit/integration/scenario tests must pass after each phase.
