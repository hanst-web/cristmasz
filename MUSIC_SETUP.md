# 🎵 背景音乐设置指南

## 📝 快速开始

1. **准备音乐文件**
   - 将你的音乐文件命名为 `bgm.mp3`
   - 放在 `public/` 目录下（与 `photos/` 同级）

2. **文件位置**
   ```
   public/
   ├── bgm.mp3          ← 音乐文件放这里
   ├── photos/
   └── vite.svg
   ```

3. **刷新页面**
   - 刷新浏览器后，右下角会出现音乐控制按钮
   - 点击 🔊 按钮即可播放/暂停音乐

## 🎶 推荐音乐

### 经典圣诞歌曲（推荐）

1. **Carol of the Bells（钟声颂歌）** ⭐ 强烈推荐
   - 氛围感强，适合3D场景
   - 纯音乐版本更佳
   - 推荐版本：Trans-Siberian Orchestra 或 Lindsey Stirling

2. **Silent Night（平安夜）**
   - 舒缓、温馨
   - 适合安静的回忆场景

3. **Jingle Bells（铃儿响叮当）**
   - 经典、欢快
   - 适合节日氛围

4. **We Wish You a Merry Christmas**
   - 传统、温暖
   - 适合家庭聚会场景

### 现代/氛围音乐

5. **Deck the Halls（装饰大厅）**
   - 节奏感强
   - 适合动态场景

6. **The First Noel（第一个圣诞节）**
   - 优雅、庄重
   - 适合正式场合

### 纯音乐/器乐版本推荐

- **钢琴版圣诞歌曲**：安静、优雅
- **管弦乐版**：大气、有层次感
- **电子/混音版**：现代、动感

## 📥 如何获取音乐

### 方法一：免费音乐网站
- **Free Music Archive**: https://freemusicarchive.org/
- **Incompetech**: https://incompetech.com/
- **YouTube Audio Library**: https://www.youtube.com/audiolibrary
- **Pixabay Music**: https://pixabay.com/music/

搜索关键词：
- "Christmas music"
- "Carol of the Bells"
- "Silent Night instrumental"
- "Jingle Bells"

### 方法二：自己转换
如果你有喜欢的音乐文件：
1. 确保是 MP3 格式（或转换为 MP3）
2. 重命名为 `bgm.mp3`
3. 放到 `public/` 目录

### 方法三：使用在线转换工具
- 将音频文件转换为 MP3
- 建议比特率：128-192 kbps（平衡质量和文件大小）

## ⚙️ 技术说明

- **格式要求**：MP3（推荐）或 WAV
- **文件大小**：建议 2-5 MB（避免加载过慢）
- **播放方式**：循环播放
- **控制方式**：点击右下角音乐按钮

## 🎛️ 自定义音乐路径

如果你想使用不同的音乐文件名，可以修改 `src/App.tsx` 中的这一行：

```typescript
<audio
    ref={audioRef}
    src="/bgm.mp3"  // ← 修改这里的路径
    loop
    ...
/>
```

例如：
- `/music/christmas.mp3`
- `/bgm-silent-night.mp3`

## 💡 提示

1. **浏览器自动播放限制**：某些浏览器需要用户交互后才能播放音频，所以需要点击按钮
2. **文件大小**：如果音乐文件太大，可能影响页面加载速度
3. **版权注意**：如果用于公开项目，请确保音乐有合适的授权

## 🎄 推荐组合

**温馨回忆场景**：
- Silent Night（钢琴版）
- The First Noel（器乐版）

**节日欢庆场景**：
- Jingle Bells
- We Wish You a Merry Christmas

**3D视觉场景**（最推荐）：
- Carol of the Bells（任何版本都很棒！）

---

祝你使用愉快！🎅✨

