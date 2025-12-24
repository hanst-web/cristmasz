#!/usr/bin/env node

/**
 * 照片诊断工具
 * 检查照片文件是否存在、格式是否正确，并提供修复建议
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PHOTOS_DIR = path.join(__dirname, 'public', 'photos');
const TOTAL_PHOTOS = 32; // top.jpg + 1-31.jpg

function checkPhotos() {
  console.log('🔍 开始检查照片文件...\n');
  
  // 检查目录是否存在
  if (!fs.existsSync(PHOTOS_DIR)) {
    console.error(`❌ 错误：目录 ${PHOTOS_DIR} 不存在！`);
    console.log('\n💡 解决方案：');
    console.log('  1. 创建 public/photos/ 目录');
    console.log('  2. 将你的照片放入该目录');
    console.log('  3. 确保文件名格式正确（top.jpg, 1.jpg, 2.jpg, ..., 31.jpg）\n');
    return false;
  }
  
  // 获取所有文件
  const allFiles = fs.readdirSync(PHOTOS_DIR);
  const imageFiles = allFiles.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  });
  
  console.log(`📁 目录：${PHOTOS_DIR}`);
  console.log(`📊 找到 ${allFiles.length} 个文件（其中 ${imageFiles.length} 个是图片）\n`);
  
  // 检查必需的文件
  const requiredFiles = ['top.jpg', ...Array.from({ length: 31 }, (_, i) => `${i + 1}.jpg`)];
  const missingFiles = [];
  const existingFiles = [];
  const wrongFormatFiles = [];
  
  requiredFiles.forEach(fileName => {
    const filePath = path.join(PHOTOS_DIR, fileName);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const ext = path.extname(fileName).toLowerCase();
      
      // 检查文件大小（如果为0，可能是损坏的）
      if (stats.size === 0) {
        console.warn(`⚠️  ${fileName}: 文件大小为 0（可能已损坏）`);
        wrongFormatFiles.push(fileName);
      } else {
        existingFiles.push(fileName);
        console.log(`✅ ${fileName} (${(stats.size / 1024).toFixed(2)} KB)`);
      }
    } else {
      missingFiles.push(fileName);
      console.error(`❌ ${fileName}: 文件不存在`);
    }
  });
  
  // 检查是否有额外的文件
  const extraFiles = imageFiles.filter(file => !requiredFiles.includes(file));
  if (extraFiles.length > 0) {
    console.log(`\n📋 发现额外的图片文件（这些文件不会被使用）：`);
    extraFiles.forEach(file => {
      console.log(`   - ${file}`);
    });
  }
  
  // 总结
  console.log('\n' + '='.repeat(50));
  console.log('📊 检查结果总结：');
  console.log(`  ✅ 存在的文件：${existingFiles.length}/${TOTAL_PHOTOS}`);
  console.log(`  ❌ 缺失的文件：${missingFiles.length}/${TOTAL_PHOTOS}`);
  if (wrongFormatFiles.length > 0) {
    console.log(`  ⚠️  有问题的文件：${wrongFormatFiles.length}`);
  }
  console.log('='.repeat(50) + '\n');
  
  // 提供修复建议
  if (missingFiles.length > 0) {
    console.log('💡 修复建议：');
    console.log('  1. 如果照片数量不足，可以：');
    console.log('     - 重复使用某些照片');
    console.log('     - 或者修改代码中的 TOTAL_NUMBERED_PHOTOS 值');
    console.log('  2. 使用重命名脚本自动处理：');
    console.log('     node rename-photos.js\n');
  }
  
  if (wrongFormatFiles.length > 0) {
    console.log('💡 文件问题修复：');
    console.log('  1. 检查文件是否损坏');
    console.log('  2. 尝试重新保存或转换图片格式\n');
  }
  
  // 检查浏览器缓存问题
  console.log('🌐 如果照片已更新但仍不显示，可能是浏览器缓存问题：');
  console.log('  1. 硬刷新页面：');
  console.log('     - Windows/Linux: Ctrl + Shift + R 或 Ctrl + F5');
  console.log('     - Mac: Cmd + Shift + R');
  console.log('  2. 清除浏览器缓存');
  console.log('  3. 重启开发服务器：');
  console.log('     - 停止当前服务器 (Ctrl+C)');
  console.log('     - 重新运行 npm run dev\n');
  
  // 检查开发服务器
  console.log('🖥️  开发服务器检查：');
  console.log('  1. 确保 Vite 开发服务器正在运行');
  console.log('  2. 检查浏览器控制台（F12）是否有错误信息');
  console.log('  3. 查看 Network 标签，检查照片请求是否成功（状态码应为 200）\n');
  
  return missingFiles.length === 0 && wrongFormatFiles.length === 0;
}

// 运行检查
try {
  const success = checkPhotos();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('❌ 发生错误：', error.message);
  process.exit(1);
}

