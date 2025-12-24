#!/usr/bin/env node

/**
 * 使用 ffmpeg 批量压缩照片
 * 将照片压缩到合适的体积（目标：每张 < 500KB）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PHOTOS_DIR = path.join(__dirname, 'public', 'photos');
const MAX_SIZE_KB = 500; // 目标最大文件大小（KB）
const QUALITY = 6; // JPG 质量 (1-31, 越小质量越高，建议 5-8)

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function compressPhoto(inputPath, outputPath, quality = QUALITY) {
  try {
    // 使用 ffmpeg 压缩图片
    // -i: 输入文件
    // -vf scale=1920:-1: 如果宽度超过 1920px 则缩放（保持宽高比）
    // -q:v: JPG 质量 (1-31, 越小质量越高)
    // -y: 覆盖输出文件
    const command = `ffmpeg -i "${inputPath}" -vf "scale='min(1920,iw)':'min(1920,ih)':force_original_aspect_ratio=decrease" -q:v ${quality} -y "${outputPath}" 2>&1`;
    
    execSync(command, { encoding: 'utf-8' });
    return true;
  } catch (error) {
    console.error(`  ❌ 压缩失败: ${error.message}`);
    return false;
  }
}

function compressPhotos() {
  console.log('🖼️  开始压缩照片...\n');
  console.log(`📁 目录：${PHOTOS_DIR}`);
  console.log(`🎯 目标：每张照片 < ${MAX_SIZE_KB}KB`);
  console.log(`⚙️  质量设置：${QUALITY} (1-31, 越小质量越高)\n`);
  
  // 检查目录是否存在
  if (!fs.existsSync(PHOTOS_DIR)) {
    console.error(`❌ 错误：目录 ${PHOTOS_DIR} 不存在！`);
    process.exit(1);
  }
  
  // 获取所有 JPG 文件
  const files = fs.readdirSync(PHOTOS_DIR)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg'].includes(ext);
    })
    .map(file => path.join(PHOTOS_DIR, file))
    .filter(filePath => {
      const stats = fs.statSync(filePath);
      return stats.size > 0; // 排除空文件
    });
  
  if (files.length === 0) {
    console.error('❌ 没有找到需要压缩的照片文件！');
    process.exit(1);
  }
  
  console.log(`找到 ${files.length} 张照片\n`);
  
  // 创建备份目录
  const backupDir = path.join(PHOTOS_DIR, 'backup_original_' + Date.now());
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`📦 创建备份目录：${path.basename(backupDir)}\n`);
  
  // 备份所有原始文件
  files.forEach(filePath => {
    const fileName = path.basename(filePath);
    const backupPath = path.join(backupDir, fileName);
    fs.copyFileSync(filePath, backupPath);
  });
  console.log('✅ 已备份所有原始文件\n');
  
  // 创建临时目录用于压缩
  const tempDir = path.join(PHOTOS_DIR, 'temp_compressed');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  let successCount = 0;
  let skipCount = 0;
  
  // 压缩每张照片
  files.forEach((filePath, index) => {
    const fileName = path.basename(filePath);
    const originalSize = getFileSize(filePath);
    totalOriginalSize += originalSize;
    
    console.log(`[${index + 1}/${files.length}] 处理: ${fileName}`);
    console.log(`  原始大小: ${formatBytes(originalSize)}`);
    
    // 如果文件已经很小，跳过压缩
    if (originalSize < MAX_SIZE_KB * 1024) {
      console.log(`  ✅ 文件已足够小，跳过压缩`);
      skipCount++;
      totalCompressedSize += originalSize;
      return;
    }
    
    // 压缩到临时文件
    const tempPath = path.join(tempDir, fileName);
    const success = compressPhoto(filePath, tempPath, QUALITY);
    
    if (success) {
      const compressedSize = getFileSize(tempPath);
      const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);
      
      console.log(`  压缩后: ${formatBytes(compressedSize)} (减少 ${reduction}%)`);
      
      // 如果压缩后仍然太大，尝试更低的质量
      if (compressedSize > MAX_SIZE_KB * 1024) {
        console.log(`  ⚠️  文件仍然较大，尝试更高质量压缩...`);
        const lowerQuality = QUALITY + 2;
        compressPhoto(filePath, tempPath, lowerQuality);
        const newSize = getFileSize(tempPath);
        const newReduction = ((1 - newSize / originalSize) * 100).toFixed(1);
        console.log(`  二次压缩: ${formatBytes(newSize)} (减少 ${newReduction}%)`);
        totalCompressedSize += newSize;
      } else {
        totalCompressedSize += compressedSize;
      }
      
      // 替换原文件
      fs.renameSync(tempPath, filePath);
      successCount++;
    } else {
      console.log(`  ❌ 压缩失败，保留原文件`);
      totalCompressedSize += originalSize;
    }
    
    console.log('');
  });
  
  // 清理临时目录
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
  
  // 显示总结
  console.log('='.repeat(60));
  console.log('📊 压缩完成！');
  console.log('='.repeat(60));
  console.log(`✅ 成功压缩: ${successCount} 张`);
  console.log(`⏭️  跳过（已足够小）: ${skipCount} 张`);
  console.log(`📦 原始总大小: ${formatBytes(totalOriginalSize)}`);
  console.log(`📦 压缩后总大小: ${formatBytes(totalCompressedSize)}`);
  const totalReduction = ((1 - totalCompressedSize / totalOriginalSize) * 100).toFixed(1);
  console.log(`💾 总节省空间: ${totalReduction}%`);
  console.log(`📁 备份位置: ${backupDir}`);
  console.log('='.repeat(60));
  console.log('\n💡 提示：');
  console.log('  - 如果对压缩质量不满意，可以从备份目录恢复原文件');
  console.log('  - 建议在浏览器中测试照片显示效果');
  console.log('  - 如果照片仍然太大，可以手动调整 QUALITY 值（在脚本中）\n');
}

// 运行压缩
try {
  compressPhotos();
} catch (error) {
  console.error('❌ 发生错误：', error.message);
  process.exit(1);
}

