#!/usr/bin/env python3
"""
Export strength/workout activities (WeightTraining, Workout) from data.db
to src/static/workout.json for the homepage WORKOUT HEATMAP module.

Usage:
    python run_page/workout_export.py
"""

import json
import os
import sys

# Add run_page to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import SQL_FILE, WORKOUT_JSON_FILE
from generator.db import Activity, init_db

WORKOUT_TYPES = ["WeightTraining", "Workout"]


def export_workouts() -> int:
    """Export all WeightTraining/Workout activities to workout.json.

    Returns:
        Number of exported activities.
    """
    session = init_db(SQL_FILE)
    try:
        activities = (
            session.query(Activity)
            .filter(Activity.type.in_(WORKOUT_TYPES))
            .order_by(Activity.start_date_local)
            .all()
        )
        data = [a.to_dict() for a in activities]

        with open(WORKOUT_JSON_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"Exported {len(data)} workouts to {WORKOUT_JSON_FILE}")

        # Per-type breakdown for quick verification
        by_type: dict = {}
        for a in data:
            by_type[a.get("type", "unknown")] = by_type.get(a.get("type", "unknown"), 0) + 1
        for t, c in sorted(by_type.items()):
            print(f"  {t}: {c}")

        return len(data)
    finally:
        session.close()


if __name__ == "__main__":
    export_workouts()
