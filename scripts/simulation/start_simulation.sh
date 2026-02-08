#!/bin/bash

# P-WOS Simulation Startup Script
# This script starts all components in separate terminal windows

echo "========================================="
echo "P-WOS Simulation Environment"
echo "========================================="
echo ""

# Get project root (assumes script is in PROJECT_ROOT/scripts)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "📂 Project Root: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

# Check if Mosquitto is installed
if ! command -v mosquitto &> /dev/null; then
    echo "❌ Mosquitto is not installed!"
    echo ""
    echo "Please install Mosquitto first:"
    echo "  macOS: brew install mosquitto"
    echo "  Linux: sudo apt-get install mosquitto"
    echo "  Windows: Download from https://mosquitto.org/download/"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed!"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

# Check if dependencies are installed
echo "📦 Checking dependencies..."
python3 -c "import paho.mqtt.client, flask" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Dependencies not installed. Installing now..."
    pip3 install -r requirements.txt
fi

echo ""
echo "🚀 Starting P-WOS Simulation..."
echo ""
echo "This will open 4 terminal windows:"
echo "  1. MQTT Broker (Mosquitto)"
echo "  2. Database Subscriber"
echo "  3. Simulated ESP32"
echo "  4. API Server"
echo ""
echo "Press Ctrl+C in each window to stop"
echo ""

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e 'tell app "Terminal" to do script "echo \"🔌 Starting MQTT Broker...\" && mosquitto -v"'
    sleep 2
    osascript -e 'tell app "Terminal" to do script "cd \"'"$PROJECT_ROOT"'/src/backend\" && echo \"💾 Starting Database Subscriber...\" && python3 mqtt_subscriber.py"'
    sleep 2
    osascript -e 'tell app "Terminal" to do script "cd \"'"$PROJECT_ROOT"'/src/simulation\" && echo \"📡 Starting Simulated ESP32...\" && python3 esp32_simulator.py"'
    sleep 2
    osascript -e 'tell app "Terminal" to do script "cd \"'"$PROJECT_ROOT"'/src/simulation\" && echo \"⛈️  Starting Weather Simulator...\" && python3 weather_simulator.py"'
    sleep 2
    osascript -e 'tell app "Terminal" to do script "cd \"'"$PROJECT_ROOT"'/src/backend\" && echo \"🌐 Starting API Server...\" && python3 app.py"'
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "echo '🔌 Starting MQTT Broker...' && mosquitto -v; exec bash"
        sleep 2
        gnome-terminal -- bash -c "cd '$PROJECT_ROOT/src/backend' && echo '💾 Starting Database Subscriber...' && python3 mqtt_subscriber.py; exec bash"
        sleep 2
        gnome-terminal -- bash -c "cd '$PROJECT_ROOT/src/simulation' && echo '📡 Starting Simulated ESP32...' && python3 esp32_simulator.py; exec bash"
        sleep 2
        gnome-terminal -- bash -c "cd '$PROJECT_ROOT/src/backend' && echo '🌐 Starting API Server...' && python3 app.py; exec bash"
    else
        echo "❌ gnome-terminal not found. Please start components manually:"
        echo "Terminal 1: mosquitto -v"
        echo "Terminal 2: cd src/backend && python3 mqtt_subscriber.py"
        echo "Terminal 3: cd src/simulation && python3 esp32_simulator.py"
        echo "Terminal 4: cd src/backend && python3 app.py"
        exit 1
    fi
else
    echo "❌ Unsupported OS. Please start components manually:"
    echo "Terminal 1: mosquitto -v"
    echo "Terminal 2: cd src/backend && python3 mqtt_subscriber.py"
    echo "Terminal 3: cd src/simulation && python3 esp32_simulator.py"
    echo "Terminal 4: cd src/backend && python3 app.py"
    exit 1
fi

sleep 3

echo ""
echo "✅ All components started!"
echo ""
echo "📊 Open dashboard to view live data:"
echo "   $PROJECT_ROOT/src/frontend/dashboard.html"
echo ""
echo "To open dashboard:"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  open src/frontend/dashboard.html"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "  xdg-open src/frontend/dashboard.html"
fi
echo ""
echo "Or navigate to: http://localhost:5000"
echo ""
