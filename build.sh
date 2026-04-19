#!/bin/bash

PATH=/root/.volta/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin

cd /root/share/code-server/workspace/running_page

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

git pull

echo 'start syncing strava data.'

echo "python run_page/strava_sync.py ${STRAVA_CLIENT_ID} ${STRAVA_CLIENT_SECRET} ${STRAVA_REFRESH_TOKEN}"
python run_page/strava_sync.py ${STRAVA_CLIENT_ID} ${STRAVA_CLIENT_SECRET} ${STRAVA_REFRESH_TOKEN}


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

coscli cp -r dist cos://hk//running
notify 'running page 发布完成 ✅'

