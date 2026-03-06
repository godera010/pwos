# firmware/ - ESP32 Firmware

**P-WOS Embedded Device Code**

---

## 📁 Structure

```
firmware/
└── esp32_main.py    # MicroPython firmware for real ESP32 hardware
```

---

## Purpose

This directory contains the firmware that will run on the actual ESP32 microcontroller when deployed to real hardware. During development, the `simulation/esp32_simulator.py` is used in place of this firmware.

## Status

🚧 **Future** — Currently using simulated ESP32 via `src/simulation/esp32_simulator.py`.
