# 07 — System Behaviour

> **The "inner life" of P-WOS.** This section documents what the system actually *does* — how it thinks, reacts, decides, and adapts in response to sensors, weather, crops, and time.

---

## ⚡ Master Reference

| Document | What it answers |
|---|---|
| [**MASTER_SYSTEM_MANUAL.md**](../MASTER_SYSTEM_MANUAL.md) | **The Definitive Full-Stack Engine Manual** |

---

## Detailed Topic Guides

| Document | What it answers |
|---|---|
| [system_overview.md](system_overview.md) | System modes, the 5-second control loop, state machine, 4 output actions |
| [dataflow.md](dataflow.md) | Full MQTT pipeline, PostgreSQL schema, weather path, inference path, error paths |
| [vpd_and_weather_engine.md](vpd_and_weather_engine.md) | VPD physics, moisture decay model, rain confidence, 11 real weather scenarios |
| [crop_profiles.md](crop_profiles.md) | All 5 crops + 3 regions, threshold tables, how crops change every decision |
| [ml_model_deep_dive.md](ml_model_deep_dive.md) | What the model predicts, feature roles, Decision Engine state machine |
| [analytics_reference.md](analytics_reference.md) | All 8 dashboard pages — charts, calculations, data sources |
| [edge_cases_and_scenarios.md](edge_cases_and_scenarios.md) | Complete "what happens when" handbook with traced scenarios |

---

## Reading Order

If you're new to the system internals, read in this order:

1. **`MASTER_SYSTEM_MANUAL.md`** — The high-level encyclopedia
2. **`system_overview.md`** — understand the big picture and control loop
3. **`dataflow.md`** — trace data from sensor to pump
4. **`vpd_and_weather_engine.md`** — understand the physics engine
5. **`crop_profiles.md`** — understand how crops personalise decisions
6. **`ml_model_deep_dive.md`** — understand the AI layer
7. **`analytics_reference.md`** — understand what the dashboard shows
8. **`edge_cases_and_scenarios.md`** — stress-test your understanding

---

*P-WOS v3.0 | System Behaviour Documentation*
