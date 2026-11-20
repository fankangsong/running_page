"""Unit tests for run_page/export_dashboard.py (stdlib unittest only).

Run with:
    python -m unittest run_page.test_export_dashboard -v
"""

import json
import os
import tempfile
import unittest

from export_dashboard import (
    ExportError,
    curve_payload,
    display_name,
    downsample,
    export,
    heatmap_year,
    monthly_km,
    moving_time_to_seconds,
    pace_from_speed,
    personal_bests,
    route_payload,
    summarize,
    write_detail,
)


def make_run(run_id, date_local, distance, moving, speed, **extra):
    run = {
        "run_id": run_id,
        "name": extra.pop("name", "Evening Run"),
        "type": extra.pop("type", "Run"),
        "distance": distance,
        "moving_time": moving,
        "start_date_local": date_local,
        "average_speed": speed,
        "streak": extra.pop("streak", 1),
    }
    run.update(extra)
    return run


class MovingTimeTest(unittest.TestCase):
    def test_plain_hms(self):
        self.assertEqual(moving_time_to_seconds("0:27:31"), 1651)

    def test_days_prefix(self):
        self.assertEqual(moving_time_to_seconds("2 days, 12:34:56"), 2 * 86400 + 45296)

    def test_minutes_only(self):
        self.assertEqual(moving_time_to_seconds("12:34"), 754)

    def test_invalid_inputs(self):
        for value in (None, "", "abc", "1:2:3:4"):
            self.assertEqual(moving_time_to_seconds(value), 0)


class PaceTest(unittest.TestCase):
    def test_normal_speed(self):
        self.assertEqual(pace_from_speed(2.7), 370)  # 1000/2.7 = 370.37

    def test_zero_and_none(self):
        self.assertIsNone(pace_from_speed(0))
        self.assertIsNone(pace_from_speed(None))
        self.assertIsNone(pace_from_speed(-1.0))

    def test_near_zero_speed_caps(self):
        self.assertEqual(pace_from_speed(0.0001), 1800)


class MonthlyKmTest(unittest.TestCase):
    def test_meters(self):
        self.assertAlmostEqual(monthly_km(3739.1), 3.7391)

    def test_legacy_km(self):
        self.assertAlmostEqual(monthly_km(5), 5.0)
        self.assertAlmostEqual(monthly_km(200), 200.0)
        self.assertAlmostEqual(monthly_km(201), 0.201)

    def test_none(self):
        self.assertEqual(monthly_km(None), 0)


class DisplayNameTest(unittest.TestCase):
    def test_keeps_cjk(self):
        self.assertEqual(display_name({"name": "晚间跑步"}), "晚间跑步")

    def test_strips_emoji_and_variation_selector(self):
        self.assertEqual(display_name({"name": "🌙\ufe0f 晚间跑步"}), "晚间跑步")

    def test_pure_emoji_falls_back(self):
        self.assertEqual(display_name({"name": "🏃"}), "Run")
        self.assertEqual(display_name({"name": ""}), "Run")


class DownsampleTest(unittest.TestCase):
    def test_keeps_endpoints(self):
        values = list(range(500))
        kept = downsample(values, 150)
        self.assertEqual(len(kept), 150)
        self.assertEqual(kept[0], 0)
        self.assertEqual(kept[-1], 499)

    def test_no_op_when_under_target(self):
        self.assertEqual(downsample([1, 2, 3], 10), [1, 2, 3])


class RoutePayloadTest(unittest.TestCase):
    def test_points_are_lon_lat_e6(self):
        polyline = _encode([[31.2304, 121.4737], [31.2305, 121.4740]])
        route = route_payload(polyline, 150)
        self.assertEqual(route["points"], [[121473700, 31230400], [121474000, 31230500]])
        self.assertEqual(
            route["bbox"], [121473700, 31230400, 121474000, 31230500]
        )

    def test_downsampled_points(self):
        coords = [[31.0 + i * 0.001, 121.0 + i * 0.001] for i in range(600)]
        route = route_payload(_encode(coords), 150)
        self.assertLessEqual(len(route["points"]), 150)

    def test_invalid_polyline_returns_none(self):
        self.assertIsNone(route_payload("", 150))
        self.assertIsNone(route_payload("not-a-polyline!!!", 150))


def _encode(coords):
    import polyline

    return polyline.encode(coords)


class CurvePayloadTest(unittest.TestCase):
    def test_velocity_to_pace_with_cap(self):
        to_pace = lambda v: min(int(round(1000.0 / v)), 1800) if v and v > 0 else 1800
        payload = curve_payload([2.0, 0.0, 2.5], None, 240, transform=to_pace)
        self.assertEqual(payload["values"][:3], [500, 1800, 400])
        self.assertEqual(payload["step_sec"], 1)

    def test_step_from_time_stream(self):
        times = list(range(0, 300, 5))  # 60 samples, 5 s apart, 295 s span
        payload = curve_payload([150.0] * 60, times, 240)
        self.assertEqual(payload["step_sec"], 5)

    def test_empty_stream_returns_none(self):
        self.assertIsNone(curve_payload([], None, 240))
        self.assertIsNone(curve_payload(None, None, 240))


class HeatmapYearTest(unittest.TestCase):
    def test_sparse_daily_totals(self):
        runs = [
            make_run(1, "2026-01-03 08:00:00", 3000, "0:20:00", 2.5),
            make_run(2, "2026-01-03 18:00:00", 2000, "0:15:00", 2.2),
            make_run(3, "2026-01-05 08:00:00", 5000, "0:30:00", 2.7),
        ]
        year = heatmap_year(runs, 2026)
        self.assertEqual(year["active_days"], 2)
        self.assertEqual(year["days"], [{"d": "0103", "v": 5.0}, {"d": "0105", "v": 5.0}])
        self.assertEqual(year["total_km"], 10.0)
        self.assertEqual(year["max_day_km"], 5.0)


class SummarizeTest(unittest.TestCase):
    def test_self_consistent_pace_and_pb(self):
        runs = [
            make_run(1, "2026-03-01 08:00:00", 5000, "0:25:00", 3.33, streak=2),
            make_run(2, "2026-04-10 08:00:00", 10000, "0:55:00", 3.03),
            make_run(3, "2025-12-01 08:00:00", 3000, "0:20:00", 2.5),
        ]
        summary = summarize(runs, "2026")
        self.assertEqual(summary["stats"]["count"], 2)
        self.assertAlmostEqual(summary["stats"]["distance_km"], 15.0)
        self.assertEqual(summary["stats"]["duration_sec"], 4800)
        # 15 km over 4800 s -> 320 s/km, robust against bogus average_speed.
        self.assertEqual(summary["stats"]["avg_pace_sec_per_km"], 320)
        self.assertEqual(summary["streak"], {"current": 1, "longest": 2})
        pb = {entry["distance_m"]: entry for entry in summary["pb"]}
        self.assertIn(5000, pb)
        self.assertIn(10000, pb)
        self.assertNotIn(21097.5, pb)
        self.assertEqual(pb[5000]["pace_sec_per_km"], 300)  # 25:00 for 5 km
        self.assertEqual(pb[10000]["pace_sec_per_km"], 330)  # 55:00 for 10 km

    def test_month_uses_latest_activity(self):
        runs = [
            make_run(1, "2026-03-01 08:00:00", 5000, "0:25:00", 3.33),
            make_run(2, "2026-04-10 08:00:00", 10000, "0:55:00", 3.03),
        ]
        summary = summarize(runs, "2026")
        self.assertEqual(summary["month"]["count"], 1)
        self.assertAlmostEqual(summary["month"]["distance_km"], 10.0)


class WriteDetailTest(unittest.TestCase):
    def test_degrades_then_raises(self):
        coords = [[31.0 + i * 0.001, 121.0 + i * 0.001] for i in range(200)]
        run = make_run(
            42,
            "2026-05-01 08:00:00",
            6000,
            "0:30:00",
            3.33,
            summary_polyline=_encode(coords),
            streams={"heartrate": [150] * 500, "time": list(range(500))},
        )
        with tempfile.TemporaryDirectory() as tmp:
            size, route_points, curve_samples = write_detail(run, tmp, 12 * 1024)
            self.assertTrue(os.path.isfile(os.path.join(tmp, "42.json")))
            self.assertLessEqual(size, 12 * 1024)
            self.assertLessEqual(route_points, 150)
            self.assertLessEqual(curve_samples, 240)
            with self.assertRaises(ExportError):
                write_detail(run, tmp, 64)


class ExportEndToEndTest(unittest.TestCase):
    def test_full_export_contract(self):
        activities = [
            make_run(
                1001,
                "2026-09-01 08:00:00",
                5000,
                "0:25:00",
                3.33,
                average_heartrate=150.0,
                calories=300.0,
                elevation_gain=40.0,
                summary_polyline=_encode([[31.0, 121.0], [31.01, 121.01]]),
                streams={"heartrate": [150] * 30, "time": list(range(30))},
                laps=[{"lap_index": 1, "distance": 1000.0, "moving_time": 300}],
            ),
            make_run(1002, "2026-08-01 08:00:00", 4000, "0:22:00", 3.0),
            make_run(1003, "2025-07-01 08:00:00", 6000, "0:31:00", 3.2),
            make_run(1004, "2026-09-02 09:00:00", 3000, "0:18:00", 2.7, type="Walk"),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            input_path = os.path.join(tmp, "activities.json")
            out_dir = os.path.join(tmp, "v1")
            with open(input_path, "w", encoding="utf-8") as handle:
                json.dump(activities, handle)

            summary, written = export(input_path, out_dir, years=3, recent_limit=20)

            self.assertEqual(summary["year"], 2026)
            self.assertEqual(summary["stats"]["count"], 2)  # Walk excluded
            for name in ("summary.json", "monthly.json", "heatmap.json"):
                self.assertIn(name, written)
            self.assertIn("recent.json", written)
            self.assertIn("1001.json", written)
            recent_path = os.path.join(out_dir, "activities", "recent.json")
            with open(recent_path, encoding="utf-8") as handle:
                recent = json.load(handle)
            self.assertEqual(len(recent["activities"]), 3)  # 3 Run entries
            self.assertTrue(all(a["has_detail"] for a in recent["activities"]))
            self.assertEqual(recent["activities"][0]["run_id"], 1001)
            detail_path = os.path.join(out_dir, "activities", "1001.json")
            with open(detail_path, encoding="utf-8") as handle:
                detail = json.load(handle)
            self.assertEqual(detail["route"]["points"][0], [121000000, 31000000])
            self.assertIn("curves", detail)
            self.assertEqual(detail["laps"][0]["pace_sec_per_km"], 300)


if __name__ == "__main__":
    unittest.main()
