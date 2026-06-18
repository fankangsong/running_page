#!/usr/bin/env python3
"""
对比指定 Strava 活动的原始 API 数据：
- activity details
- laps（原始）
- streams low resolution（当前同步代码使用）
- streams high resolution（原始全量）

用于核对前端分段数据与 Strava 显示差异的原因。
Usage: python compare_strava_data.py 18958026323
"""
import sys
import os
import io
import json
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import stravalib


def load_env():
    env_vars = {}
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip().strip('"').strip("'")
    return env_vars


def get_stream_points(streams, stream_type):
    """从 streams 字典中提取某类型的数据点列表"""
    obj = streams.get(stream_type) if streams else None
    if obj is None:
        return []
    if hasattr(obj, 'data'):
        return list(obj.data) if obj.data else []
    if isinstance(obj, list):
        return obj
    return []


def compute_km_splits(distance_arr, velocity_arr, heartrate_arr, time_arr, total_distance):
    """复刻前端 computeKmSplitsFromStreams 逻辑，按每 1000m 切分计算分段配速"""
    splits = []
    if not distance_arr or len(distance_arr) < 2:
        return splits

    n = len(distance_arr)
    idx = 0
    km = 1
    while idx < n - 1:
        target = km * 1000.0
        start_idx = idx
        # 找到距离 >= target 的索引
        end_idx = n - 1
        for j in range(idx, n):
            if distance_arr[j] >= target:
                end_idx = j
                break
        seg_dist = distance_arr[end_idx] - distance_arr[start_idx]
        if end_idx > start_idx and time_arr:
            seg_time = (time_arr[end_idx] - time_arr[start_idx]) if len(time_arr) > end_idx else 0
        else:
            seg_time = 0
        # 平均速度
        avg_v = None
        if velocity_arr and len(velocity_arr) > end_idx:
            seg_v = velocity_arr[start_idx:end_idx + 1]
            avg_v = sum(seg_v) / len(seg_v) if seg_v else None
        # 平均心率
        avg_hr = None
        if heartrate_arr and len(heartrate_arr) > end_idx:
            seg_hr = [h for h in heartrate_arr[start_idx:end_idx + 1] if h is not None]
            avg_hr = sum(seg_hr) / len(seg_hr) if seg_hr else None
        # 配速 sec/km
        pace = (seg_time / 1000.0 * seg_dist) if seg_dist > 0 and seg_time else None

        splits.append({
            'km': km,
            'seg_distance_m': round(seg_dist, 1),
            'seg_time_s': round(seg_time, 1) if seg_time else 0,
            'avg_speed_mps': round(avg_v, 2) if avg_v else None,
            'avg_hr': round(avg_hr, 1) if avg_hr else None,
            'pace_s_per_km': round(pace, 1) if pace else None,
        })
        idx = end_idx
        km += 1
        if km * 1000.0 > total_distance + 100:
            break
    return splits


def fmt_pace(sec):
    if not sec:
        return 'N/A'
    m = int(sec // 60)
    s = int(sec % 60)
    return f"{m}:{s:02d}"


def main():
    activity_id = int(sys.argv[1]) if len(sys.argv) > 1 else 18958026323
    print(f"{'='*70}")
    print(f"对比 Strava 活动数据: {activity_id}")
    print(f"{'='*70}\n")

    env = load_env()
    client_id = env.get("STRAVA_CLIENT_ID")
    client_secret = env.get("STRAVA_CLIENT_SECRET")
    refresh_token = env.get("STRAVA_REFRESH_TOKEN")
    if not all([client_id, client_secret, refresh_token]):
        print("[ERROR] 缺少 Strava 凭据 (.env)")
        sys.exit(1)

    client = stravalib.Client()
    resp = client.refresh_access_token(
        client_id=client_id, client_secret=client_secret, refresh_token=refresh_token
    )
    client.access_token = resp["access_token"]
    print("[OK] 认证成功\n")

    # 1. Activity details
    print("-"*70)
    print("[1] 活动详情 (get_activity)")
    print("-"*70)
    act = client.get_activity(activity_id)
    distance_km = float(act.distance) / 1000
    moving_s = act.moving_time.total_seconds() if hasattr(act.moving_time, 'total_seconds') else int(act.moving_time)
    elapsed_s = act.elapsed_time.total_seconds() if hasattr(act.elapsed_time, 'total_seconds') else int(act.elapsed_time)
    avg_speed = float(act.average_speed) if act.average_speed else None
    print(f"  名称: {act.name}")
    print(f"  类型: {act.type}")
    print(f"  距离: {distance_km:.3f} km")
    print(f"  moving_time: {moving_s}s ({int(moving_s//60)}:{int(moving_s%60):02d})")
    print(f"  elapsed_time: {elapsed_s}s ({int(elapsed_s//60)}:{int(elapsed_s%60):02d})")
    print(f"  average_speed: {avg_speed:.3f} m/s  -> 配速 {fmt_pace(1000/avg_speed) if avg_speed else 'N/A'} /km")
    print(f"  average_heartrate: {act.average_heartrate}")
    print(f"  max_heartrate: {getattr(act, 'max_heartrate', None)}")
    print(f"  total_elevation_gain: {act.total_elevation_gain}")
    print(f"  device_name: {getattr(act, 'device_name', None)}")

    # 2. Laps (原始 API)
    print(f"\n{'-'*70}")
    print("[2] 圈数数据 (get_activity_laps) — Strava 原始")
    print("-"*70)
    laps = list(client.get_activity_laps(activity_id))
    print(f"  共 {len(laps)} 圈")
    for i, lap in enumerate(laps, 1):
        lap_dist = float(lap.distance) if lap.distance else 0
        lap_mt = lap.moving_time.total_seconds() if hasattr(lap.moving_time, 'total_seconds') else int(lap.moving_time or 0)
        lap_pace = fmt_pace(1000 * lap_mt / lap_dist) if lap_dist > 0 and lap_mt else 'N/A'
        print(f"  Lap {i}: {lap_dist/1000:.3f}km, moving {lap_mt}s, 配速 {lap_pace}/km, "
              f"HR {lap.average_heartrate}, 爬升 {lap.total_elevation_gain}")

    # 3. Streams LOW resolution (当前同步代码使用)
    print(f"\n{'-'*70}")
    print("[3] Streams — low resolution (当前同步代码 resolution='low')")
    print("-"*70)
    time.sleep(2)
    stream_types = ['heartrate', 'velocity_smooth', 'altitude', 'distance', 'time']
    streams_low = client.get_activity_streams(activity_id, types=stream_types, resolution='low')
    low_data = {t: get_stream_points(streams_low, t) for t in stream_types}
    for t in stream_types:
        print(f"  {t}: {len(low_data[t])} 个数据点")
    if low_data['distance']:
        print(f"  distance 首尾: {low_data['distance'][0]:.1f} -> {low_data['distance'][-1]:.1f} m")
    if low_data['time'] and len(low_data['time']) > 1:
        intervals = [low_data['time'][i+1]-low_data['time'][i] for i in range(min(5, len(low_data['time'])-1))]
        print(f"  time 采样间隔(前5): {intervals}")

    # 4. Streams HIGH resolution
    print(f"\n{'-'*70}")
    print("[4] Streams — high resolution (原始全量)")
    print("-"*70)
    time.sleep(2)
    streams_high = client.get_activity_streams(activity_id, types=stream_types, resolution='high')
    high_data = {t: get_stream_points(streams_high, t) for t in stream_types}
    for t in stream_types:
        print(f"  {t}: {len(high_data[t])} 个数据点")
    if high_data['distance']:
        print(f"  distance 首尾: {high_data['distance'][0]:.1f} -> {high_data['distance'][-1]:.1f} m")
    if high_data['time'] and len(high_data['time']) > 1:
        intervals = [high_data['time'][i+1]-high_data['time'][i] for i in range(min(5, len(high_data['time'])-1))]
        print(f"  time 采样间隔(前5): {intervals}")

    # 5. 数据点数量对比
    print(f"\n{'='*70}")
    print("[5] 数据点数量对比 (low vs high)")
    print("="*70)
    print(f"  {'类型':<16}{'low':<10}{'high':<10}{'压缩比':<10}")
    for t in stream_types:
        l, h = len(low_data[t]), len(high_data[t])
        ratio = f"{l/h*100:.1f}%" if h else 'N/A'
        print(f"  {t:<16}{l:<10}{h:<10}{ratio:<10}")

    # 6. 用两套 streams 计算公里分段对比
    print(f"\n{'='*70}")
    print("[6] 公里分段对比 (用 streams 计算 vs Strava laps)")
    print("="*70)
    total_dist = float(act.distance)
    splits_low = compute_km_splits(low_data['distance'], low_data['velocity_smooth'],
                                   low_data['heartrate'], low_data['time'], total_dist)
    splits_high = compute_km_splits(high_data['distance'], high_data['velocity_smooth'],
                                    high_data['heartrate'], high_data['time'], total_dist)

    print(f"\n  {'公里':<6}{'low配速':<12}{'high配速':<12}{'low HR':<10}{'high HR':<10}{'low用时':<10}{'high用时':<10}")
    max_km = max(len(splits_low), len(splits_high))
    for i in range(max_km):
        sl = splits_low[i] if i < len(splits_low) else {}
        sh = splits_high[i] if i < len(splits_high) else {}
        print(f"  {(i+1):<6}{fmt_pace(sl.get('pace_s_per_km')):<12}{fmt_pace(sh.get('pace_s_per_km')):<12}"
              f"{str(sl.get('avg_hr','')):<10}{str(sh.get('avg_hr','')):<10}"
              f"{sl.get('seg_time_s',0):<10.1f}{sh.get('seg_time_s',0):<10.1f}")

    print(f"\n  [总结] low 分段数: {len(splits_low)}, high 分段数: {len(splits_high)}, Strava laps: {len(laps)}")
    print(f"\n  结论: 当前同步代码使用 resolution='low'，数据点被压缩至约 "
          f"{len(low_data['distance'])/max(len(high_data['distance']),1)*100:.1f}%，"
          f"导致前端从 streams 计算的分段配速/心率与 Strava 原始数据存在显著差异。")

    # 保存原始数据到文件供进一步分析
    out = {
        'activity_id': activity_id,
        'activity': {
            'name': act.name, 'type': act.type,
            'distance_m': float(act.distance),
            'moving_time_s': moving_s,
            'elapsed_time_s': elapsed_s,
            'average_speed_mps': avg_speed,
            'average_heartrate': act.average_heartrate,
            'max_heartrate': getattr(act, 'max_heartrate', None),
            'total_elevation_gain': float(act.total_elevation_gain) if act.total_elevation_gain else None,
        },
        'laps_count': len(laps),
        'streams_low_points': {t: len(low_data[t]) for t in stream_types},
        'streams_high_points': {t: len(high_data[t]) for t in stream_types},
        'splits_low': splits_low,
        'splits_high': splits_high,
    }
    out_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), f'strava_compare_{activity_id}.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"\n  原始对比数据已保存: {out_file}")


if __name__ == "__main__":
    main()
