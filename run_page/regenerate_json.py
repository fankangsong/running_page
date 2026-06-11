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
print()
print(f'{"ID":<14} {"Name":<30} {"Type":<10} {"Date":<12} {"Dist(km)":<10} {"Laps":<6} {"Streams"}')
print('-' * 110)
for a in data:
    dist_km = round(a.get('distance', 0) / 1000, 2)
    laps_count = len(a.get('laps', []))
    streams_types = list(a.get('streams', {}).keys())
    date_str = a.get('start_date_local', '')[:10] if a.get('start_date_local') else ''
    name = (a.get('name') or '')[:28]
    print(f'{a["run_id"]:<14} {name:<30} {a.get("type",""):<10} {date_str:<12} {dist_km:<10} {laps_count:<6} {streams_types}')
