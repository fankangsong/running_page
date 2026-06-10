# Strava 同步调度器使用指南

## 概述

`strava_sync_scheduler.py` 是一个智能的 Strava API 同步工具，具有以下特性：

- 🎯 **API 调用规划**: 自动计算全量同步所需的 API 调用次数
- ⏱️ **速率限制管理**: 严格遵守 Strava API 限制（600次/15分钟，30000次/天）
- 📊 **进度跟踪**: 实时记录总任务、已完成、失败、剩余数量到本地 JSON 文件
- 🔄 **分批执行**: 自动将任务分成多个批次，避免超出速率限制
- 🛡️ **错误处理**: 自动重试和错误隔离，单个活动失败不影响整体进度

## API 调用计算

每个活动的完整同步需要 **4 次 API 调用**：

1. `get_activities()` - 获取活动列表（基础信息）
2. `get_activity(id)` - 获取活动详细数据（卡路里、设备、心率等）
3. `get_activity_laps(id)` - 获取每公里分段数据
4. `get_activity_streams(id)` - 获取时序曲线数据（心率/配速/海拔）

**示例**：
- 100 个活动 = 400 次 API 调用
- 500 个活动 = 2000 次 API 调用

## 速率限制策略

### Strava 官方限制
- **每 15 分钟**: 600 次调用
- **每天**: 30,000 次调用

### 调度器策略
- 每批次最多处理 **150 个活动**（600 次调用 / 4）
- 批次之间等待 **15 分钟**（可配置）
- 接近日限制时自动等待到午夜重置

## 使用方法

### 1. 预览同步计划

```powershell
# 查看需要同步的数据量和预计时间
python run_page/strava_sync_scheduler.py --preview
```

输出示例：
```
======================================================================
📊 Strava Sync Plan Preview
======================================================================
✅ Authentication successful

Found 350 activities to sync

API Call Estimates:
  Total activities: 350
  Calls per activity: 4
  Total API calls needed: 1,400

Batch Plan:
  Activities per 15-min window: 150
  Max activities per day: 7,500
  Total 15-min windows needed: 10
  Estimated time: 2.5 hours

Rate Limits:
  Strava limit: 600 calls/15min, 30000 calls/day
  Current usage: 0 calls made
  Remaining today: 30000

======================================================================
To start sync, run with --execute flag
======================================================================
```

### 2. 执行同步

```powershell
# 默认模式（自动计算批次大小）
python run_page/strava_sync_scheduler.py --execute

# 自定义批次大小和延迟
python run_page/strava_sync_scheduler.py --execute --batch-size 50 --delay 1800
```

参数说明：
- `--batch-size`: 每批处理的活动数量（默认自动计算为 150）
- `--delay`: 批次间等待秒数（默认 900 秒 = 15 分钟）

### 3. 查看进度

进度保存在 `strava_sync_progress.json` 文件中：

```json
{
  "total_activities": 350,
  "completed": 150,
  "failed": 2,
  "skipped": 0,
  "current_batch": 1,
  "total_batches": 3,
  "started_at": "2026-06-10T14:30:00",
  "last_updated": "2026-06-10T14:45:00",
  "estimated_completion": "2026-06-10T17:00:00",
  "api_calls_made": 600,
  "api_calls_remaining_today": 29400
}
```

### 4. 重置进度

```powershell
# 清除进度记录，重新开始
python run_page/strava_sync_scheduler.py --reset
```

### 5. 同步所有运动类型

```powershell
# 默认只同步跑步活动
python run_page/strava_sync_scheduler.py --execute --only-run

# 同步所有类型（骑行、游泳等）
python run_page/strava_sync_scheduler.py --execute --all-types
```

## 后台运行

### Windows PowerShell 后台运行

```powershell
# 启动后台任务
Start-Job -ScriptBlock {
    Set-Location "d:\fankangsong\running_page"
    python run_page/strava_sync_scheduler.py --execute
} -Name "StravaSync"

# 查看任务状态
Get-Job -Name "StravaSync"

# 查看任务输出
Receive-Job -Name "StravaSync"

# 等待任务完成
Wait-Job -Name "StravaSync"
```

### 使用 nohup (Linux/Mac)

```bash
nohup python run_page/strava_sync_scheduler.py --execute > strava_sync.log 2>&1 &

# 查看日志
tail -f strava_sync.log
```

### 使用 tmux/screen

```bash
# 创建新会话
tmux new -s strava-sync

# 运行同步
python run_page/strava_sync_scheduler.py --execute

# 分离会话: Ctrl+B, D
# 重新连接: tmux attach -t strava-sync
```

## 进度监控

### 实时监控进度文件

```powershell
# PowerShell 持续监控
while ($true) {
    if (Test-Path "strava_sync_progress.json") {
        $progress = Get-Content "strava_sync_progress.json" | ConvertFrom-Json
        Write-Host "Completed: $($progress.completed)/$($progress.total_activities) " -NoNewline
        Write-Host "($($progress.progress_percentage)%)" -ForegroundColor Green
        Write-Host "Failed: $($progress.failed), Remaining: $($progress.remaining)"
    }
    Start-Sleep -Seconds 30
}
```

### 使用 Python 监控脚本

创建 `monitor_sync.py`:

```python
import json
import time
from datetime import datetime

def monitor():
    while True:
        try:
            with open('strava_sync_progress.json', 'r') as f:
                p = json.load(f)

            now = datetime.now().strftime('%H:%M:%S')
            print(f"[{now}] Progress: {p['completed']}/{p['total_activities']} "
                  f"({p['progress_percentage']}%) | "
                  f"Failed: {p['failed']} | "
                  f"Remaining: {p['remaining']}")

            if p['remaining'] == 0:
                print("✅ Sync completed!")
                break

            time.sleep(30)
        except FileNotFoundError:
            print("Waiting for sync to start...")
            time.sleep(10)

if __name__ == "__main__":
    monitor()
```

## 故障排除

### 问题：遇到 429 速率限制错误

**解决方案**：
- 调度器会自动等待 120 秒后重试
- 增加批次间延迟：`--delay 1800`（30 分钟）
- 减小批次大小：`--batch-size 100`

### 问题：网络连接中断

**解决方案**：
- 调度器会记录已完成的进度
- 重新运行 `--execute` 会从断点继续
- 不会重复处理已成功同步的活动

### 问题：部分活动失败

**解决方案**：
- 失败的活动会被跳过，继续下一个
- 完成后检查 `strava_sync_progress.json` 中的 `failed` 计数
- 可以单独重新同步失败的活动（手动指定 ID）

### 问题：每日限制用完

**解决方案**：
- 调度器会自动等待到午夜重置
- 或者第二天继续运行：`--execute` 会从上次位置继续

## 高级用法

### 定时任务（每天自动同步）

Windows Task Scheduler:
```powershell
# 创建每日任务
schtasks /create /tn "Strava Daily Sync" /tr "python d:\fankangsong\running_page\run_page\strava_sync_scheduler.py --execute" /sc daily /st 02:00
```

Linux Cron:
```bash
# 每天凌晨 2 点执行
0 2 * * * cd /path/to/running_page && python run_page/strava_sync_scheduler.py --execute >> /var/log/strava_sync.log 2>&1
```

### 与现有脚本集成

在 `run_strava_sync.py` 中使用调度器：

```python
#!/usr/bin/env python3
import os
import sys
from strava_sync_scheduler import StravaSyncScheduler

# Load credentials from .env
# ... (existing code)

if __name__ == "__main__":
    scheduler = StravaSyncScheduler(
        client_id=STRAVA_CLIENT_ID,
        client_secret=STRAVA_CLIENT_SECRET,
        refresh_token=STRAVA_REFRESH_TOKEN,
    )

    if "--preview" in sys.argv:
        scheduler.preview_sync_plan()
    else:
        scheduler.execute_sync()
```

## 性能优化建议

1. **首次全量同步**：
   - 建议在网络稳定的环境下进行
   - 可能需要数小时，请耐心等待
   - 使用 `--preview` 预估时间

2. **日常增量同步**：
   - 继续使用原有的 `strava_sync.py`（仅同步最近 7 天）
   - 定期（如每周）运行一次调度器进行全量同步

3. **大批量数据**：
   - 考虑分多天进行，每天同步一部分
   - 使用 `--batch-size` 控制每批数量
   - 调整 `--delay` 适应你的网络环境

## 文件说明

- `run_page/strava_sync_scheduler.py` - 主脚本
- `strava_sync_progress.json` - 进度跟踪文件（自动生成）
- `STRAVA_SCHEDULER_GUIDE.md` - 本说明文档
- `run_page/data.db` - SQLite 数据库（同步数据存储位置）

## 相关命令

同步完成后，重新构建前端以使用新数据：

```powershell
pnpm build
```

查看数据库内容：

```powershell
python run_page/data_to_csv.py
```

生成可视化图表：

```powershell
python run_page/gen_svg.py --from-db --type github --output assets/github.svg
```
