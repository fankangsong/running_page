# Strava 同步调度器 - 使用指南

## 📋 目录

- [快速开始](#-快速开始)
- [功能特性](#-功能特性)
- [API 调用规划](#-api-调用规划)
- [使用方法](#-使用方法)
- [进度监控](#-进度监控)
- [故障排除](#-故障排除)
- [文件说明](#-文件说明)

---

## 🚀 快速开始

### 1️⃣ 验证安装

```powershell
python test_scheduler_setup.py
```

### 2️⃣ 预览同步计划

```powershell
python run_page/strava_sync_scheduler.py --preview
```

查看：
- 需要同步的活动数量
- API 调用次数估算
- 预计完成时间

### 3️⃣ 执行同步

```powershell
# 推荐：使用后台运行（带监控）
.\start_strava_sync.ps1 -Monitor

# 或直接执行
python run_page/strava_sync_scheduler.py --execute
```

### 4️⃣ 监控进度

```powershell
python monitor_strava_sync.py
```

---

## ✨ 功能特性

### ✅ 已完成的功能

#### 1. API 调用智能规划
- **自动计算**：每个活动需要 4 次 API 调用
  - 获取活动列表（1 次）
  - 获取详细数据（1 次）
  - 获取圈数数据（1 次）
  - 获取数据流（1 次）
- **批量处理**：根据速率限制自动分批
- **安全余量**：使用官方限制的 67%，非常安全

#### 2. 速率限制管理
- **遵守 Strava 限制**：
  - 每 15 分钟：600 次调用
  - 每天：30,000 次调用
- **智能延迟**：
  - 批次间自动等待 15 分钟
  - 遇到 429 错误等待 120 秒
  - 网络错误指数退避（30s → 60s → 120s）

#### 3. 进度跟踪
- **本地 JSON 文件**：`strava_sync_progress.json`
- **实时记录**：
  - 总任务数量
  - 已完成数量
  - 失败数量
  - 剩余任务数量
  - API 调用计数
  - 进度百分比

#### 4. 断点续传
- **自动保存**：每处理 5 个活动保存一次进度
- **中断恢复**：重启后从上次位置继续
- **失败隔离**：单个活动失败不影响整体

#### 5. 监控工具
- **实时监控脚本**：显示进度条、速度、ETA
- **PowerShell 后台运行器**：后台任务 + 日志记录
- **状态更新**：每 30 秒刷新一次

#### 6. 错误处理
- **智能重试**：最多 5 次，指数退避
- **错误分类**：
  - 429 速率限制 → 等待 120 秒
  - 网络错误 → 更长延迟 + 抖动
  - 其他错误 → 标准重试
- **事务回滚**：保证数据库一致性

---

## 📊 API 调用规划

### 计算公式

```
总调用次数 = 活动数量 × 4

其中：
- get_activities()       1 次/活动
- get_activity(id)       1 次/活动
- get_activity_laps()    1 次/活动
- get_activity_streams() 1 次/活动
```

### 示例

| 活动数量 | API 调用次数 | 预计时间 |
|---------|------------|---------|
| 100 | 400 | ~25 分钟 |
| 350 | 1,400 | ~1.5 小时 |
| 500 | 2,000 | ~2 小时 |
| 1000 | 4,000 | ~4 小时 |

*基于每批次 150 个活动，批次间隔 15 分钟*

### 速率限制对比

```
Strava 限制:
  每 15 分钟: 600 次
  每天:       30,000 次

调度器使用:
  每批 150 个活动 = 600 次调用（100% 利用）
  批次间隔 15 分钟
  实际使用率: ~67%（留有安全余量）
```

---

## 🛠️ 使用方法

### 基础命令

```powershell
# 预览（不执行）
python run_page/strava_sync_scheduler.py --preview

# 执行同步
python run_page/strava_sync_scheduler.py --execute

# 重置进度
python run_page/strava_sync_scheduler.py --reset

# 查看帮助
python run_page/strava_sync_scheduler.py --help
```

### 高级配置

```powershell
# 自定义批次大小（每批 50 个）
python run_page/strava_sync_scheduler.py --execute --batch-size 50

# 自定义延迟（30 分钟）
python run_page/strava_sync_scheduler.py --execute --delay 1800

# 组合使用
python run_page/strava_sync_scheduler.py --execute --batch-size 50 --delay 1800

# 同步所有类型（不仅跑步）
python run_page/strava_sync_scheduler.py --execute --all-types
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

或使用提供的脚本：

```powershell
# 一键启动（带监控）
.\start_strava_sync.ps1 -Monitor
```

---

## 📈 进度监控

### 进度文件格式

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

### 实时监控

```powershell
# 使用监控脚本（推荐）
python monitor_strava_sync.py

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

### 监控输出示例

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

---

## 🔧 故障排除

### 问题 1: 遇到 429 速率限制错误

**症状**:
```
stravalib.exc.Fault: 429 Client Error: Too Many Requests
[Rate Limit Exceeded: [{'resource': 'Application', 'field': 'read rate limit', 'code': 'exceeded'}]]
```

**解决方案**:
```powershell
# 增加延迟时间
python run_page/strava_sync_scheduler.py --execute --delay 1800

# 减小批次大小
python run_page/strava_sync_scheduler.py --execute --batch-size 50
```

**预防**:
- 调度器已内置速率限制保护
- 默认配置远低于官方限制
- 如遇此错误，可能是其他程序也在调用 API

---

### 问题 2: 网络连接中断

**症状**:
```
SSLError(SSLEOFError(...EOF occurred in violation of protocol...))
ProxyError('Cannot connect to proxy.')
ConnectionError
```

**解决方案**:
```powershell
# 直接重新运行，会从断点继续
python run_page/strava_sync_scheduler.py --execute
```

**优化**:
- 检查网络连接
- 禁用 VPN/代理（如果使用）
- 尝试使用手机热点

---

### 问题 3: 部分活动失败

**查看失败详情**:
```powershell
$progress = Get-Content strava_sync_progress.json | ConvertFrom-Json
Write-Host "Failed: $($progress.failed)"
```

**解决方案**:
- 失败的活动会被自动跳过
- 不影响其他活动的同步
- 完成后可单独处理失败的活动

---

### 问题 4: 每日限制用完

**症状**:
```
[WARN] Daily rate limit approaching. Waiting for reset...
```

**解决方案**:
```powershell
# 调度器会自动等待到午夜
# 也可以第二天继续运行
python run_page/strava_sync_scheduler.py --execute
```

**预防**:
- 每天最多同步 7,500 个活动
- 分多天进行大批量同步
- 使用 `--batch-size` 控制每天的处理量

---

### 问题 5: 认证失败

**症状**:
```
[ERROR] Authentication failed: ...
```

**解决方案**:
```powershell
# 检查 .env 文件中的凭证
Get-Content .env | Select-String "STRAVA_"

# 重新获取 refresh token
# 参考 RUN_SYNC_INSTRUCTIONS.md
```

---

## 📁 文件说明

### 核心脚本

| 文件 | 用途 | 行数 |
|------|------|------|
| `run_page/strava_sync_scheduler.py` | 主调度器脚本 | ~515 |
| `monitor_strava_sync.py` | 进度监控器 | ~120 |
| `start_strava_sync.ps1` | PowerShell 后台启动器 | ~100 |
| `test_scheduler_setup.py` | 安装验证脚本 | ~135 |

### 文档

| 文件 | 内容 |
|------|------|
| `STRAVA_SCHEDULER_GUIDE.md` | 完整使用指南 |
| `STRAVA_QUICKSTART.md` | 快速参考手册 |
| `SCHEDULER_FEATURES.md` | 功能总结 |
| `README_SCHEDULER.md` | 本文档 |

### 生成的文件

| 文件 | 说明 |
|------|------|
| `strava_sync_progress.json` | 进度跟踪文件（自动生成） |
| `strava_sync.log` | 运行日志（后台运行时生成） |

---

## 🎯 典型工作流程

### 首次全量同步

```powershell
# 1. 验证安装
python test_scheduler_setup.py

# 2. 预览
python run_page/strava_sync_scheduler.py --preview

# 3. 执行（建议在网络稳定时进行）
.\start_strava_sync.ps1 -Monitor

# 4. 等待完成（可能需要数小时）
# 监控器会显示实时进度和 ETA

# 5. 完成后重新构建前端
pnpm build
```

### 日常增量同步

```powershell
# 使用原有简单脚本（仅最近 7 天）
python run_strava_sync.py

# 或定期全量同步（如每周一次）
python run_page/strava_sync_scheduler.py --execute --batch-size 100
```

### 定时任务（可选）

Windows Task Scheduler:
```powershell
# 创建每日任务（凌晨 2 点）
schtasks /create /tn "Strava Daily Sync" /tr "python d:\fankangsong\running_page\run_page\strava_sync_scheduler.py --execute" /sc daily /st 02:00
```

Linux Cron:
```bash
# 每天凌晨 2 点执行
0 2 * * * cd /path/to/running_page && python run_page/strava_sync_scheduler.py --execute >> /var/log/strava_sync.log 2>&1
```

---

## 💡 最佳实践

1. **首次同步**
   - 在网络稳定的环境下进行
   - 预留足够时间（可能需要数小时）
   - 使用 `--preview` 预估时间

2. **日常更新**
   - 继续使用原有的 `run_strava_sync.py`（仅最近 7 天）
   - 每周运行一次调度器进行全量同步

3. **大批量数据**
   - 分多天进行，每天同步一部分
   - 使用 `--batch-size` 控制每批数量
   - 调整 `--delay` 适应网络环境

4. **监控和维护**
   - 定期检查进度文件
   - 关注失败计数
   - 保留日志用于故障排查

---

## 🔗 相关资源

- [完整使用指南](STRAVA_SCHEDULER_GUIDE.md)
- [快速参考](STRAVA_QUICKSTART.md)
- [功能总结](SCHEDULER_FEATURES.md)
- [原始同步说明](RUN_SYNC_INSTRUCTIONS.md)
- [Strava API 文档](https://developers.strava.com/docs/reference/)

---

## ❓ 常见问题

**Q: 调度器和原来的 strava_sync.py 有什么区别？**

A: 调度器增加了：
- API 调用规划和估算
- 速率限制自动管理
- 进度跟踪到本地文件
- 分批执行和断点续传
- 实时监控工具

**Q: 我应该在什么时候使用调度器？**

A:
- 首次全量历史数据同步
- 大批量数据同步（>100 个活动）
- 需要精确控制 API 调用
- 需要进度跟踪和监控

**Q: 原来的 strava_sync.py 还能用吗？**

A: 可以。调度器是增量功能，不影响原有脚本。日常增量同步仍可使用原脚本。

**Q: 如何恢复被中断的同步？**

A: 直接重新运行 `--execute`，会自动从上次位置继续。进度保存在 `strava_sync_progress.json` 中。

**Q: 同步完成后需要做什么？**

A: 重新构建前端以使用新数据：
```powershell
pnpm build
```
