# Strava 数据同步完整指南

## 📋 目录

- [快速开始](#-快速开始)
- [脚本说明](#-脚本说明)
- [同步模式](#-同步模式)
- [常用命令](#-常用命令)
- [故障排除](#-故障排除)
- [API 限频说明](#-api-限频说明)

---

## 🚀 快速开始

### 1️⃣ 检查连接状态

```powershell
# 测试 Strava API 连接
python run_page/check_strava_connection.py
```

**输出示例：**

```
✅ Internet Connectivity: OK
✅ Strava API Reachability: OK
✅ Strava Authentication: OK
✅ Activity Fetch: OK

🎉 All tests passed! You can run the sync.
```

### 2️⃣ 预览同步计划

```powershell
# 查看需要同步的活动数量和预计时间
python run_page/strava_sync_scheduler.py --preview
```

**输出信息：**

- 总活动数
- API 调用次数估算（活动列表 1 次 + 每个活动 3 次：详细 + laps + streams）
- 批次计划和预计完成时间
- 当前进度（如有）
- 动态检测到的 Strava API 限额

### 3️⃣ 执行同步

```powershell
# 方式一：使用调度器（推荐，支持断点续传和速率限制）
python run_page/strava_sync_scheduler.py --execute

# 方式二：使用 PowerShell 后台运行（带监控）
python run_page/start_strava_sync.ps1 -Monitor
```

### 4️⃣ 监控进度

```powershell
# 实时监控同步进度
python run_page/monitor_strava_sync.py

# 查看进度文件
Get-Content strava_sync_progress.json | ConvertFrom-Json | Format-List
```

---

## 📁 脚本说明

所有脚本已整理到 `run_page` 目录：

### Python 脚本

| 脚本文件                       | 功能说明                 | 使用场景                  |
| ------------------------------ | ------------------------ | ------------------------- |
| **check_strava_connection.py** | 连接诊断工具             | 首次配置或遇到网络问题时  |
| **strava_sync_scheduler.py**   | 主调度器（支持全量同步） | 完整历史数据同步          |
| **strava_sync.py**             | 简单同步脚本             | 日常增量同步（最近 7 天） |
| **monitor_strava_sync.py**     | 进度监控器               | 实时查看同步进度          |
| **handle_rate_limit.py**       | 速率限制处理工具         | 遇到 429 错误时           |
| **test_scheduler_setup.py**    | 安装验证工具             | 检查环境配置是否正确      |
| **sync_single_activity.py**    | 单独同步指定活动         | 修复单个活动的分段数据    |
| **regenerate_json.py**         | 重新生成 activities.json | 更新前端数据文件          |

### PowerShell 脚本

| 脚本文件                    | 功能说明             | 使用场景               |
| --------------------------- | -------------------- | ---------------------- |
| **start_strava_sync.ps1**   | 后台启动同步任务     | Windows 环境下后台运行 |
| **quick_start.ps1**         | 快速启动（前台模式） | 调试和测试             |
| **restart_strava_sync.ps1** | 清理并重新开始       | 遇到错误需要重置时     |
| **build.ps1**               | 构建前端项目         | 同步完成后重新构建     |

### 其他文件

| 文件                          | 说明                           |
| ----------------------------- | ------------------------------ |
| **strava_sync_progress.json** | 进度跟踪文件（自动生成）       |
| **strava_sync.log**           | 同步日志文件（后台运行时生成） |

---

## 🔄 同步模式

### 模式 1：增量同步（默认）

**适用场景：** 日常更新，同步最近 7 天的活动

```powershell
# 使用简单同步脚本
python run_page/strava_sync.py

# 或使用调度器（自动判断）
python run_page/strava_sync_scheduler.py --execute
```

**特点：**

- ⚡ 速度快，API 调用少
- 📊 只同步最近 7 天的新活动
- ✅ 适合定期运行

---

### 模式 2：全量历史同步

**适用场景：** 首次同步或需要补充历史数据

```powershell
# 使用调度器（推荐）
python run_page/strava_sync_scheduler.py --execute

# 或使用旧脚本（不推荐）
python run_page/strava_sync.py --historical
```

**特点：**

- 📚 同步所有历史活动
- 🔍 包含 laps（分段数据）和 streams（时序数据）
- ⏱️ 耗时较长（根据活动数量，可能需要 1-4 小时）
- 🔄 支持断点续传

---

### 模式 3：按日期范围同步

**适用场景：** 只需要同步特定时间段的数据（如某个月份、某个赛季）

```powershell
# 同步指定月份
python run_page/strava_sync_scheduler.py --execute --after 2025-06-01 --before 2025-07-01

# 同步某天之后
python run_page/strava_sync_scheduler.py --execute --after 2025-01-01

# 预览查看将同步多少活动
python run_page/strava_sync_scheduler.py --preview --after 2025-05-01 --before 2025-06-30
```

**特点：**

- 🎯 精确控制同步的时间范围
- ⚡ 比全量同步更快（活动数少时）
- 📅 支持 ISO 8601 和 YYYY-MM-DD 格式
- 🔍 在 Strava API 层面过滤，减少不必要的 API 调用

---

**每个活动获取的数据：**

- ✅ 基础信息（距离、时间、配速等）
- ✅ 详细数据（卡路里、设备、心率等）
- ✅ **Laps（每公里分解）**
- ✅ **Streams（心率/配速/海拔时序曲线）**

---

## ⚙️ API 调用成本说明

### 每个活动的 API 成本

| 操作                 | API 调用次数 | 说明                                |
| -------------------- | ------------ | ----------------------------------- |
| 获取活动列表         | 1（一次性）  | `get_activities()` 批量获取所有活动 |
| 获取详细信息         | 1（每活动）  | `get_activity(id)`                  |
| 获取圈数数据 (laps)  | 1（每活动）  | `get_activity_laps(id)`             |
| 获取数据流 (streams) | 1（每活动）  | `get_activity_streams(id)`          |
| **总计（每活动）**   | **3 次**     | 不含活动列表调用                    |

**示例：**

- 100 个活动 = 1 + 100 × 3 = **301 次 API 调用**
- 500 个活动 = 1 + 500 × 3 = **1,501 次 API 调用**

### 动态限频检测

同步脚本会自动从 Strava API 响应头中检测实际限额：

- **Overall 限额**: 默认 200/15min, 2000/day（可能通过审核提升至 600/15min, 30000/day）
- **Read 限额**: 默认 100/15min, 1000/day（非上传接口）

脚本会在每次 API 调用后解析以下响应头并自动调整：

- `X-RateLimit-Limit`: 总体限额
- `X-ReadRateLimit-Limit`: Read 限额
- `X-RateLimit-Usage`: 当前使用量
- `X-ReadRateLimit-Usage`: Read 使用量

无需手动配置，脚本会根据 Strava 返回的实际限额自动优化同步速度。

---

## ⚙️ 常用命令

### 基础命令

```powershell
# 1. 检查连接
python run_page/check_strava_connection.py

# 2. 预览同步计划
python run_page/strava_sync_scheduler.py --preview

# 3. 执行同步
python run_page/strava_sync_scheduler.py --execute

# 4. 监控进度
python run_page/monitor_strava_sync.py

# 5. 重置进度
python run_page/strava_sync_scheduler.py --reset
```

### 高级配置

```powershell
# 自定义批次大小（每批 50 个活动）
python run_page/strava_sync_scheduler.py --execute --batch-size 50

# 自定义延迟时间（30 分钟 = 1800 秒）
python run_page/strava_sync_scheduler.py --execute --delay 1800

# 同步所有类型（不仅跑步）
python run_page/strava_sync_scheduler.py --execute --all-types

# 📅 按日期范围同步（推荐）
# 同步指定月份的数据
python run_page/strava_sync_scheduler.py --execute --after 2025-06-01 --before 2025-07-01

# 同步某天之后的数据
python run_page/strava_sync_scheduler.py --execute --after 2025-01-01

# 同步某天之前的数据
python run_page/strava_sync_scheduler.py --execute --before 2025-06-30

# 组合使用
python run_page/strava_sync_scheduler.py --execute --batch-size 50 --delay 1800 --after 2025-06-01 --before 2025-07-01
```

### 后台运行（PowerShell）

```powershell
# 后台启动并监控
python run_page/start_strava_sync.ps1 -Monitor

# 仅后台启动
python run_page/start_strava_sync.ps1

# 查看后台任务状态
Get-Job -Name "StravaSync"

# 查看后台任务输出
Receive-Job -Name "StravaSync"

# 停止后台任务
Stop-Job -Name "StravaSync"
```

### 单独同步指定活动

```powershell
# 为特定活动同步 laps 和 streams 数据
python run_page/sync_single_activity.py <activity_id>

# 示例
python run_page/sync_single_activity.py 18661504630
```

### 重新生成前端数据

```powershell
# 从数据库重新生成 activities.json
python run_page/regenerate_json.py

# 然后重新构建前端
pnpm build
```

---

## ⚠️ 故障排除

### 问题 1：SSL/网络连接错误

**错误特征：**

```
SSLError(SSLEOFError(...EOF occurred in violation of protocol...))
ProxyError('Cannot connect to proxy.')
ConnectionError
```

**解决方案：**

1. **检查网络连接**

   ```powershell
   python run_page/check_strava_connection.py
   ```

2. **禁用 VPN/代理**

   - 临时关闭系统代理
   - 或在浏览器中直接访问 Strava 确认连接正常

3. **更换网络环境**

   - 尝试使用手机热点
   - 或切换到其他 WiFi 网络

4. **等待后重试**
   - 脚本会自动重试（指数退避策略）
   - 首次网络错误会等待 30s → 60s → 120s

---

### 问题 2：429 速率限制错误

**错误特征：**

```
RateLimitExceeded: 429 Too Many Requests
```

**解决方案：**

1. **增加批次间隔时间**

   ```powershell
   # 默认 15 分钟（900 秒）
   python run_page/strava_sync_scheduler.py --execute --delay 1800

   # 或使用更保守的设置
   python run_page/strava_sync_scheduler.py --execute --delay 3600
   ```

2. **减小批次大小**

   ```powershell
   # 每批 50 个活动（默认 150）
   python run_page/strava_sync_scheduler.py --execute --batch-size 50
   ```

3. **使用速率限制处理工具**
   ```powershell
   python run_page/handle_rate_limit.py
   ```

**Strava API 限制：**

脚本会自动检测实际限额（从响应头 `X-RateLimit-Limit`），默认：

- 📊 **Overall 限额**: 200 次/15min, 2000 次/天（可能已升级至 600/30000）
- 📊 **Read 限额**: 100 次/15min, 1000 次/天（非上传接口）
- ✅ 调度器使用动态检测，自动适配你的应用限额
- ✅ 每批次调用约 450 次（预留 25% 安全余量）

---

### 问题 3：认证失败

**错误特征：**

```
Authentication failed
invalid_grant error
```

**解决方案：**

1. **检查 .env 文件中的凭证**

   ```
   STRAVA_CLIENT_ID=your_client_id
   STRAVA_CLIENT_SECRET=your_client_secret
   STRAVA_REFRESH_TOKEN=your_refresh_token
   ```

2. **刷新 token 可能已过期**
   - 需要重新授权获取新的 refresh token
   - 参考项目 README 中的授权步骤

---

### 问题 4：部分活动缺少分段数据

**症状：** 活动存在但没有 laps 或 streams 数据

**原因：** 使用了旧的同步脚本或不完整的同步

**解决方案：**

1. **单独同步该活动**

   ```powershell
   python run_page/sync_single_activity.py <activity_id>
   ```

2. **重新执行全量同步**

   ```powershell
   python run_page/strava_sync_scheduler.py --reset
   python run_page/strava_sync_scheduler.py --execute
   ```

3. **重新生成前端数据**
   ```powershell
   python run_page/regenerate_json.py
   pnpm build
   ```

---

### 问题 5：同步中断或卡住

**解决方案：**

1. **重启同步（自动从断点继续）**

   ```powershell
   python run_page/restart_strava_sync.ps1
   ```

2. **手动重置并重新开始**

   ```powershell
   python run_page/strava_sync_scheduler.py --reset
   python run_page/strava_sync_scheduler.py --execute
   ```

3. **查看进度文件**
   ```powershell
   Get-Content strava_sync_progress.json | ConvertFrom-Json
   ```

---

## 📊 API 限频说明

### Strava API 限制

| 限制类型        | 默认配额 | 升级后配额 | 说明            |
| --------------- | -------- | ---------- | --------------- |
| Overall (15min) | 200 次   | 600 次     | 15 分钟滑动窗口 |
| Overall (daily) | 2,000 次 | 30,000 次  | 自然日重置      |
| Read (15min)    | 100 次   | 200 次     | 非上传接口      |
| Read (daily)    | 1,000 次 | 2,000 次   | 自然日重置      |

**注意**: 实际限额由 Strava 根据你的应用状态决定。脚本会在首次 API 调用后自动检测并显示你的实际限额。

### 每个活动的 API 成本

| 操作                 | API 调用次数 | 说明                        |
| -------------------- | ------------ | --------------------------- |
| 获取活动列表         | 1（一次性）  | `get_activities()` 批量获取 |
| 获取详细信息         | 1（每活动）  | `get_activity(id)`          |
| 获取圈数数据 (laps)  | 1（每活动）  | `get_activity_laps(id)`     |
| 获取数据流 (streams) | 1（每活动）  | `get_activity_streams(id)`  |
| **总计**             | **1 + N×3**  | N = 活动数                  |

### 调度器默认配置

| 参数            | 默认值            | 说明                     |
| --------------- | ----------------- | ------------------------ |
| 批次大小        | 自动计算          | 基于检测到的限额动态调整 |
| 批次间隔        | 900 秒（15 分钟） | 可自定义 --delay         |
| 每批次 API 调用 | ~450 次           | 预留 25% 安全余量        |
| 限频策略        | 动态检测          | 自动从响应头获取实际限额 |

### 性能基准（动态调整）

| 活动数量 | API 调用次数 | 预计时间（默认限额） | 预计时间（升级后） |
| -------- | ------------ | -------------------- | ------------------ |
| 100      | 301          | ~25 分钟             | ~10 分钟           |
| 350      | 1,051        | ~1.5 小时            | ~35 分钟           |
| 500      | 1,501        | ~2 小时              | ~50 分钟           |
| 1000     | 3,001        | ~4 小时              | ~1.5 小时          |

_基于每批次自动计算的活动数，批次间隔 15 分钟。实际速度取决于 Strava 授予的应用限额。_

**计算公式：**

- API 调用 = 1 + N × 3（N = 活动数）
- 每批活动数 = min(600, 当日剩余额度) / 3
- 总时间 = 批次数 × 15 分钟

---

## 💡 最佳实践

### 首次同步

1. ✅ 先检查连接：`python run_page/check_strava_connection.py`
2. ✅ 预览计划：`python run_page/strava_sync_scheduler.py --preview`
3. ✅ 在网络稳定的环境下进行
4. ✅ 预留足够时间（可能需要数小时）
5. ✅ 使用后台运行：`python run_page/start_strava_sync.ps1 -Monitor`

### 日常更新

- 使用简单脚本（仅最近 7 天）：`python run_page/strava_sync.py`
- 或每周运行一次调度器确保数据完整

### 定期维护

- 每周运行一次全量同步
- 定期检查进度文件
- 遇到问题及时查看日志

### 数据完整性

- 同步完成后重新生成 `activities.json`
- 使用 `pnpm build` 重新构建前端
- 验证数据库中 laps 和 streams 数据

---

## 🔗 相关资源

- [Strava API 文档](https://developers.strava.com/docs/reference/)
- [项目 README](README.md)
- [项目 README-CN](README-CN.md)

---

## 📝 更新日志

### 2026-06-11

- ✅ 修正 API 调用计数：活动列表单独计算，每活动 3 次调用
- ✅ 实现动态限频检测：从响应头自动获取实际限额
- ✅ 同步服务器使用量：每 5 个活动校准一次本地计数器
- ✅ 优化预览输出：显示详细的 API 调用分解和限额信息
- ✅ 更新性能基准：基于新的计数方式和动态限额
