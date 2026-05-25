# 🧠 Core Logic Summary

Behind the dashboard and sensors, P-WOS relies on two main components to make smart watering decisions: a **Machine Learning (ML) Brain** and a **Rules-Based Decision Engine**. Together, they form the "intelligence" of the autopilot.

---

## 🌲 1. How the Machine Learning Brain Thinks

Instead of using a simple "yes/no" threshold, P-WOS uses an ML model called a **Random Forest Classifier**.

* **What is a Random Forest?** Imagine a panel of 100 agricultural experts. Each expert is given a list of rules (a decision tree) based on historical data. When the system asks, "Should we water now?", all 100 experts vote based on their rules. The system goes with the majority vote.
* **What features does it look at?** Every 5 seconds, the brain evaluates 11 different factors, including:
  * Current soil moisture and how fast it is drying out.
  * Current air temperature and humidity.
  * Recent rolling averages of moisture (to ignore temporary sensor noise).
  * Time of day and day of the week (to learn daily sun cycles).
  * How many minutes remain before the next predicted rain event.
* **Why this is better:** Traditional systems only look at soil moisture. P-WOS looks at the *combination* of factors. For example, if moisture is low but air humidity is 95% and rain is expected in 30 minutes, the brain votes "Wait," preventing water waste.

---

## 🌡️ 2. The Physics of Evaporation (VPD)

Rather than just measuring temperature, P-WOS uses a scientific metric called **Vapor Pressure Deficit (VPD)** to estimate how fast soil is drying out.

* **What is VPD?** Think of VPD as **"how thirsty the air is."** It is calculated by combining air temperature and relative humidity. 
  * If the air is cold and humid, the VPD is low (the air is saturated, and evaporation is slow).
  * If the air is hot and dry, the VPD is high (the air is "thirsty," and it sucks moisture out of the soil and leaves rapidly).
* **The Decay Engine:** When the sensors are resting or offline, the P-WOS server uses the VPD calculation to estimate how much water is evaporating per hour, ensuring our data remains accurate even during minor communication gaps.

---

## 📋 3. The Autopilot's Priority List

The autopilot daemon doesn't just blindly follow the ML model. It runs sensor data through a strict **Priority List** every 5 seconds to ensure safety comes first:

```
[Priority 1] Saturation Check ──────► Soil moisture > 85%? Cut pump immediately (STOP).
     │
     ▼ (No)
[Priority 2] Critical Dryness ─────► Soil moisture < Critical limit? Force pump ON (NOW).
     │
     ▼ (No)
[Priority 3] Rain Forecast ────────► Rain expected soon? Hold watering (STALL).
     │
     ▼ (No)
[Priority 4] Weather Stress ───────► Wind too high or extreme heat? Hold watering (STALL).
     │
     ▼ (No)
[Priority 5] ML Brain Vote ────────► Ask the Random Forest model: Water or Wait?
```

This priority list ensures that safety overrides (drowning or critical drought protection) always win, no matter what the ML model recommends.

---

## 📊 4. Water Savings Calculation

The dashboard tracks your system's efficiency by comparing P-WOS against a simulated traditional timer:
* **The Baseline:** Assumes a standard reactive schedule (watering for a set duration whenever moisture is below the target).
* **P-WOS Usage:** Records the exact seconds the autopilot ran the pump.
* **The Savings:** 
  $$\text{Saved Water (Liters)} = \text{Traditional Usage} - \text{P-WOS Usage}$$
  In our validated runs, this smart postponement and duration adjustment saved **16.7%** of water while keeping plants perfectly healthy.

---

> [!NOTE]
> Are you looking for the exact Saturation Vapor Pressure equations (Tetens formula), database table schemas, or model hyperparameter scores? Refer to the **[P-WOS Master System Manual](../MASTER_SYSTEM_MANUAL.md)**.
