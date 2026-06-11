# Strava 数据同步 - 快速参考

## 🚀 三步开始同步

### 1️⃣ 检查连接
```powershell
python run_page/check_strava_connection.py
```

### 2️⃣ 预览计划

```powershell
# 预览全量同步
python run_page/strava_sync_scheduler.py --preview

# 📅 预览指定时间范围
python run_page/strava_sync_scheduler.py --preview --after 2025-06-01 --before 2025-07-01
```

**关键信息：**
- API 调用 = 1 + N × 3（N = 活动数）
- 动态检测到的 Strava 限额
- 预计完成时间
- （如有）日期范围过滤条件

### 3️⃣ 执行同步

```powershell
# 全量同步
python run_page/strava_sync_scheduler.py --execute

# 📅 按日期范围同步
python run_page/strava_sync_scheduler.py --execute --after 2025-06-01 --before 2025-07-01
```

---

## 📁 常用脚本（都在 `run_page` 目录）

| 脚本 | 功能 |
|------|------|
| `check_strava_connection.py` | 检查 Strava 连接状态 |
| `strava_sync_scheduler.py` | 主调度器（支持日期范围过滤） |
| `monitor_strava_sync.py` | 实时监控同步进度 |
| `sync_single_activity.py` | 单独同步指定活动 |
| `start_strava_sync.ps1` | PowerShell 后台启动 |

---

## 📊 同步模式对比

### 增量同步（默认）
- ⚡ 快速，仅同步最近 7 天
- 📝 命令：`python run_page/strava_sync.py`

### 全量历史同步
- 📚 同步所有历史数据
- 🔍 包含 laps（分段）和 streams（时序）
- 📝 命令：`python run_page/strava_sync_scheduler.py --execute`

### 📅 按日期范围同步（新增）
- 🎯 精确控制同步的时间范围
- ⚡ 比全量同步更快（活动数少时）
- 📝 命令：`python run_page/strava_sync_scheduler.py --execute --after YYYY-MM-DD --before YYYY-MM-DD`

---

## 🔧 API 调用成本

**计算公式：** `1 + N × 3`
- `get_activities()` = 1 次（一次性）
- 每活动 = 3 次（detailed + laps + streams）

**示例：**
- 100 活动 = 1 + 100×3 = **301 次调用**
- 500 活动 = 1 + 500×3 = **1,501 次调用**

---

## 🎯 动态限频

脚本会自动从 Strava API 响应头检测你的实际限额：

- **Overall**: 200/15min → 600/15min（可能已升级）
- **Read**: 100/15min → 200/15min
- 自动调整批次大小以适配限额
- 每 5 个活动校准一次服务器使用量

无需手动配置，脚本自动优化！

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

### 如何同步某个月的数据？
```powershell
# 同步 2025 年 6 月的数据
python run_page/strava_sync_scheduler.py --execute --after 2025-06-01 --before 2025-07-01
```

---

## 📖 完整文档

详细指南请参考：**[STRAVA_SYNC_GUIDE.md](STRAVA_SYNC_GUIDE.md)**

---

## 💡 提示

- ✅ 所有脚本已整理到 `run_page` 目录
- ✅ 支持断点续传，中断后可继续
- ✅ 动态限频检测，自动适配你的应用限额
- ✅ 每 5 个活动自动校准服务器使用量
- ✅ 支持按日期范围同步（--after / --before）
- ✅ 后台运行推荐：`python run_page/start_strava_sync.ps1 -Monitor`
