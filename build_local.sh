#!/bin/bash

# 本地构建脚本（不连接远程服务器）

cd "$(dirname "$0")"

echo '=== 开始本地构建 ==='

# 1. 导入 Apple Health 数据
echo '>>> 导入运动数据...'
python run_page/apple_health_sync.py --force

# 2. 构建前端
echo '>>> 构建前端...'
pnpm build

# 3. 提交变更
echo '>>> 提交变更...'
git add -A
git commit -m 'sync and update data' || echo '无变更需要提交'
git push

echo '=== 本地构建完成 ==='
