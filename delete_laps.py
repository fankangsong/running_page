import sqlite3
conn = sqlite3.connect('run_page/data.db')
cursor = conn.cursor()

# 查找 2026-07-03 活动的 run_id
cursor.execute("SELECT run_id FROM activities WHERE start_date_local LIKE '2026-07-03%'")
rows = cursor.fetchall()
print(f'Activities on 2026-07-03: {rows}')

for row in rows:
    run_id = row[0]
    # 删除该活动的 laps
    cursor.execute('DELETE FROM activity_laps WHERE activity_id = ?', (run_id,))
    print(f'Deleted {cursor.rowcount} laps for {run_id}')
    # 删除该活动的 streams
    cursor.execute('DELETE FROM activity_streams WHERE activity_id = ?', (run_id,))
    print(f'Deleted {cursor.rowcount} streams for {run_id}')

conn.commit()
conn.close()
print('Done')