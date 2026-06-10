# Strava 同步快速参考

## 🚀 快速开始

### 1️⃣ 预览同步计划

```powershell
python run_page/strava_sync_scheduler.py --preview
```

查看：
- 需要同步的活动数量
- API 调用次数估算
- 预计完成时间

### 2️⃣ 执行同步（推荐）

```powershell
# 默认模式（自动计算批次）
python run_page/strava_sync_scheduler.py --execute

# 或使用 PowerShell 脚本（带后台运行）
.\start_strava_sync.ps1 -Monitor
```

### 3️⃣ 监控进度

```powershell
# 启动监控器
python monitor_strava_sync.py

# 或直接查看 JSON 文件
Get-Content strava_sync_progress.json | ConvertFrom-Json | Format-List
```

---

## 📊 API 调用规划

### 每个活动的 API 成本

| 操作 | API 调用次数 |
|------|-------------|
| 获取活动列表 | 1 |
| 获取详细信息 | 1 |
| 获取圈数数据 | 1 |
| 获取数据流 | 1 |
| **总计** | **4 次/活动** |

### 示例计算

```
100 个活动 × 4 = 400 次 API 调用
500 个活动 × 4 = 2,000 次 API 调用
1000 个活动 × 4 = 4,000 次 API 调用
```

### Strava 速率限制

```
✅ 每 15 分钟: 600 次调用
✅ 每天: 30,000 次调用

安全余量:
- 调度器使用 ~400 次/15分钟（67% 限制）
- 远低于官方限制，非常安全
```

---

## ⚙️ 常用命令

### 基础命令

```powershell
# 预览（不执行）
python run_page/strava_sync_scheduler.py --preview

# 执行全量同步
python run_page/strava_sync_scheduler.py --execute

# 重置进度
python run_page/strava_sync_scheduler.py --reset

# 查看帮助
python run_page/strava_sync_scheduler.py --help
```

### 高级配置

```powershell
# 自定义批次大小（每批 50 个活动）
python run_page/strava_sync_scheduler.py --execute --batch-size 50

# 自定义延迟时间（30 分钟 = 1800 秒）
python run_page/strava_sync_scheduler.py --execute --delay 1800

# 同步所有类型（不仅跑步）
python run_page/strava_sync_scheduler.py --execute --all-types

# 组合使用
python run_page/strava_sync_scheduler.py --execute --batch-size 50 --delay 1800
```

### 后台运行

```powershell
# PowerShell 后台任务
Start-Job -ScriptBlock {
    Set-Location "d:\fankangsong\running_page"
    python run_page/strava_sync_scheduler.py --execute
} -Name "StravaSync"

# 查看状态
Get-Job -Name "StravaSync"

# 查看输出
Receive-Job -Name "StravaSync"

# 停止任务
Stop-Job -Name "StravaSync"
```

---

## 📁 文件说明

| 文件 | 用途 |
|------|------|
| `run_page/strava_sync_scheduler.py` | 主调度器脚本 |
| `monitor_strava_sync.py` | 进度监控器 |
| `start_strava_sync.ps1` | PowerShell 启动器 |
| `strava_sync_progress.json` | 进度跟踪文件（自动生成） |
| `STRAVA_SCHEDULER_GUIDE.md` | 完整使用指南 |
| `run_page/data.db` | SQLite 数据库（存储同步数据） |

---

## 🔍 进度文件格式

`strava_sync_progress.json`:

```json
{
  "total_activities": 350,
  "completed": 150,
  "failed": 2,
  "skipped": 0,
  "remaining": 198,
  "current_batch": 1,
  "total_batches": 3,
  "started_at": "2026-06-10T14:30:00",
  "last_updated": "2026-06-10T14:45:00",
  "estimated_completion": "2026-06-10T17:00:00",
  "api_calls_made": 600,
  "api_calls_remaining_today": 29400,
  "progress_percentage": 43.43
}
```

---

## 🎯 典型工作流程

### 首次全量同步

```powershell
# 1. 预览
python run_page/strava_sync_scheduler.py --preview

# 2. 执行（建议在网络稳定时进行）
python run_page/strava_sync_scheduler.py --execute

# 3. 监控进度（新终端窗口）
python monitor_strava_sync.py

# 4. 完成后重新构建前端
pnpm build
```

### 日常增量同步

```powershell
# 使用原有简单脚本（仅最近 7 天）
python run_strava_sync.py

# 或定期全量同步
python run_page/strava_sync_scheduler.py --execute --batch-size 100
```

---

## ⚠️ 故障排除

### 遇到 429 错误（速率限制）

```powershell
# 增加延迟时间
python run_page/strava_sync_scheduler.py --execute --delay 1800

# 减小批次大小
python run_page/strava_sync_scheduler.py --execute --batch-size 50
```

### 网络中断

```powershell
# 直接重新运行，会从断点继续
python run_page/strava_sync_scheduler.py --execute
```

### 查看失败的活动

```powershell
# 查看进度文件
$progress = Get-Content strava_sync_progress.json | ConvertFrom-Json
Write-Host "Failed: $($progress.failed)"
```

### 重置并重新开始

```powershell
# 清除进度记录
python run_page/strava_sync_scheduler.py --reset

# 重新执行
python run_page/strava_sync_scheduler.py --execute
```

---

## 📈 性能基准

根据实际测试：

| 活动数量 | API 调用次数 | 预计时间 |
|---------|------------|---------|
| 100 | 400 | ~25 分钟 |
| 350 | 1,400 | ~1.5 小时 |
| 500 | 2,000 | ~2 小时 |
| 1000 | 4,000 | ~4 小时 |

*基于每批次 150 个活动，批次间隔 15 分钟*

---

## 💡 最佳实践

1. **首次同步**: 在网络稳定的环境下进行，可能需要数小时
2. **日常更新**: 使用原有的 `run_strava_sync.py`（仅最近 7 天）
3. **定期全量**: 每周运行一次调度器确保数据完整
4. **监控进度**: 使用 `monitor_strava_sync.py` 实时查看
5. **后台运行**: 使用 `start_strava_sync.ps1 -Monitor` 启动

---

## 🔗 相关资源

- [完整使用指南](STRAVA_SCHEDULER_GUIDE.md)
- [Strava API 文档](https://developers.strava.com/docs/reference/)
- [RUN_SYNC_INSTRUCTIONS.md](RUN_SYNC_INSTRUCTIONS.md)
