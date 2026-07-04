#!/bin/bash

# 本地构建脚本（不连接远程服务器）
# 遇到错误自动退出

set -e  # 命令失败时立即退出
set -o pipefail  # 管道命令中任一命令失败则整个管道失败

# 错误处理函数
handle_error() {
    echo ""
    echo "❌ 构建失败！错误发生在第 $1 行"
    echo "请检查上面的错误信息"
    exit 1
}

# 设置错误捕获
trap 'handle_error $LINENO' ERR

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
git push || echo '推送失败，可能需要先 pull'

echo '=== 本地构建完成 ==='

# 4. 同步代码到网站服务器
echo '>>> 同步到 COS...'
coscli sync -r dist/ cos://hk/running/

echo '>>> 发送通知...'
notify 'running page 发布完成 ✅'

echo ""
echo "✅ 所有步骤完成！"
