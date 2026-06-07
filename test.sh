#!/bin/bash

# Running Page 数据同步测试脚本
# 使用方法: ./test.sh

set -e

# 切换到项目根目录
cd "$(dirname "$0")"

# 检查环境变量
if [ -z "$STRAVA_CLIENT_ID" ] || [ -z "$STRAVA_CLIENT_SECRET" ] || [ -z "$STRAVA_REFRESH_TOKEN" ]; then
    echo "错误: 请先设置 Strava 环境变量"
    echo ""
    echo "示例:"
    echo "  export STRAVA_CLIENT_ID='your_client_id'"
    echo "  export STRAVA_CLIENT_SECRET='your_client_secret'"
    echo "  export STRAVA_REFRESH_TOKEN='your_refresh_token'"
    echo ""
    echo "然后运行: ./test.sh"
    exit 1
fi

echo "=========================================="
echo "Running Page - Strava 数据同步"
echo "=========================================="
echo ""

# 检查 Python 依赖
echo "检查 Python 依赖..."
python3 -c "import stravalib; import arrow; import sqlalchemy; import yaml" 2>/dev/null || {
    echo "安装缺失的依赖..."
    pip3 install --break-system-packages stravalib arrow sqlalchemy pyyaml geopy polyline s2sphere gpxpy haversine svgwrite colour appdirs tcxreader timezonefinder garmin_fit_sdk cloudscraper tenacity lxml httpx aiofiles rich
}

echo "依赖检查完成"
echo ""

# 运行 Strava 同步
echo "开始同步 Strava 数据..."
echo ""

cd run_page
python3 strava_sync.py "${STRAVA_CLIENT_ID}" "${STRAVA_CLIENT_SECRET}" "${STRAVA_REFRESH_TOKEN}"

echo ""
echo "=========================================="
echo "同步完成!"
echo "=========================================="
echo ""
echo "数据已保存到:"
echo "  - run_page/data.db (SQLite 数据库)"
echo "  - src/static/activities.json (前端数据)"
echo ""
echo "下一步:"
echo "  1. 运行 'pnpm develop' 启动开发服务器"
echo "  2. 访问 http://localhost:5173 查看跑步详情页"
echo "  3. 点击任意跑步活动查看新增的心率曲线和每公里分解表格"