# Strava 历史数据同步说明

## 已完成的优化

### 1. 限频保护增强
- **请求间隔**: 从 2 秒增加到 3 秒
- **最大重试次数**: 从 3 次增加到 5 次
- **指数退避**: 初始延迟 15 秒，每次翻倍
- **429 错误处理**: 遇到限频时等待 90 秒
- **请求计数器**: 跟踪所有 API 调用

### 2. 进度显示改进
- 每 50 个请求显示一次进度
- 每 10 个活动显示详细统计
- 结束时显示完整汇总报告

### 3. 错误处理优化
- 区分限频错误 (429) 和其他错误
- 单个活动失败不影响其他活动
- 自动回滚事务保证数据一致性

## 如何运行同步

### 方式一：使用封装脚本（推荐）

```powershell
# 进入项目目录
cd d:\fankangsong\running_page

# 同步所有历史数据（包括 laps 和 streams）
python run_strava_sync.py --historical

# 只同步最近7天
python run_strava_sync.py
```

### 方式二：直接使用 strava_sync.py

```powershell
# 从 .env 文件读取凭证
python run_page/strava_sync.py `
  119504 `
  c2cbf2f6f8cf9475c034310c401859b4ffc62fb9 `
  20479ea68cd9d401bb56ded347a3cf446ea024de `
  --historical
```

## 预期行为

### 增量同步（默认）
- 只同步最近 7 天的新活动
- 速度快，API 调用少
- 适合日常更新

### 全量同步（--historical）
- 同步所有历史活动
- 每个活动都会获取：
  - 基础信息（距离、时间、配速等）
  - 详细数据（卡路里、设备、心率等）
  - **圈数数据**（每公里分解）
  - **数据流**（心率/配速/海拔时序）
- 首次运行可能需要较长时间

## 限频说明

Strava API 限制：
- ✅ 当前配置：**每 3 秒 1 个请求**（约 20 次/分钟）
- 📊 Strava 限制：**600 次/15 分钟**，**30,000 次/天**
- 🛡️ 安全余量：当前配置远低于限制

如果遇到限频：
1. 脚本会自动等待 90 秒后重试
2. 最多重试 5 次
3. 失败的活动会跳过，继续下一个

## 监控输出

同步时会看到类似输出：
```
Access ok
Start syncing
📊 Mode: Full historical sync (all activities)
+..!++...+
[10 processed] (+7 new, .2 updated, !1 errors) | Requests: 30
..........................................
============================================================
✅ Sync completed!
   Total activities fetched: 150
   New activities synced: 120
   Existing activities updated: 25
   Skipped (non-running): 5
   Errors: 0
   Total API requests: 450
============================================================
```

符号说明：
- `+` 新活动
- `.` 已存在活动（更新）
- `!` 错误（跳过）

## 同步后数据

同步完成后，分段数据会保存在：
- **数据库**: `run_page/data.db`
  - `activities` 表 - 活动基础信息
  - `activity_laps` 表 - 每公里分解
  - `activity_streams` 表 - 时序曲线数据
- **前端**: `src/static/activities.json`（需要重新构建前端）

重新构建前端以使用新数据：
```powershell
pnpm build
```

## 故障排除

### 问题：SSL/网络连接错误（当前日志）

**错误特征**：
```
SSLError(SSLEOFError(...EOF occurred in violation of protocol...))
ProxyError('Cannot connect to proxy.')
ConnectionError
```

**原因分析**：
- 🌐 **代理/防火墙干扰** - 公司网络或代理服务器拦截 HTTPS 连接
- 🔒 **SSL 证书问题** - 本地 SSL 证书过时或损坏
- 📡 **网络不稳定** - WiFi 信号弱或路由器问题
- 🚫 **Strava API 暂时不可用** - 服务端波动

**解决方案**：

1. **检查网络连接**
   ```powershell
   # 测试能否访问 Strava
   curl https://www.strava.com/api/v3/athlete
   ```

2. **禁用 VPN/代理**（如果使用）
   - 临时关闭系统代理
   - 或在浏览器中直接访问 Strava 确认连接正常

3. **增加重试延迟**（已自动处理）
   - 脚本现已针对网络错误优化
   - 首次网络错误会等待 30s → 60s → 120s（带抖动）
   - 比原来的 15s → 30s → 60s 更保守

4. **更换网络环境**
   - 尝试使用手机热点
   - 或切换到其他 WiFi 网络

5. **手动跳过失败的活动**
   - 如果个别活动持续失败，记录其 ID
   - 同步完成后可以单独处理

**脚本已优化的行为**：
- ✅ 自动识别 SSL/Proxy/Connection 错误
- ✅ 使用更长的初始延迟（30 秒 vs 15 秒）
- ✅ 添加随机抖动避免同时重试
- ✅ 首次错误时提示检查网络

---

### 问题：认证失败
```
检查 .env 文件中的 STRAVA_REFRESH_TOKEN 是否过期
需要重新获取 refresh token
```

### 问题：大量超时
```
可能是网络问题或 Strava API 不稳定
脚本会自动重试，可以稍后再次运行
```

### 问题：部分活动缺失
```
检查是否有非跑步类型的活动被过滤
或者 Strava 中该活动的隐私设置
```
