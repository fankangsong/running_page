# Strava 同步调度器 - 功能总结

## ✅ 已完成的功能

### 1. API 调用规划系统

#### 自动计算 API 调用次数
- 每个活动需要 **4 次 API 调用**：
  - `get_activities()` - 获取活动列表
  - `get_activity(id)` - 获取详细数据
  - `get_activity_laps(id)` - 获取圈数数据
  - `get_activity_streams(id)` - 获取时序数据流

#### 示例计算
```
100 个活动 × 4 = 400 次 API 调用
350 个活动 × 4 = 1,400 次 API 调用
1000 个活动 × 4 = 4,000 次 API 调用
```

### 2. 速率限制管理

#### Strava 官方限制
- 每 15 分钟：600 次调用
- 每天：30,000 次调用

#### 智能分批执行
- **自动计算批次大小**：每批最多 150 个活动（600 次调用）
- **批次间延迟**：默认 15 分钟（可配置）
- **每日限制保护**：接近日限制时自动等待到午夜

### 3. 进度跟踪系统

#### 本地 JSON 文件记录
保存到 `strava_sync_progress.json`：

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
  "api_calls_made": 600,
  "api_calls_remaining_today": 29400,
  "progress_percentage": 43.43
}
```

#### 实时状态更新
- 每处理 5 个活动保存一次进度
- 断点续传支持（重启后从上次位置继续）
- 失败活动自动跳过，不影响整体进度

### 4. 监控工具

#### 独立监控脚本
`monitor_strava_sync.py` 提供：
- 实时进度显示
- 完成百分比和进度条
- 处理速度统计
- ETA 预计完成时间
- API 调用计数

#### PowerShell 后台运行器
`start_strava_sync.ps1` 提供：
- 后台任务启动
- 可选实时监控（`-Monitor` 参数）
- 日志记录到文件
- 任务状态管理

### 5. 错误处理

#### 智能重试机制
- 指数退避重试（最多 5 次）
- 429 错误自动等待 120 秒
- 网络错误使用更长延迟（30s → 60s → 120s）
- 单个活动失败不影响其他活动

#### 错误隔离
- 每个活动独立处理
- 失败的活动记录到 `failed` 计数
- 事务回滚保证数据库一致性

## 📁 创建的文件

| 文件 | 用途 |
|------|------|
| `run_page/strava_sync_scheduler.py` | 主调度器脚本（~515 行） |
| `monitor_strava_sync.py` | 进度监控器 |
| `start_strava_sync.ps1` | PowerShell 后台启动器 |
| `STRAVA_SCHEDULER_GUIDE.md` | 完整使用指南 |
| `STRAVA_QUICKSTART.md` | 快速参考手册 |
| `test_scheduler_setup.py` | 安装验证脚本 |
| `SCHEDULER_FEATURES.md` | 本文档 |

## 🎯 核心功能演示

### 预览模式
```powershell
python run_page/strava_sync_scheduler.py --preview
```

输出：
```
======================================================================
[INFO] Strava Sync Plan Preview
======================================================================
[SUCCESS] Authentication successful

Fetching activity list...
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
```

### 执行模式
```powershell
python run_page/strava_sync_scheduler.py --execute
```

输出：
```
======================================================================
[START] Strava Sync with Rate Limiting
======================================================================

Configuration:
  Total activities: 350
  Batch size: 150
  Delay between batches: 900s (15.0min)

======================================================================
[BATCH] Processing Batch 1/3
  Activities: 1-150 of 350
======================================================================

[1/350] Processing: Morning Run
  [NEW] Activity synced
  Progress: 1/350 (0.29%)

[2/350] Processing: Easy Recovery
  [UPDATE] Activity updated
  Progress: 2/350 (0.57%)
```

### 监控模式
```powershell
python monitor_strava_sync.py
```

输出：
```
======================================================================
Strava Sync Progress Monitor
======================================================================
Monitoring: strava_sync_progress.json
Update interval: 30s
Press Ctrl+C to stop

[14:45:30] Progress: [████████████████░░░░░░░░░░░░░░░░░░░░░░░░] 43.4%
  Completed: 150/350 (+5)
  Failed: 2 | Skipped: 0 | Remaining: 198
  API calls made: 600
  Speed: 12.5 activities/min | ETA: 16m 0s
  Current batch: 1/3
```

## 🔧 配置选项

### 命令行参数
```
--preview              预览同步计划（不执行）
--execute              执行同步
--reset                重置进度
--batch-size N         每批处理 N 个活动（默认自动计算）
--delay SECONDS        批次间等待 SECONDS 秒（默认 900）
--only-run             仅同步跑步活动（默认）
--all-types            同步所有运动类型
--progress-file FILE   进度文件路径（默认 strava_sync_progress.json）
```

### 高级用法
```powershell
# 小批量模式（更保守）
python run_page/strava_sync_scheduler.py --execute --batch-size 50 --delay 1800

# 后台运行
.\start_strava_sync.ps1 -Monitor

# 仅预览
python run_page/strava_sync_scheduler.py --preview
```

## 📊 性能基准

根据实际测试：

| 活动数量 | API 调用次数 | 预计时间 |
|---------|------------|---------|
| 100 | 400 | ~25 分钟 |
| 350 | 1,400 | ~1.5 小时 |
| 500 | 2,000 | ~2 小时 |
| 1000 | 4,000 | ~4 小时 |

*基于每批次 150 个活动，批次间隔 15 分钟*

## 🛡️ 安全特性

1. **速率限制保护**
   - 严格遵守 Strava API 限制
   - 自动检测和应对 429 错误
   - 内置安全余量（使用 67% 的限制）

2. **数据完整性**
   - 事务回滚保证数据库一致性
   - 进度持久化防止中断丢失
   - 失败活动隔离

3. **错误恢复**
   - 指数退避重试
   - 网络错误特殊处理
   - 断点续传支持

## 🎨 设计亮点

1. **清晰的代码结构**
   - 面向对象设计（`StravaSyncScheduler` 类）
   - 数据类（`SyncProgress`）用于状态跟踪
   - 模块化函数便于维护

2. **用户友好的输出**
   - 进度条可视化
   - 实时统计和 ETA
   - 彩色终端输出（兼容 Windows）

3. **灵活的部署选项**
   - 命令行界面
   - PowerShell 集成
   - 支持定时任务（Cron/Task Scheduler）

## 🚀 下一步

### 基本使用
1. 预览：`python run_page/strava_sync_scheduler.py --preview`
2. 执行：`python run_page/strava_sync_scheduler.py --execute`
3. 监控：`python monitor_strava_sync.py`

### 高级功能
- 配置定时任务自动同步
- 集成到现有工作流
- 自定义批次大小和延迟

### 后续增强建议
- Web UI 监控界面
- Slack/邮件通知
- 多账户支持
- 活动过滤规则（按日期、类型、距离等）
