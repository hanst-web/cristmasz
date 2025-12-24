# 如何提交 BGM 功能到主仓库

## 📋 步骤说明

由于这是从别人的仓库 clone 的项目，你需要通过 Fork + Pull Request 的方式提交你的更改。

## 🚀 操作步骤

### 1. Fork 原仓库到你的 GitHub 账号

1. 访问原仓库：https://github.com/moleculemmeng020425/christmas-tree
2. 点击右上角的 **Fork** 按钮
3. 等待 Fork 完成

### 2. 添加你的 Fork 作为新的远程仓库

```bash
# 添加你的 fork 作为新的 remote（命名为 myfork）
git remote add myfork https://github.com/你的用户名/christmas-tree.git

# 查看所有远程仓库
git remote -v
```

### 3. 创建新分支（推荐）

```bash
# 创建一个新分支用于 BGM 功能
git checkout -b feature/add-bgm-support
```

### 4. 提交你的代码更改

**重要：只提交代码相关的文件，不要提交照片和音乐文件！**

```bash
# 添加代码文件
git add src/App.tsx
git add MUSIC_SETUP.md
git add check-photos.js
git add compress-photos.js
git add rename-photos.js
git add .gitignore

# 提交更改
git commit -m "feat: Add background music support

- Add music player control button in UI
- Add music setup documentation
- Add photo compression and checking tools
- Update photo count to support up to 142 photos
- Add .gitignore rules for user media files"
```

### 5. 推送到你的 Fork

```bash
# 推送到你的 fork 仓库
git push myfork feature/add-bgm-support
```

### 6. 创建 Pull Request

1. 访问你的 Fork：https://github.com/你的用户名/christmas-tree
2. 你会看到提示 "Compare & pull request"，点击它
3. 或者点击 **Pull requests** 标签，然后点击 **New pull request**
4. 填写 PR 说明：
   - **Title**: `Add background music support and photo management tools`
   - **Description**: 
     ```
     ## 新增功能
     - ✨ 添加背景音乐播放功能（带播放/暂停控制）
     - 📸 添加照片压缩工具（compress-photos.js）
     - 🔍 添加照片检查工具（check-photos.js）
     - 📝 添加音乐设置文档（MUSIC_SETUP.md）
     - 🔧 支持最多 142 张照片
     
     ## 技术细节
     - 在 UI 中添加音乐控制按钮
     - 支持循环播放
     - 添加照片文件管理工具
     - 更新 .gitignore 排除用户媒体文件
     ```

### 7. 等待仓库维护者审核

- 维护者会审查你的代码
- 可能会提出修改建议
- 审核通过后，你的代码就会被合并到主仓库

## 📝 提交清单

在提交 PR 之前，确保：

- [ ] 代码可以正常运行
- [ ] 没有提交个人照片文件（1-142.jpg）
- [ ] 没有提交音乐文件（bgm.mp3）
- [ ] 没有提交备份目录
- [ ] 只提交了代码和文档文件
- [ ] 提交信息清晰明了

## 🔄 如果原仓库有更新

如果原仓库在你 Fork 之后有新的更新，你可以同步：

```bash
# 从原仓库拉取最新更改
git fetch origin

# 合并到你的分支
git merge origin/main

# 解决可能的冲突后，再次推送
git push myfork feature/add-bgm-support
```

## 💡 提示

- **不要强制推送**到原仓库（你没有权限）
- **保持分支干净**，只包含相关的更改
- **写清晰的提交信息**，方便维护者理解
- **测试你的代码**，确保功能正常

---

祝你 PR 顺利通过！🎉

