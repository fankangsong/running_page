#!/bin/bash
set -e

# 获取脚本所在目录（兼容软链接）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# 检测 Python 命令（需要 3.10+，支持 dict | None 语法）
# 优先使用 mise 安装的 Python（避免 Homebrew 的 PEP 668 限制）
for py in ~/.local/share/mise/installs/python/*/bin/python3 python3.13 python3.12 python3.11 python3.10 python3 python; do
  if command -v "$py" &> /dev/null; then
    ver=$("$py" -c 'import sys; print(sys.version_info[:2])' 2>/dev/null)
    major=$(echo "$ver" | grep -o '[0-9]*' | head -1)
    minor=$(echo "$ver" | grep -o '[0-9]*' | tail -1)
    if [ "$major" -ge 3 ] && [ "$minor" -ge 10 ]; then
      PYTHON="$py"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  echo "Error: Python 3.10+ not found"
  exit 1
fi
echo "Using $PYTHON ($($PYTHON --version))"

git pull

echo 'start syncing strava data.'

$PYTHON run_page/apple_health_sync.py

echo 'start syncing interval.icu data.'
$PYTHON run_page/interval_icu_sync.py --only-run

# echo "python run_page/strava_sync.py ${STRAVA_CLIENT_ID} ${STRAVA_CLIENT_SECRET} ${STRAVA_REFRESH_TOKEN}"
# python run_page/strava_sync.py ${STRAVA_CLIENT_ID} ${STRAVA_CLIENT_SECRET} ${STRAVA_REFRESH_TOKEN}


# 生成 Grid 类型的 SVG
# 包含：
# - assets/grid.svg (所有年份的总览)
# - assets/grid_YYYY.svg (每年的详情)
# echo "Generating Grid SVG..."
# python run_page/gen_svg.py --from-db --type grid --output assets/grid.svg

# 生成 GitHub 类型的 SVG
# 包含：
# - assets/github.svg (所有年份的贡献图)
# - assets/github_YYYY.svg (每年的贡献图)
# echo "Generating GitHub SVG..."
# python run_page/gen_svg.py --from-db --type github --output assets/github.svg

# 生成 Circular 类型的 SVG
# 包含：
# - assets/year_YYYY.svg (每年的环形图)
# 注意：circular 类型会忽略 output 参数中的文件名，直接在 assets 目录下生成 year_YYYY.svg
# echo "Generating Circular SVG..."
# python run_page/gen_svg.py --from-db --type circular --output assets/year.svg

# echo "All SVG assets generated successfully."
echo 'start building running page.'

pnpm build

echo 'running page build successfully.'

git add .
git commit -m 'sync and update data'
git push

# coscli cp -r dist cos://hk//running
coscli sync -r dist/ cos://hk/running/
notify 'running page 发布完成 ✅'

