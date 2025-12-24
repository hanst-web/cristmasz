#!/bin/bash

# 准备提交脚本 - 只添加代码相关文件，排除照片和音乐

echo "🚀 准备提交 BGM 功能到仓库..."
echo ""

# 检查是否在正确的分支
CURRENT_BRANCH=$(git branch --show-current)
echo "当前分支: $CURRENT_BRANCH"
echo ""

# 添加代码文件
echo "📝 添加代码文件..."
git add src/App.tsx
git add MUSIC_SETUP.md
git add CONTRIBUTING.md
git add check-photos.js
git add compress-photos.js
git add rename-photos.js
git add .gitignore

# 检查 README.md 是否有相关更改（可选）
read -p "是否包含 README.md 的更改？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add README.md
fi

echo ""
echo "✅ 已添加以下文件："
git status --short

echo ""
echo "📋 准备提交，提交信息："
echo "feat: Add background music support"
echo ""
echo "- Add music player control button in UI"
echo "- Add music setup documentation"
echo "- Add photo compression and checking tools"
echo "- Update photo count to support up to 142 photos"
echo "- Add .gitignore rules for user media files"
echo ""

read -p "确认提交？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit -m "feat: Add background music support

- Add music player control button in UI
- Add music setup documentation  
- Add photo compression and checking tools
- Update photo count to support up to 142 photos
- Add .gitignore rules for user media files"
    
    echo ""
    echo "✅ 提交完成！"
    echo ""
    echo "📤 下一步："
    echo "1. Fork 原仓库到你的 GitHub 账号"
    echo "2. 添加你的 fork 作为 remote:"
    echo "   git remote add myfork https://github.com/你的用户名/christmas-tree.git"
    echo "3. 推送到你的 fork:"
    echo "   git push myfork $CURRENT_BRANCH"
    echo "4. 在 GitHub 上创建 Pull Request"
else
    echo "❌ 已取消提交"
fi

