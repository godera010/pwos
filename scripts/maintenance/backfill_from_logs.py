"""
Backfill Script: Scrub emojis from system_logs and populate ml_decisions from log patterns.
One-time migration script for P-WOS database restructuring.
"""

import sys
import os
import re
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))
from backend.database import PWOSDatabase

# =====================================================
# EMOJI REGEX - matches common emoji ranges
# =====================================================
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F300-\U0001F9FF"  # Misc Symbols, Emoticons, etc.
    "\U00002600-\U000027BF"  # Misc symbols
    "\U00002702-\U000027B0"  # Dingbats
    "\U0000FE00-\U0000FE0F"  # Variation selectors
    "\U0000200D"             # Zero width joiner
    "\U000000A9\U000000AE"   # Copyright, Registered
    "\U00002122"             # Trademark
    "\U00002B50"             # Star
    "\U000023CF"             # Eject
    "\U000023E9-\U000023F3"  # Various
    "\U0000231A-\U0000231B"  # Watch, Hourglass
    "\U00002934-\U00002935"  # Arrows
    "\U000025AA-\U000025FE"  # Geometric shapes
    "\U00002B05-\U00002B07"  # Arrows
    "\U00002B1B-\U00002B1C"  # Squares
    "\U00003030\U0000303D"   # Wavy dash
    "\U00003297\U00003299"   # Circled Ideographs
    "\U0001F004\U0001F0CF"   # Mahjong, Playing card
    "\U0001FA00-\U0001FA6F"  # Extended-A
    "\U0001FA70-\U0001FAFF"  # Extended-B
    "]+",
    flags=re.UNICODE
)

def strip_emojis(text):
    """Remove emojis and clean up resulting whitespace"""
    cleaned = EMOJI_PATTERN.sub('', text)
    # Clean up double spaces and leading spaces
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

# =====================================================
# LOG PARSERS - Extract structured data from log messages
# =====================================================

# Pattern: "Moisture 29.38%. Triggering Pump for 60s."
PUMP_TRIGGER = re.compile(
    r'Moisture\s+([\d.]+)%\.\s*Triggering Pump for (\d+)s'
)

# Pattern: "STALL: Rain expected in 40 mins (Chance: 57%)"  
# Also: "STALL: Moisture 45.2%. Decay: 1.23%/h. Rain predicted in 120m (Conf: 0.85)"
STALL_RAIN = re.compile(
    r'STALL:.*?(?:Rain|rain).*?(\d+)\s*m'
)

# Pattern: "STALL: Moisture XX%. Decay: X.XX%/h."
STALL_MOISTURE = re.compile(
    r'STALL:.*?Moisture\s+([\d.]+)%.*?Decay:\s*([\d.]+)%/h'
)

# Pattern: "STOP: Saturated" or "STOP: <reason>"
STOP_PATTERN = re.compile(
    r'STOP:\s*(.*)'
)

# Pattern: "Monitoring: Moisture 45.43% (Optimal)"
MONITOR_PATTERN = re.compile(
    r'Monitoring:\s*Moisture\s+([\d.]+)%'
)

# Pattern: "M:45.2% | Action: MONITOR | Moisture 45.2%..."
DECISION_PATTERN = re.compile(
    r'M:([\d.]+)%\s*\|\s*Action:\s*(\w+)\s*\|\s*(.*)'
)

# Pattern: rain chance extraction
CHANCE_PATTERN = re.compile(r'Chance:\s*(\d+)%')
CONFIDENCE_PATTERN = re.compile(r'Conf(?:idence)?:\s*([\d.]+)')
FORECAST_PATTERN = re.compile(r'(?:in|eta)\s*(\d+)\s*m', re.IGNORECASE)


def parse_log_to_ml_decision(timestamp, message):
    """Try to parse a log message into an ml_decision record. Returns dict or None."""
    
    decision_data = {
        'timestamp': timestamp,
        'soil_moisture': None,
        'temperature': None,
        'humidity': None,
        'vpd': 0.0,
        'forecast_minutes': 0,
        'precipitation_chance': 0,
        'wind_speed': 0.0,
        'rain_intensity': 0.0,
        'decay_rate': None,
        'decision': None,
        'confidence': None,
        'reason': message,
        'recommended_duration': 0,
        'features': {}
    }
    
    # Try: Pump trigger (NOW decision)
    m = PUMP_TRIGGER.search(message)
    if m:
        decision_data['soil_moisture'] = float(m.group(1))
        decision_data['recommended_duration'] = int(m.group(2))
        decision_data['decision'] = 'NOW'
        return decision_data
    
    # Try: STALL with moisture/decay
    m = STALL_MOISTURE.search(message)
    if m:
        decision_data['soil_moisture'] = float(m.group(1))
        decision_data['decay_rate'] = float(m.group(2))
        decision_data['decision'] = 'STALL'
        # Extract forecast if present
        fm = FORECAST_PATTERN.search(message)
        if fm:
            decision_data['forecast_minutes'] = int(fm.group(1))
        # Extract chance if present
        cm = CHANCE_PATTERN.search(message)
        if cm:
            decision_data['precipitation_chance'] = int(cm.group(1))
        return decision_data
    
    # Try: STALL with rain mention
    m = STALL_RAIN.search(message)
    if m:
        decision_data['forecast_minutes'] = int(m.group(1))
        decision_data['decision'] = 'STALL'
        cm = CHANCE_PATTERN.search(message)
        if cm:
            decision_data['precipitation_chance'] = int(cm.group(1))
        return decision_data
    
    # Try: STOP
    m = STOP_PATTERN.search(message)
    if m:
        decision_data['decision'] = 'STOP'
        decision_data['reason'] = m.group(1).strip()
        return decision_data
    
    # Try: MONITOR
    m = MONITOR_PATTERN.search(message)
    if m:
        decision_data['soil_moisture'] = float(m.group(1))
        decision_data['decision'] = 'MONITOR'
        return decision_data
    
    return None


def main():
    db = PWOSDatabase()
    conn = db.get_connection()
    cursor = conn.cursor()
    
    print("=" * 60)
    print("P-WOS Database Backfill Script")
    print("=" * 60)
    
    # =========================================================
    # STEP 1: Scrub emojis from existing system_logs
    # =========================================================
    print("\n[STEP 1] Scrubbing emojis from system_logs...")
    
    cursor.execute("SELECT id, message FROM system_logs")
    all_logs = cursor.fetchall()
    
    emoji_count = 0
    for log_id, message in all_logs:
        if message and EMOJI_PATTERN.search(message):
            cleaned = strip_emojis(message)
            cursor.execute(
                "UPDATE system_logs SET message = %s WHERE id = %s",
                (cleaned, log_id)
            )
            emoji_count += 1
    
    conn.commit()
    print(f"  Scrubbed emojis from {emoji_count} / {len(all_logs)} log entries")
    
    # Verify no emojis remain
    cursor.execute("SELECT COUNT(*) FROM system_logs")
    total = cursor.fetchone()[0]
    
    # Recheck
    cursor.execute("SELECT id, message FROM system_logs")
    remaining = sum(1 for _, msg in cursor.fetchall() if msg and EMOJI_PATTERN.search(msg))
    print(f"  Remaining emoji messages: {remaining}")
    
    # =========================================================
    # STEP 2: Parse logs into ml_decisions
    # =========================================================
    print("\n[STEP 2] Parsing logs into ml_decisions...")
    
    # Get existing ml_decision timestamps to avoid duplicates
    cursor.execute("SELECT timestamp FROM ml_decisions")
    existing_timestamps = set(row[0] for row in cursor.fetchall())
    
    # Fetch all logs (already scrubbed)
    cursor.execute("SELECT id, timestamp, level, source, message FROM system_logs ORDER BY timestamp ASC")
    all_logs = cursor.fetchall()
    
    parsed_count = 0
    skipped_count = 0
    
    for log_id, timestamp, level, source, message in all_logs:
        if not message:
            continue
            
        decision = parse_log_to_ml_decision(timestamp, message)
        if decision and decision['decision']:
            # Skip if we already have an entry at this timestamp
            if timestamp in existing_timestamps:
                skipped_count += 1
                continue
            
            db.insert_ml_decision(decision)
            existing_timestamps.add(timestamp)
            parsed_count += 1
    
    print(f"  Parsed {parsed_count} new ml_decisions from logs")
    print(f"  Skipped {skipped_count} (already existed)")
    
    # =========================================================
    # STEP 3: Summary
    # =========================================================
    print("\n[STEP 3] Final verification...")
    
    cursor.execute("SELECT COUNT(*) FROM ml_decisions")
    total_decisions = cursor.fetchone()[0]
    
    cursor.execute("SELECT decision, COUNT(*) FROM ml_decisions GROUP BY decision ORDER BY COUNT(*) DESC")
    decision_breakdown = cursor.fetchall()
    
    cursor.execute("SELECT COUNT(*) FROM watering_events WHERE moisture_after IS NOT NULL")
    with_moisture_after = cursor.fetchone()[0]
    
    print(f"\n  Total ml_decisions: {total_decisions}")
    print(f"  Decision breakdown:")
    for decision, count in decision_breakdown:
        print(f"    {decision:10s}: {count}")
    print(f"  Watering events with moisture_after: {with_moisture_after}")
    
    conn.close()
    print("\n[DONE] Backfill complete!")


if __name__ == "__main__":
    main()
