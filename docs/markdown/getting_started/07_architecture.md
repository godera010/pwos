# ⚙️ System Overview & Autopilot

At the core of P-WOS is an **Autopilot Engine** that runs continuously in the background. Every 5 seconds, this engine reviews the plant's health, checks the sky, and decides exactly how to control the water pump.

---

## 🚦 The 4 Autopilot Decisions

In every 5-second cycle, the autopilot selects exactly one of these actions:

| Action | Pump State | Conceptual Meaning |
|:---|:---|:---|
| **NOW** | ✅ **ON** | Water immediately. The pump runs for a carefully calculated duration (e.g. 15 to 45 seconds). |
| **STALL** | ❌ **OFF** | Delay watering. Used when the plant is dry, but conditions are bad (e.g., rain is coming, wind is too high, or watering recently occurred). |
| **STOP** | ❌ **OFF** | Hard shutdown. Used when the soil is already saturated, it is actively raining, or the sensors are disconnected. |
| **MONITOR** | ❌ **OFF** | Watch and wait. The plant has sufficient water and is healthy. |

---

## 🔄 The 5-Second Cycle Flow

Here is how the autopilot behaves on each 5-second tick:

```
[Start 5-Second Tick]
         │
         ▼
 1. Check Control Mode ──► Is it in MANUAL?
         │                    ├─► Yes: Stand down, wait 5s, repeat.
         │                    └─► No:  (AUTO Mode) Continue.
         ▼
 2. Read Sensors & Weather ──► Gather soil moisture, temperature, wind, and forecast.
         │
         ▼
 3. Run Safety Boundaries ──► Is soil bone-dry? Force water ON (Emergency).
         │                ──► Is soil fully saturated? Shut pump OFF (Safety).
         ▼
 4. Run Weather Filters ──► Is rain expected? Delay watering (STALL).
         │              ──► Is it too hot or windy? Delay watering (STALL).
         ▼
 5. Ask the ML Model ──► If all checks pass, ask the brain: Water or Wait?
         │
         ▼
 6. Enforce Cooldown ──► Was pump run recently? Wait for soil absorption (STALL).
         │
         ▼
[Execute Action & Sleep 5s]
```

---

## 🎛️ Auto vs. Manual Control

P-WOS allows you to toggle between two states:
* **AUTO Mode:** The autopilot makes all decisions based on sensors and the ML model. No human interaction is required.
* **MANUAL Mode:** The user has taken over control. You can turn the pump on or off via the dashboard dashboard.

### 🛡️ Unbreakable Safety Interlocks
To prevent disaster, **two critical safety rules remain active in both Auto and Manual modes**:
1. **Saturation Cutoff:** If moisture reaches **85%**, the pump shuts off immediately, preventing root rot or flooding.
2. **Critical Drought Rescue:** If moisture drops below the crop's **Critical Limit** (e.g. 15%), the system automatically switches back to AUTO mode and starts watering immediately to save the crop.

---

## ⏱️ The 15-Minute Cooldown

After the pump runs, water takes time to sink down through the soil and reach the sensor probes. If the autopilot re-evaluated the soil immediately, it would think the soil is still dry and turn the pump on again, causing over-watering.

To prevent this, P-WOS enforces a **15-minute cooldown (900 seconds)** after every watering. During this window:
* The pump is blocked from running.
* The autopilot status shows **STALL** with the reason "Watering in cooldown."
* This gives the water plenty of time to percolate, ensuring the next sensor reading is accurate.

---

## 🌟 Key Autopilot Design Rules

* **Safety First:** Simple, hardcoded boundaries (flood and drought protection) always override machine learning suggestions.
* **Smart Logging:** The system only writes a log entry when the *status changes*. If your plant is healthy for 8 hours, it logs one entry rather than cluttering your dashboard with thousands of repetitive messages.
* **Resilience:** If the internet drops or a sensor temporarily fails, the system doesn't crash. It logs a warning, falls back to local simulation logic, and keeps trying.
* **Real-Time Updates:** Any settings you change on the dashboard (like switching crops or changing coordinates) are picked up by the autopilot within 5 seconds.

---

> [!NOTE]
> Are you a software developer or system integrator looking for exact JSON structures, C++ active safety loops, or daemon startup logs? Refer to the **[Technical System Overview Guide](../system_architecture/system_overview.md)**.
