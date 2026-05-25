# P-WOS React Native Mobile Application Guide

This document is the official technical guide and architectural reference for the **P-WOS React Native Mobile Application** supporting iOS and Android. The application has been fully implemented in the codebase under `src/mobile/`.

[← Back to Docs Index](../README.md)

---

## 📱 Tech Stack & Implementation Decisions

1. **Core Framework**: **React Native + Expo SDK 51**
   * *Rationale*: Expo SDK provides standard access to native APIs, prebuilt environments, and modern bundling toolchains.
2. **Navigation & Routing**: **Expo Router v3**
   * *Rationale*: Implements file-system based routing (tabs, stacks, and presentation modals) matching modern React web frameworks, mapping clean state changes.
3. **Styling Engine**: **NativeWind v4 + react-native-css**
   * *Rationale*: Custom Tailwind CSS wrappers are defined at `src/mobile/src/tw/` to allow CSS-first styling of native wrappers (`View`, `Text`, `ScrollView`, `Pressable`, `TextInput`), ensuring complete style parity with the Web dashboard.
4. **State Management**: **Lightweight Pub/Sub Store**
   * *Rationale*: Custom reactive store modeled on Zustand's API footprint (`useAppStore(selector)`) that integrates real-time background fetch polling and MQTT subscriptions.
5. **Real-Time Data**: **MQTT over WebSockets**
   * *Rationale*: Native standard TCP MQTT clients are fragile or unsupported in standard JS mobile contexts. P-WOS Mobile connects directly to Mosquitto’s WebSocket listener on port `9001` (`ws://<host>:9001`).

---

## 📂 Mobile Project Folder Structure

The mobile application is fully scaffolded and compiled under `src/mobile/`:

```
src/mobile/
├── app/                       # Expo Router File-Based Routing
│   ├── _layout.tsx            # Global Layout, Tailwind imports, Theme Providers
│   ├── (tabs)/                # Bottom Tab Navigator
│   │   ├── _layout.tsx        # Tab Bar Layout
│   │   ├── index.tsx          # Dashboard Screen (gauges, weather)
│   │   ├── controls.tsx       # Mode selectors, pump duration, live logs
│   │   ├── analytics.tsx      # Prediction summaries, VPD curves, decay stats
│   │   └── settings.tsx       # Target moisture, coordinates, calibration
│   └── modal/                 # Overlay Modals
│       └── pump-timer.tsx     # Active pump duration countdown
├── src/
│   ├── global.css             # Tailwind v3 variables & custom styles
│   ├── services/
│   │   └── api.ts             # REST client connected to Python backend
│   ├── store/
│   │   └── useAppStore.ts     # State management and background syncing
│   └── tw/
│       └── index.tsx          # Utility CSS components wrapped with react-native-css
├── package.json               # Dependencies and scripts
├── tailwind.config.js         # Color tokens & typography settings
├── metro.config.js            # Metro bundler configuration
└── app.json                   # Expo App configuration (with Android 15 alignment)
```

---

## ⚙️ REST & MQTT Integration

### 1. Dynamic API Resolver (`src/services/api.ts`)
Since localhost inside a simulated mobile engine points to the virtual loopback device, the app fetches current settings from your custom Wi-Fi server IP.
The REST API client handles requests dynamically:
* In settings, users can input their server's host IP (e.g. `192.168.1.X`).
* The store automatically updates endpoints to point to the correct gateway, making resting and testing on physical mobile units seamless.

### 2. WebSocket MQTT client (`src/store/useAppStore.ts`)
Establishes a connection to the MQTT WebSockets listener:
```typescript
import init from 'react_native_mqtt';
// Connects to: ws://<customServerIp>:9001/mqtt
```
Subscribes to topics:
* `pwos/sensor/data` — Real-time moisture, temperature, humidity.
* `pwos/system/hardware` — Real-time hardware online/offline interlock status.
* `pwos/system/mode` — Auto/Manual pilot status.

---

## 🎨 Screen Walkthrough

1. **🏠 Dashboard (`app/(tabs)/index.tsx`):**
   * Displays a visually brilliant circular SVG soil moisture gauge with dynamic colors based on current hydration level.
   * Renders the **AI Recommendation Card** specifying current predicted action (`NOW` / `STALL` / `STOP` / `MONITOR`), confidence rating, and decision reasoning text.
   * Displays local OpenWeather API weather forecasting context (air temperature, rain probability, and wind velocity).

2. **🎛️ Controls Center (`app/(tabs)/controls.tsx`):**
   * Custom iOS-style switch to override between **AUTO** (AI managed) and **MANUAL** modes.
   * Tactile slider buttons to specify watering durations (in seconds).
   * **MQTT Broadcast Console**: GLOWING terminal dashboard displaying incoming JSON packets in real time directly from the broker.

3. **📈 Analytics (`app/(tabs)/analytics.tsx`):**
   * High-fidelity custom SVG line chart displaying moisture history with glowing gradients and coordinate tracking nodes.
   * Displays calculated Soil Decay and evaporation physics indexes.

4. **⚙️ Settings (`app/(tabs)/settings.tsx`):**
   * Host gateway IP controller configuration.
   * Irrigation threshold parameters synced with the Flask backend database.
   * Latitude and longitude configuration profiles.

5. **⏱️ Pump Countdown Modal (`app/modal/pump-timer.tsx`):**
   * Transparent modal rendering a prominent counting gauge that displays remaining watering seconds, plus a "Terminate Cycle" manual override button.

---

## 🛡️ Verification & Deployment Workflow

### 1. Installation
To set up packages cleanly, run:
```bash
cd src/mobile
npm install --legacy-peer-deps
```

### 2. Type-Checking Verification
Verify compilation and typescript accuracy using:
```bash
npx.cmd tsc --noEmit
```

### 3. Local Execution
Run the development Metro Server:
```bash
npx.cmd expo start
```
* Press `a` to load the app inside the Android Emulator.
* Press `i` to load the app inside the iOS Simulator.
* Scan the console QR code using the Expo Go mobile client to run on physical devices.

### 4. Build Bundling & Android 15 Compliance
The application is preconfigured inside `app.json` with `useLegacyPackaging: false` via `expo-build-properties` to package `.so` native libraries using 16 KB page-size alignment, resolving Android 15 memory-page crash issues.

To compile production bundles:
* **Android APK/AAB:** `eas build --platform android`
* **iOS IPA:** `eas build --platform ios`
