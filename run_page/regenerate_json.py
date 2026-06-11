#!/usr/bin/env python3
"""Regenerate activities.json with laps and streams data"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from generator import Generator
from config import SQL_FILE, JSON_FILE
import json

g = Generator(SQL_FILE)
data = g.load()

with open(JSON_FILE, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'Written {len(data)} activities to {JSON_FILE}')

# Check specific activity
activity = next((a for a in data if a['run_id'] == 18661504630), None)
if activity:
    print(f'Activity 18661504630:')
    print(f'  Laps: {len(activity.get("laps", []))}')
    print(f'  Streams: {list(activity.get("streams", {}).keys())}')
else:
    print('Activity 18661504630 not found')
