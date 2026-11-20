"""Export device-oriented dashboard JSON for the AI Passport running dashboard.

Reads ``src/static/activities.json`` and writes the static data contract from
ai-passport ``docs/development/running-dashboard-design.md``:

    dashboard/v1/summary.json
    dashboard/v1/monthly.json
    dashboard/v1/heatmap.json
    dashboard/v1/activities/recent.json
    dashboard/v1/activities/{run_id}.json

Every aggregation replicates the running_page frontend conventions in
``src/utils/utils.ts``: Run-only statistics, ``moving_time`` based durations,
``start_date_local`` string slicing (year=[:4], month=[5:7], day=[:10]), the
``d > 200`` km/meter tolerance for legacy monthly values, and heatmap
thresholds [5, 10, 15, 20, 25] km.  Device files are pre-converted
(``duration_sec``, ``pace_sec_per_km``, integer e6 coordinates, downsampled
curves) so firmware never parses ``"H:MM:SS"`` strings or decodes polylines.

Usage:
    python run_page/export_dashboard.py \
        --input src/static/activities.json --out dashboard/v1 \
        --years 3 --recent 20 --detail-for recent
"""

import argparse
import json
import math
import os
import sys
from datetime import datetime, timezone

try:
    import polyline as _polyline
except ImportError:  # pragma: no cover - dependency declared in requirements.txt
    _polyline = None

SCHEMA_VERSION = 1
HEATMAP_THRESHOLDS_KM = [5, 10, 15, 20, 25]
RUN_TYPE = "Run"

# Per-file budgets in bytes (design doc section 5.2/5.8, pre-compression).
BUDGETS = {
    "summary.json": 2 * 1024,
    "monthly.json": 4 * 1024,
    "heatmap.json": 12 * 1024,
    "recent.json": 6 * 1024,
    "detail": 12 * 1024,
}

# Degradation ladders applied when a detail file exceeds its budget.
ROUTE_POINT_LADDER = [150, 100, 60]
CURVE_SAMPLE_LADDER = [240, 160, 100, 60]
PACE_CAP_SEC_PER_KM = 1800


class ExportError(Exception):
    """Raised when the export cannot satisfy the published data contract."""


# ---------------------------------------------------------------------------
# Unit conversions (mirrors of src/utils/utils.ts helpers)
# ---------------------------------------------------------------------------


def moving_time_to_seconds(text):
    """Parse "H:MM:SS" or "D days, H:MM:SS" into integer seconds.

    Mirrors ``convertMovingTime2Sec``; returns 0 for empty/invalid input.
    """
    if not text or not isinstance(text, str):
        return 0
    raw = text.strip()
    days = 0
    if "day" in raw:
        day_part, _, raw = raw.partition(",")
        digits = "".join(ch for ch in day_part if ch.isdigit())
        days = int(digits) if digits else 0
        raw = raw.strip()
    parts = raw.split(":")
    try:
        numbers = [int(p) for p in parts]
    except ValueError:
        return 0
    if len(numbers) == 3:
        h, m, s = numbers
    elif len(numbers) == 2:
        h, m, s = 0, numbers[0], numbers[1]
    elif len(numbers) == 1:
        h, m, s = 0, 0, numbers[0]
    else:
        return 0
    return days * 86400 + h * 3600 + m * 60 + s


def pace_from_speed(speed_mps):
    """m/s -> seconds per km (integer), capped for near-zero speeds."""
    if not speed_mps or speed_mps <= 0:
        return None
    return min(int(round(1000.0 / speed_mps)), PACE_CAP_SEC_PER_KM)


def monthly_km(distance):
    """MonthlyBarChart tolerance: values > 200 are meters, else legacy km."""
    value = distance or 0
    return value / 1000.0 if value > 200 else value


def is_run(activity):
    return activity.get("type") == RUN_TYPE


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------


def decode_polyline(encoded):
    """Encoded polyline -> list of [lat, lon] float pairs."""
    if not encoded or _polyline is None:
        return []
    try:
        return _polyline.decode(encoded)
    except Exception:
        return []


def downsample(values, target):
    """Even-index downsample keeping first and last element."""
    if target <= 0 or not values:
        return []
    if len(values) <= target:
        return list(values)
    step = (len(values) - 1) / (target - 1)
    return [values[round(i * step)] for i in range(target)]


def route_payload(encoded, max_points):
    """Encoded polyline -> contract ``route`` object or None.

    ``points`` are [lon_e6, lat_e6] integer pairs (WGS84 scaled by 1e6),
    downsampled to at most ``max_points``; ``bbox`` is
    [min_lon_e6, min_lat_e6, max_lon_e6, max_lat_e6].
    """
    decoded = decode_polyline(encoded)
    if len(decoded) < 2:
        return None
    kept = downsample(decoded, max_points)
    lats = [p[0] for p in kept]
    lons = [p[1] for p in kept]
    points = [[int(round(lon * 1e6)), int(round(lat * 1e6))] for lat, lon in kept]
    return {
        "bbox": [
            int(round(min(lons) * 1e6)),
            int(round(min(lats) * 1e6)),
            int(round(max(lons) * 1e6)),
            int(round(max(lats) * 1e6)),
        ],
        "points": points,
    }


def curve_payload(values, times, max_samples, transform=None):
    """Uniform-series contract object ``{t0_sec, step_sec, values}`` or None.

    ``times`` is the raw per-sample second offset list from ``streams.time``;
    when absent a 1 s sampling interval is assumed.  ``transform`` maps each
    raw sample (used for velocity -> pace conversion).
    """
    if not values:
        return None
    if transform is not None:
        values = [transform(v) for v in values]
    if not any(v is not None for v in values):
        return None
    if times and len(times) == len(values) and times[-1] > 0:
        step_sec = max(1, int(round(times[-1] / len(values))))
    else:
        step_sec = 1
    kept = downsample([v if v is not None else 0 for v in values], max_samples)
    return {"t0_sec": 0, "step_sec": step_sec, "values": kept}


# ---------------------------------------------------------------------------
# Aggregations (Run-only, per design doc section 2.3)
# ---------------------------------------------------------------------------


def runs_sorted_desc(activities):
    runs = [a for a in activities if is_run(a)]
    runs.sort(key=lambda a: a.get("start_date_local") or "", reverse=True)
    return runs


def year_of(run):
    return (run.get("start_date_local") or "")[:4]


def month_index(run):
    raw = (run.get("start_date_local") or "")[5:7]
    try:
        return int(raw) - 1
    except ValueError:
        return 0


def date_key(run):
    return (run.get("start_date_local") or "")[:10]


def display_name(activity):
    """Strip symbols the device fonts cannot render (emoji, variation selectors).

    CJK text is preserved; the frontend keeps the original name.
    """
    name = activity.get("name") or "Run"
    cleaned = []
    for char in name:
        code = ord(char)
        if code == 0xFE0F or code == 0x200D:  # variation selector / ZWJ
            continue
        if 0x1F000 <= code <= 0x1FAFF or 0x2600 <= code <= 0x27BF:
            continue  # emoji blocks
        cleaned.append(char)
    return ("".join(cleaned)).strip() or "Run"


def summarize(runs, year):
    """summary.json ``stats``/``month``/``streak``/``pb`` for one year.

    Pace convention: self-consistent ``total distance / total moving time``
    instead of the frontend's per-run ``average_speed`` weighting — real
    datasets contain activities whose ``average_speed`` disagrees with
    ``moving_time``/``distance`` by orders of magnitude, which poisons any
    speed-weighted mean.  PB selection uses the same moving-time-derived pace.
    """
    year_runs = [r for r in runs if year_of(r) == year]
    year_runs.sort(key=lambda r: r.get("start_date_local") or "", reverse=True)
    total_meters = sum(r.get("distance") or 0 for r in year_runs)
    total_seconds = sum(moving_time_to_seconds(r.get("moving_time")) for r in year_runs)
    heart_rates = [r["average_heartrate"] for r in year_runs if r.get("average_heartrate")]

    dates = sorted({date_key(r) for r in year_runs})
    span_days = 0
    if len(dates) >= 2:
        fmt = "%Y-%m-%d"
        span_days = (
            datetime.strptime(dates[-1], fmt) - datetime.strptime(dates[0], fmt)
        ).days
    weeks = max(span_days / 7.0, 1.0)

    stats = {
        "distance_km": round(total_meters / 1000.0, 1),
        "duration_sec": total_seconds,
        "count": len(year_runs),
        "avg_pace_sec_per_km": int(round(total_seconds * 1000.0 / total_meters))
        if total_meters > 0
        else None,
        "avg_heartrate": int(round(sum(heart_rates) / len(heart_rates)))
        if heart_rates
        else None,
        "longest_km": round(max((r.get("distance") or 0) for r in year_runs) / 1000.0, 1)
        if year_runs
        else 0.0,
        "weekly_km": round(total_meters / 1000.0 / weeks, 1),
    }

    latest = year_runs[0] if year_runs else None
    month_number = int((latest.get("start_date_local") or "")[5:7]) if latest else 1
    month_runs = [r for r in year_runs if month_index(r) == month_number - 1]

    streaks = [r.get("streak") or 0 for r in runs]
    summary = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": _utc_now(),
        "year": int(year),
        "stats": _drop_nulls(stats),
        "month": {
            "distance_km": round(sum(r.get("distance") or 0 for r in month_runs) / 1000.0, 1),
            "duration_sec": sum(moving_time_to_seconds(r.get("moving_time")) for r in month_runs),
            "count": len(month_runs),
        },
        "streak": {"current": int(latest.get("streak") or 0) if latest else 0,
                   "longest": max(streaks) if streaks else 0},
        "pb": personal_bests(year_runs),
    }
    return summary


def personal_bests(year_runs):
    """Fastest moving-time-derived pace per target distance.

    Candidates need a plausible speed/duration pair; ranking by
    ``moving_time / distance`` is robust against bogus ``average_speed``.
    """
    targets = [5000, 10000, 21097.5]
    entries = []
    for meters in targets:
        candidates = []
        for r in year_runs:
            distance = r.get("distance") or 0
            seconds = moving_time_to_seconds(r.get("moving_time"))
            if distance >= meters and seconds > 0:
                candidates.append((seconds * 1000.0 / distance, r))
        if not candidates:
            continue
        best_pace, best = min(candidates, key=lambda pair: pair[0])
        entries.append(
            _drop_nulls(
                {
                    "distance_m": meters,
                    "pace_sec_per_km": int(round(best_pace)),
                    "date": date_key(best),
                }
            )
        )
    return entries


def monthly_payload(runs, years):
    """monthly.json: last ``years`` calendar years, 12 zero-filled months each."""
    payload = {"schema_version": SCHEMA_VERSION, "generated_at": _utc_now(), "years": []}
    for year in years:
        months = []
        for m in range(12):
            bucket_runs = [
                r for r in runs if year_of(r) == str(year) and month_index(r) == m
            ]
            months.append(
                {
                    "month": m + 1,
                    "distance_km": round(sum(monthly_km(r.get("distance")) for r in bucket_runs), 1),
                    "duration_sec": sum(
                        moving_time_to_seconds(r.get("moving_time")) for r in bucket_runs
                    ),
                    "count": len(bucket_runs),
                }
            )
        payload["years"].append({"year": year, "months": months})
    return payload


def heatmap_year(runs, year):
    """One ``heatmap.json`` year entry: sparse MMDD -> daily Run km."""
    day_totals = {}
    for r in runs:
        if year_of(r) != str(year):
            continue
        key = date_key(r)[5:10].replace("-", "")
        day_totals[key] = day_totals.get(key, 0.0) + monthly_km(r.get("distance"))
    days = [{"d": key, "v": round(value, 2)} for key, value in sorted(day_totals.items())]
    values = [entry["v"] for entry in days]
    return {
        "year": year,
        "active_days": len(days),
        "total_km": round(sum(values), 1),
        "max_day_km": round(max(values), 1) if values else 0.0,
        "days": days,
    }


def heatmap_payload(runs, years):
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": _utc_now(),
        "thresholds_km": HEATMAP_THRESHOLDS_KM,
        "years": [heatmap_year(runs, year) for year in years],
    }


def recent_entry(run):
    return _drop_nulls(
        {
            "run_id": run.get("run_id"),
            "name": display_name(run),
            "type": run.get("type"),
            "date": date_key(run),
            "time": (run.get("start_date_local") or "")[11:16],
            "distance_km": round((run.get("distance") or 0) / 1000.0, 2),
            "duration_sec": moving_time_to_seconds(run.get("moving_time")),
            "pace_sec_per_km": pace_from_speed(run.get("average_speed")),
            "avg_heartrate": int(round(run["average_heartrate"]))
            if run.get("average_heartrate")
            else None,
            "calories": int(round(run["calories"])) if run.get("calories") else None,
            "elevation_gain_m": int(round(run["elevation_gain"]))
            if run.get("elevation_gain")
            else None,
            "streak": run.get("streak"),
        }
    )


def recent_payload(runs, limit):
    activities = [recent_entry(r) for r in runs[:limit]]
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": _utc_now(),
        "activities": activities,
    }


def detail_payload(run, route_points, curve_samples):
    streams = run.get("streams") or {}
    hr = curve_payload(streams.get("heartrate"), streams.get("time"), curve_samples)
    pace = curve_payload(
        streams.get("velocity_smooth"),
        streams.get("time"),
        curve_samples,
        # Stalled samples (v near 0) clamp to the cap instead of "infinite" pace.
        transform=lambda v: min(int(round(1000.0 / v)), PACE_CAP_SEC_PER_KM)
        if v and v > 0
        else PACE_CAP_SEC_PER_KM,
    )
    curves = _drop_nulls({"hr": hr, "pace": pace})
    laps = []
    for lap in run.get("laps") or []:
        lap_distance = lap.get("distance") or 0
        lap_seconds = int(lap.get("moving_time") or lap.get("elapsed_time") or 0)
        laps.append(
            _drop_nulls(
                {
                    "i": lap.get("lap_index"),
                    "distance_km": round(lap_distance / 1000.0, 2),
                    "duration_sec": lap_seconds,
                    "pace_sec_per_km": int(round(1000.0 * lap_seconds / lap_distance))
                    if lap_distance > 0
                    else None,
                    "avg_hr": int(round(lap["average_heartrate"]))
                    if lap.get("average_heartrate")
                    else None,
                }
            )
        )
    payload = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": _utc_now(),
        "run_id": run.get("run_id"),
        "name": display_name(run),
        "type": run.get("type"),
        "date": date_key(run),
        "distance_km": round((run.get("distance") or 0) / 1000.0, 2),
        "duration_sec": moving_time_to_seconds(run.get("moving_time")),
        "pace_sec_per_km": pace_from_speed(run.get("average_speed")),
        "avg_heartrate": int(round(run["average_heartrate"]))
        if run.get("average_heartrate")
        else None,
        "max_heartrate": int(round(run["max_heartrate"]))
        if run.get("max_heartrate")
        else None,
        "calories": int(round(run["calories"])) if run.get("calories") else None,
        "elevation_gain_m": int(round(run["elevation_gain"]))
        if run.get("elevation_gain")
        else None,
    }
    route = route_payload(run.get("summary_polyline"), route_points)
    if route:
        payload["route"] = route
    if curves:
        payload["curves"] = curves
    if laps:
        payload["laps"] = laps
    return payload


# ---------------------------------------------------------------------------
# Serialization with budgets and invariants
# ---------------------------------------------------------------------------


def encode(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def _utc_now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _drop_nulls(mapping):
    return {key: value for key, value in mapping.items() if value is not None}


def write_json(path, payload, budget):
    blob = encode(payload)
    if len(blob) > budget:
        raise ExportError(
            f"{os.path.basename(path)} is {len(blob)} bytes, budget {budget} bytes"
        )
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as handle:
        handle.write(blob)
    return len(blob)


def write_detail(run, out_dir, budget):
    """Serialize one detail file, degrading samples before failing."""
    for route_points, curve_samples in zip(ROUTE_POINT_LADDER, CURVE_SAMPLE_LADDER):
        payload = detail_payload(run, route_points, curve_samples)
        blob = encode(payload)
        if len(blob) <= budget:
            path = os.path.join(out_dir, f"{run['run_id']}.json")
            os.makedirs(out_dir, exist_ok=True)
            with open(path, "wb") as handle:
                handle.write(blob)
            return len(blob), route_points, curve_samples
    raise ExportError(
        f"detail {run.get('run_id')} exceeds {budget} bytes even after degradation"
    )


def verify_invariants(summary, heatmap, recent_payload_obj, detail_ids, out_dir):
    """Cross-file invariants from design doc section 6 (validation)."""
    errors = []
    summary_year = summary["year"]
    heat = next((y for y in heatmap["years"] if y["year"] == summary_year), None)
    if heat is None:
        errors.append(f"heatmap missing summary year {summary_year}")
    elif abs(summary["stats"]["distance_km"] - heat["total_km"]) > 0.11:
        errors.append(
            f"summary {summary_year} distance_km {summary['stats']['distance_km']} "
            f"!= heatmap total_km {heat['total_km']}"
        )
    activities = recent_payload_obj["activities"]
    stamps = [(a["date"], a.get("time") or "") for a in activities]
    if stamps != sorted(stamps, reverse=True):
        errors.append("recent.json activities are not newest-first")
    for activity in activities:
        expected = activity["run_id"] in detail_ids
        if activity["has_detail"] != expected:
            errors.append(f"has_detail mismatch for {activity['run_id']}")
    for detail_id in detail_ids:
        path = os.path.join(out_dir, "activities", f"{detail_id}.json")
        if not os.path.isfile(path):
            errors.append(f"missing detail file {path}")
    return errors


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def export(input_path, out_dir, years=3, recent_limit=20):
    with open(input_path, encoding="utf-8") as handle:
        activities = json.load(handle)
    runs = runs_sorted_desc(activities)
    if not runs:
        raise ExportError("no Run activities found in input")

    latest_year = int(year_of(runs[0]))
    year_list = [latest_year - offset for offset in range(years)]

    summary = summarize(runs, str(latest_year))
    monthly = monthly_payload(runs, year_list)
    heatmap = heatmap_payload(runs, year_list)
    detail_runs = runs[: recent_limit]
    detail_ids = [run["run_id"] for run in detail_runs]

    recent = recent_payload(runs, recent_limit)
    for activity in recent["activities"]:
        activity["has_detail"] = activity["run_id"] in detail_ids

    written = {}
    written["summary.json"] = write_json(
        os.path.join(out_dir, "summary.json"), summary, BUDGETS["summary.json"]
    )
    written["monthly.json"] = write_json(
        os.path.join(out_dir, "monthly.json"), monthly, BUDGETS["monthly.json"]
    )
    written["heatmap.json"] = write_json(
        os.path.join(out_dir, "heatmap.json"), heatmap, BUDGETS["heatmap.json"]
    )
    activities_dir = os.path.join(out_dir, "activities")
    written["recent.json"] = write_json(
        os.path.join(activities_dir, "recent.json"), recent, BUDGETS["recent.json"]
    )
    for run in detail_runs:
        size, route_points, curve_samples = write_detail(
            run, activities_dir, BUDGETS["detail"]
        )
        written[f"{run['run_id']}.json"] = size

    errors = verify_invariants(summary, heatmap, recent, detail_ids, out_dir)
    if errors:
        raise ExportError("; ".join(errors))
    return summary, written


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--input", default=None, help="path to activities.json")
    parser.add_argument("--out", default="dashboard/v1", help="output directory")
    parser.add_argument("--years", type=int, default=3, help="years to export")
    parser.add_argument("--recent", type=int, default=20, help="recent entries")
    args = parser.parse_args(argv)

    input_path = args.input
    if not input_path:
        here = os.path.dirname(os.path.realpath(__file__))
        input_path = os.path.join(here, "..", "src", "static", "activities.json")

    summary, written = export(input_path, args.out, args.years, args.recent)
    print(f"Exported dashboard data for {summary['year']} to {args.out}")
    for name, size in sorted(written.items()):
        budget = BUDGETS["detail"] if name.endswith(".json") and name[0].isdigit() else BUDGETS.get(name, BUDGETS["detail"])
        marker = "OK" if size <= budget else "OVER"
        print(f"  {marker}  {name:24s} {size:6d} bytes")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except ExportError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
