# Strava 数据同步 - 快速参考

## 🚀 三步开始同步

### 1️⃣ 检查连接
```powershell
python run_page/check_strava_connection.py
```

### 2️⃣ 预览计划
```powershell
python run_page/strava_sync_scheduler.py --preview
```

### 3️⃣ 执行同步
```powershell
python run_page/strava_sync_scheduler.py --execute
```

---

## 📁 常用脚本（都在 `run_page` 目录）

| 脚本 | 功能 |
|------|------|
| `check_strava_connection.py` | 检查 Strava 连接状态 |
| `strava_sync_scheduler.py` | 主调度器（全量历史同步） |
| `monitor_strava_sync.py` | 实时监控同步进度 |
| `sync_single_activity.py` | 单独同步指定活动 |
| `start_strava_sync.ps1` | PowerShell 后台启动 |

---

## 📊 同步模式对比

### 增量同步（默认）
- ⚡ 快速，仅同步最近 7 天
- 📝 命令：`python run_page/run_strava_sync.py`

### 全量历史同步
- 📚 同步所有历史数据
- 🔍 包含 laps（分段）和 streams（时序）
- 📝 命令：`python run_page/strava_sync_scheduler.py --execute`

---

## 🔧 常见问题

### 遇到 429 速率限制？
```powershell
# 增加延迟时间
python run_page/strava_sync_scheduler.py --execute --delay 1800
```

### 网络错误？
```powershell
# 检查连接
python run_page/check_strava_connection.py

# 更换网络环境（如使用手机热点）
```

### 单独修复某个活动？
```powershell
python run_page/sync_single_activity.py <activity_id>
```

---

## 📖 完整文档

详细指南请参考：**[STRAVA_SYNC_GUIDE.md](STRAVA_SYNC_GUIDE.md)**

---

## 💡 提示

- ✅ 所有脚本已整理到 `run_page` 目录
- ✅ 支持断点续传，中断后可继续
- ✅ 自动处理速率限制，无需手动干预
- ✅ 后台运行推荐：`python run_page/start_strava_sync.ps1 -Monitor`
