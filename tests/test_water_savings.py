#!/usr/bin/env python
"""
P-WOS: Water Savings Validation Test

This script validates the project hypothesis:
"The integration of a time-series ML prediction model into an IoT micro-irrigation system 
will lead to a minimum 15% reduction in water consumption compared to a traditional 
reactive threshold-based system."

Run the backend first, then execute this script to run a simulated 2-week cycle.
"""

import requests
import json
import sys

BASE_URL = "http://127.0.0.1:5000"

# Target from project hypothesis
TARGET_SAVINGS_PERCENT = 15.0

# Simulation parameters
# 2 weeks = 14 days = 336 hours = 1344 steps (each step = 15 min)
STEPS_PER_DAY = 96  # 24 hours / 0.25 hours per step
SIMULATION_DAYS = 14
TOTAL_STEPS = STEPS_PER_DAY * SIMULATION_DAYS

def reset_simulation():
    """Reset simulation to fresh state."""
    try:
        response = requests.post(
            f"{BASE_URL}/api/simulation/reset",
            json={},  # Send empty JSON body
            headers={'Content-Type': 'application/json'}
        )
        if response.status_code == 200:
            print("[OK] Simulation reset")
            return True
        else:
            print(f"[ERROR] Failed to reset: {response.status_code}")
            return False
    except Exception as e:
        print(f"[ERROR] Failed to reset simulation: {e}")
        return False

def run_step():
    """Execute one simulation step."""
    try:
        response = requests.post(f"{BASE_URL}/api/simulation/step")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"[ERROR] Step failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"[ERROR] Failed to run step: {e}")
        return None

def get_state():
    """Get current simulation state."""
    try:
        response = requests.get(f"{BASE_URL}/api/simulation/state")
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        return None

def main():
    print("=" * 60)
    print("P-WOS: Water Savings Validation Test")
    print("=" * 60)
    print(f"Target: {TARGET_SAVINGS_PERCENT}% water savings")
    print(f"Duration: {SIMULATION_DAYS} days ({TOTAL_STEPS} steps)")
    print("=" * 60)
    
    # Reset simulation
    if not reset_simulation():
        print("[FAIL] Could not reset simulation. Is the backend running?")
        sys.exit(1)
    
    # Run simulation
    print(f"\n[RUN] Running {TOTAL_STEPS} simulation steps...")
    
    for step in range(1, TOTAL_STEPS + 1):
        result = run_step()
        
        if result is None:
            print("[FAIL] Simulation failed")
            sys.exit(1)
        
        # Progress update every 24 steps (6 hours sim time)
        if step % STEPS_PER_DAY == 0:
            day = step // STEPS_PER_DAY
            savings = result.get('savings_percent', 0)
            reactive = result['fields']['reactive']['water_used']
            predictive = result['fields']['predictive']['water_used']
            print(f"   Day {day}/{SIMULATION_DAYS}: Reactive={reactive:.1f}L, Predictive={predictive:.1f}L, Savings={savings:.1f}%")
    
    # Final results
    state = get_state()
    if state is None:
        print("[FAIL] Could not get final state")
        sys.exit(1)
    
    reactive_water = state['fields']['reactive']['water_used']
    predictive_water = state['fields']['predictive']['water_used']
    reactive_events = state['fields']['reactive']['pump_events']
    predictive_events = state['fields']['predictive']['pump_events']
    water_saved = state['water_saved']
    savings_percent = state['savings_percent']
    
    print("\n" + "=" * 60)
    print("FINAL RESULTS")
    print("=" * 60)
    print(f"  Reactive System:")
    print(f"    - Water Used:   {reactive_water:.1f} L")
    print(f"    - Pump Events:  {reactive_events}")
    print(f"  Predictive System (ML):")
    print(f"    - Water Used:   {predictive_water:.1f} L")
    print(f"    - Pump Events:  {predictive_events}")
    print("=" * 60)
    print(f"  WATER SAVED:      {water_saved:.1f} L")
    print(f"  SAVINGS:          {savings_percent:.1f}%")
    print("=" * 60)
    
    # Validate hypothesis
    if savings_percent >= TARGET_SAVINGS_PERCENT:
        print(f"\n[PASS - HYPOTHESIS VALIDATED]")
        print(f"   Target: >={TARGET_SAVINGS_PERCENT}%")
        print(f"   Actual: {savings_percent:.1f}%")
        print(f"   The ML-based system achieved the project goal!")
    else:
        print(f"\n[BELOW TARGET]")
        print(f"   Target: >={TARGET_SAVINGS_PERCENT}%")
        print(f"   Actual: {savings_percent:.1f}%")
        print(f"   Consider tuning the ML model or simulation parameters.")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
