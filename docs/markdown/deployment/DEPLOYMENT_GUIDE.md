# P-WOS Production Deployment Guide

> **Status:** Prepared for reference — system is currently running in local development mode.  
> All source code changes below should be applied when you are ready to deploy to a cloud environment.

---

## Table of Contents

1. [Recommended Stack](#1-recommended-stack)
2. [Architecture Overview](#2-architecture-overview)
3. [Pre-Deployment Checklist](#3-pre-deployment-checklist)
4. [Change 1 — Backend: MQTT Cloud Support](#4-change-1--backend-mqtt-cloud-support)
5. [Change 2 — ESP32 Firmware: TLS Client](#5-change-2--esp32-firmware-tls-client)
6. [Change 3 — Frontend: API URL via Env Var](#6-change-3--frontend-api-url-via-env-var)
7. [Change 4 — Environment Variables](#7-change-4--environment-variables)
8. [Change 5 — CI/CD with GitHub Actions](#8-change-5--cicd-with-github-actions)
9. [Platform Account Setup](#9-platform-account-setup)
10. [Database Migration](#10-database-migration)
11. [Post-Deployment Verification](#11-post-deployment-verification)

---

## 1. Recommended Stack

| Component | Platform | Free Tier | Notes |
|-----------|----------|-----------|-------|
| **Flask Backend** | [Koyeb](https://koyeb.com) | ✅ Always-on, 512 MB RAM | Auto-deploys from GitHub. No Docker required. |
| **PostgreSQL DB** | [Neon](https://neon.tech) | ✅ 0.5 GB storage | Serverless Postgres. Never sleeps. |
| **MQTT Broker** | [EMQX Cloud](https://www.emqx.com/en/cloud) | ✅ Free Serverless tier | Supports port 1883 (plain) AND 8883 (TLS). |
| **React Frontend** | Served by Flask | ✅ No extra cost | Build `dist/` and Flask serves it statically. |

> **Why EMQX over HiveMQ?**  
> Your ESP32 firmware currently uses `WiFiClient` (plain TCP, port 1883). EMQX's free tier supports **unencrypted port 1883**, so the ESP32 can connect without any firmware changes. HiveMQ Cloud requires TLS-only (port 8883).

---

## 2. Architecture Overview

```
[ESP32 Hardware]
      │  WiFi → MQTT (port 1883 or 8883)
      ▼
[EMQX Cloud Broker]  ←──────────────────────────────┐
      │  paho-mqtt subscription (background thread)  │
      ▼                                               │
[Flask API on Koyeb] ──── REST API ───► [React Frontend (built into Flask)]
      │
      ▼
[Neon PostgreSQL]
```

The Flask backend maintains a **persistent MQTT subscription** via `mqtt_client.loop_start()`.  
This background thread must **never sleep** — which is why Koyeb (always-on) is chosen over Render or Heroku free tier.

---

## 3. Pre-Deployment Checklist

- [ ] Created accounts on: **Koyeb**, **Neon**, **EMQX Cloud**
- [ ] EMQX cluster created, credentials noted
- [ ] Neon database created, connection string copied
- [ ] Project pushed to a **GitHub repository**
- [ ] All secrets added to **GitHub Actions Secrets** (see §7)

---

## 4. Change 1 — Backend: MQTT Cloud Support

### File: `src/backend/app.py`

**Current (local):**
```python
from src.config import CORS_ORIGINS, FLASK_DEBUG

# ...

# Connect to MQTT broker
try:
    mqtt_client.connect("localhost", 1883, 60)
    mqtt_client.loop_start()
except Exception as e:
    app.logger.warning(f"MQTT connection failed: {e}")
```

**Change to (production):**
```python
from src.config import CORS_ORIGINS, FLASK_DEBUG, MQTT_BROKER, MQTT_PORT, MQTT_CLOUD_USER, MQTT_CLOUD_PASS, MQTT_USE_TLS

# ...

# Connect to MQTT broker
try:
    if MQTT_CLOUD_USER and MQTT_CLOUD_PASS:
        mqtt_client.username_pw_set(MQTT_CLOUD_USER, MQTT_CLOUD_PASS)
    if MQTT_USE_TLS:
        mqtt_client.tls_set()
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
    mqtt_client.loop_start()
except Exception as e:
    app.logger.warning(f"MQTT connection failed: {e}")
```

**Why:** `src/config.py` already reads `MQTT_BROKER`, `MQTT_PORT`, `MQTT_CLOUD_USER`, `MQTT_CLOUD_PASS`, and `MQTT_USE_TLS` from environment variables. Only the import and connection block need updating.

---

## 5. Change 2 — ESP32 Firmware: TLS Client

> **Skip this if using EMQX plain port 1883.** Only required if connecting to HiveMQ or any TLS-only broker.

### File: `src/firmware/pwos_esp32/pwos_esp32.ino`

**Current (plain TCP):**
```cpp
#include <WiFi.h>
// ...
WiFiClient   wifiClient;
PubSubClient mqttClient(wifiClient);
```

**Change to (TLS):**
```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
// ...
WiFiClientSecure wifiClient;
PubSubClient     mqttClient(wifiClient);

// Add inside setup(), before connectMQTT():
wifiClient.setInsecure();  // For dev/test without cert pinning
// For production with cert: wifiClient.setCACert(root_ca);
```

### File: `src/firmware/pwos_esp32/config.h`

**Change to cloud MQTT block:**
```cpp
// Comment out LAN block:
// #define MQTT_BROKER   "192.168.1.X"
// #define MQTT_PORT     1883
// #define MQTT_USER     ""
// #define MQTT_PASS     ""

// Uncomment cloud block:
#define MQTT_BROKER   "your-cluster.emqxsl.com"  // from EMQX dashboard
#define MQTT_PORT     8883                         // TLS port, or 1883 for plain
#define MQTT_USER     "your-emqx-username"
#define MQTT_PASS     "your-emqx-password"
```

---

## 6. Change 3 — Frontend: API URL via Env Var

### File: `src/frontend/src/services/api.ts`

No code change needed — this is already done correctly:
```typescript
// Line 1 — already environment-variable driven:
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
```

When the React app is **built and served from Flask**, `VITE_API_URL` is empty and `/api` (relative URL) works automatically because Flask handles both the frontend and backend on the same domain.

### File: `src/frontend/vite.config.ts`

The dev proxy (`target: 'http://127.0.0.1:5000'`) is **only used during local `npm run dev`**. No changes required for production.

---

## 7. Change 4 — Environment Variables

### Backend `.env` (for Koyeb — add via dashboard → Environment Variables)

```env
# ── MQTT ──────────────────────────────────────
MQTT_MODE=cloud
MQTT_CLOUD_BROKER=your-cluster.emqxsl.com
MQTT_CLOUD_PORT=1883
MQTT_CLOUD_USER=your-emqx-username
MQTT_CLOUD_PASS=your-emqx-password

# ── Database ──────────────────────────────────
DATABASE_MODE=postgresql
DB_HOST=ep-xxxx.us-east-2.aws.neon.tech
DB_PORT=5432
DB_NAME=pwos
DB_USER=pwos_owner
DB_PASSWORD=your-neon-password

# ── Weather ───────────────────────────────────
WEATHER_API_MODE=openweathermap
OPENWEATHERMAP_API_KEY=your-key-here

# ── Flask ─────────────────────────────────────
FLASK_DEBUG=false
FLASK_HOST=0.0.0.0
FLASK_PORT=8000

# ── Hardware ──────────────────────────────────
DATA_SOURCE_MODE=hardware

# ── CORS ──────────────────────────────────────
CORS_ORIGINS=https://your-koyeb-app.koyeb.app
```

### GitHub Actions Secrets (add in repo → Settings → Secrets → Actions)

```
KOYEB_API_TOKEN          → from Koyeb dashboard → API → Create token
```

All other env vars are added directly in the **Koyeb service dashboard**, not in GitHub Secrets.

---

## 8. Change 5 — CI/CD with GitHub Actions

Create this file (it does not exist yet):

### File: `.github/workflows/deploy.yml` *(new file)*

```yaml
name: Deploy to Koyeb

on:
  push:
    branches:
      - main           # Auto-deploy on every push to main
  workflow_dispatch:   # Allow manual trigger from GitHub UI

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.13'

      - name: Install Python dependencies
        run: pip install -r requirements.txt

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Build React frontend
        working-directory: src/frontend
        run: |
          npm ci
          npm run build

      - name: Deploy to Koyeb
        uses: koyeb/action-git-deploy@v1
        with:
          api-token: ${{ secrets.KOYEB_API_TOKEN }}
          app-name: pwos
          service-name: pwos-api
```

**What this does on every `git push` to `main`:**
1. Checks out code
2. Installs Python dependencies
3. Builds the React frontend into `src/frontend/dist/`
4. Triggers a Koyeb redeploy (Koyeb re-pulls your repo and restarts)

---

## 9. Platform Account Setup

### Koyeb (Backend Host)

1. Sign up at [koyeb.com](https://koyeb.com)
2. **New App** → **GitHub** → select your repo
3. **Build command:** `pip install -r requirements.txt && cd src/frontend && npm ci && npm run build`
4. **Run command:** `gunicorn --chdir src/backend app:app --bind 0.0.0.0:8000 --workers 1 --threads 2`
5. **Port:** `8000`
6. Add all environment variables from §7 in the service settings

### Neon (PostgreSQL)

1. Sign up at [neon.tech](https://neon.tech)
2. Create project → name it `pwos`
3. Copy the **Connection String** (format: `postgresql://user:pass@host/dbname`)
4. Split into individual `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` variables

### EMQX Cloud (MQTT Broker)

1. Sign up at [emqx.com/en/cloud](https://www.emqx.com/en/cloud)
2. Create a **Serverless** cluster (free)
3. In **Authentication** → add a username + password
4. Note the **cluster endpoint** (e.g., `xxxx.emqxsl.com`)
5. Use **port 1883** for plain (no firmware change) or **port 8883** for TLS

---

## 10. Database Migration

The P-WOS database schema initializes automatically via `database.py` on first startup — tables are created if they don't exist.

However, you must ensure Neon's connection accepts SSL. Add `?sslmode=require` to the connection if needed, or update `database.py`:

```python
# In src/backend/database.py — find the psycopg2.connect() call:
# Add: sslmode='require'  if using Neon

conn = psycopg2.connect(
    host=DB_HOST, port=DB_PORT,
    database=DB_NAME, user=DB_USER, password=DB_PASSWORD,
    sslmode='require'  # ← Add this for Neon
)
```

---

## 11. Post-Deployment Verification

Once deployed, verify the system is working:

```bash
# 1. Check the health endpoint
curl https://your-koyeb-app.koyeb.app/api/health

# 2. Check sensor data (should return latest reading from ESP32)
curl https://your-koyeb-app.koyeb.app/api/sensor-data/latest

# 3. Check MQTT is connected (look at /api/health for mqtt_connected field)
curl https://your-koyeb-app.koyeb.app/api/health | python -m json.tool
```

**Expected `/api/health` response in production:**
```json
{
  "status": "healthy",
  "mqtt_connected": true,
  "database": "connected",
  "data_source": "hardware"
}
```

If `mqtt_connected` is `false`, check the EMQX credentials in Koyeb's environment variables.

---

## Summary of Files to Change for Production

| File | Change Type | Description |
|------|-------------|-------------|
| `src/backend/app.py` | **Modify** | Import cloud MQTT vars, use them in connect() |
| `src/firmware/pwos_esp32/config.h` | **Modify** | Switch MQTT_BROKER to EMQX cloud address |
| `src/firmware/pwos_esp32/pwos_esp32.ino` | **Modify** *(TLS only)* | Swap `WiFiClient` → `WiFiClientSecure` |
| `src/backend/database.py` | **Modify** | Add `sslmode='require'` to Neon connection |
| `.github/workflows/deploy.yml` | **New file** | GitHub Actions CI/CD pipeline |
| `requirements.txt` | **Already done** | `gunicorn` already added |
| `Procfile` | **Already done** | Already created |
| `runtime.txt` | **Already done** | Python 3.13 already set |

> `src/frontend/src/services/api.ts` and `vite.config.ts` require **no changes** — they already handle both local and production environments correctly.
