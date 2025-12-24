#!/usr/bin/env node

/**
 * 照片重命名工具
 * 将你的照片文件重命名为项目需要的格式：top.jpg, 1.jpg, 2.jpg, ..., 31.jpg
 * 
 * 使用方法：
 * 1. 将你的照片文件放在 public/photos/ 目录下（可以是任意文件名）
 * 2. 运行此脚本：node rename-photos.js
 * 3. 脚本会自动将照片重命名为正确的格式
 */

const fs = require('fs');
const path = require('path');

const PHOTOS_DIR = path.join(__dirname, 'public', 'photos');
const TOTAL_PHOTOS = 32; // top.jpg + 1-31.jpg

// 支持的图片格式
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG', '.WEBP'];

function getAllImageFiles(dir) {
  const files = fs.readdirSync(dir);
  return files
    .filter(file => {
      const ext = path.extname(file);
      return IMAGE_EXTENSIONS.includes(ext);
    })
    .map(file => ({
      name: file,
      path: path.join(dir, file),
      ext: path.extname(file).toLowerCase()
    }));
}

function renamePhotos() {
  console.log('🎄 开始重命名照片文件...\n');
  
  // 检查目录是否存在
  if (!fs.existsSync(PHOTOS_DIR)) {
    console.error(`❌ 错误：目录 ${PHOTOS_DIR} 不存在！`);
    console.log('请先创建 public/photos/ 目录，并将你的照片放入其中。');
    process.exit(1);
  }
  
  // 获取所有图片文件
  const imageFiles = getAllImageFiles(PHOTOS_DIR);
  
  if (imageFiles.length === 0) {
    console.error('❌ 错误：在 public/photos/ 目录下没有找到任何图片文件！');
    console.log('支持的格式：.jpg, .jpeg, .png, .webp');
    process.exit(1);
  }
  
  console.log(`找到 ${imageFiles.length} 张照片\n`);
  
  // 如果照片数量不足，给出警告
  if (imageFiles.length < TOTAL_PHOTOS) {
    console.log(`⚠️  警告：你只有 ${imageFiles.length} 张照片，但项目需要 ${TOTAL_PHOTOS} 张（top.jpg + 1-31.jpg）`);
    console.log('照片数量不足时，会重复使用某些照片。\n');
  }
  
  // 创建备份目录
  const backupDir = path.join(PHOTOS_DIR, 'backup_' + Date.now());
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`📦 已创建备份目录：${backupDir}\n`);
  
  // 备份现有文件
  imageFiles.forEach(file => {
    const backupPath = path.join(backupDir, file.name);
    fs.copyFileSync(file.path, backupPath);
  });
  console.log('✅ 已备份所有原始文件\n');
  
  // 删除可能存在的旧的目标文件
  const targetFiles = ['top.jpg', ...Array.from({ length: 31 }, (_, i) => `${i + 1}.jpg`)];
  targetFiles.forEach(fileName => {
    const filePath = path.join(PHOTOS_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
  
  // 重命名文件
  let photoIndex = 0;
  const renamed = [];
  
  // 首先处理 top.jpg
  if (imageFiles.length > 0) {
    const sourceFile = imageFiles[photoIndex];
    const targetPath = path.join(PHOTOS_DIR, 'top.jpg');
    
    // 如果是 jpg 格式，直接重命名；否则需要转换（这里只是复制，实际转换需要图片处理库）
    if (sourceFile.ext === '.jpg' || sourceFile.ext === '.jpeg') {
      fs.renameSync(sourceFile.path, targetPath);
    } else {
      // 对于非 jpg 格式，复制文件并提示用户需要手动转换
      fs.copyFileSync(sourceFile.path, targetPath);
      console.log(`⚠️  ${sourceFile.name} -> top.jpg (需要转换为 JPG 格式)`);
    }
    
    renamed.push({ from: sourceFile.name, to: 'top.jpg' });
    photoIndex++;
  }
  
  // 然后处理 1.jpg 到 31.jpg
  for (let i = 1; i <= 31; i++) {
    if (photoIndex >= imageFiles.length) {
      // 如果照片不够，重复使用
      photoIndex = 1; // 从第二张开始重复（跳过 top.jpg）
    }
    
    const sourceFile = imageFiles[photoIndex % imageFiles.length];
    const targetPath = path.join(PHOTOS_DIR, `${i}.jpg`);
    
    if (sourceFile.ext === '.jpg' || sourceFile.ext === '.jpeg') {
      // 如果目标文件已存在（可能是重复使用），先删除
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
      fs.renameSync(sourceFile.path, targetPath);
    } else {
      fs.copyFileSync(sourceFile.path, targetPath);
      console.log(`⚠️  ${sourceFile.name} -> ${i}.jpg (需要转换为 JPG 格式)`);
    }
    
    renamed.push({ from: sourceFile.name, to: `${i}.jpg` });
    photoIndex++;
  }
  
  // 显示重命名结果
  console.log('\n✅ 重命名完成！\n');
  console.log('重命名结果：');
  renamed.forEach(({ from, to }) => {
    console.log(`  ${from} -> ${to}`);
  });
  
  console.log(`\n📝 提示：`);
  console.log(`  - 原始文件已备份到：${backupDir}`);
  console.log(`  - 如果某些照片不是 JPG 格式，建议使用图片编辑工具转换为 JPG`);
  console.log(`  - 确保所有照片都是有效的图片文件\n`);
}

// 运行脚本
try {
  renamePhotos();
} catch (error) {
  console.error('❌ 发生错误：', error.message);
  process.exit(1);
}

