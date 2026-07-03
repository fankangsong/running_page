import sqlite3
import json

conn = sqlite3.connect('run_page/data.db')
cursor = conn.cursor()

# 查看最近导入的活动
cursor.execute('SELECT run_id, name, start_date_local FROM activities ORDER BY start_date_local DESC LIMIT 3')
activities = cursor.fetchall()
print('Recent activities:')
for a in activities:
    print(f'  {a[0]}: {a[1]} @ {a[2]}')

# 查看该活动的 laps
run_id = activities[0][0]
print(f'\nLaps for {run_id}:')
cursor.execute('SELECT lap_index, distance, average_speed, average_heartrate, total_elevation_gain FROM activity_laps WHERE activity_id = ? ORDER BY lap_index', (run_id,))
laps = cursor.fetchall()
for lap in laps:
    print(f'  Lap {lap[0]}: {lap[1]:.0f}m, speed={lap[2]:.2f}m/s, hr={lap[3]}, elev={lap[4]}')

# 查看该活动的 streams
print(f'\nStreams for {run_id}:')
cursor.execute('SELECT stream_type, LENGTH(data_json) FROM activity_streams WHERE activity_id = ?', (run_id,))
streams = cursor.fetchall()
for s in streams:
    print(f'  {s[0]}: {s[1]} bytes')

conn.close()