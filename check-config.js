#!/usr/bin/env node

/**
 * سكريبت للتحقق من صحة التكوين قبل النشر
 * تشغيل: node check-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 فحص تكوين المشروع...\n');

let hasErrors = false;

// قائمة الملفات المطلوب فحصها
const filesToCheck = [
  {
    path: 'scripts/firebase-config.js',
    name: 'ملف تكوين Firebase الرئيسي'
  },
  {
    path: 'public/firebase-messaging-sw.js',
    name: 'Service Worker للإشعارات'
  }
];

// القيم الافتراضية التي يجب استبدالها
const defaultValues = [
  'YOUR_API_KEY',
  'YOUR_SENDER_ID',
  'YOUR_APP_ID',
  'YOUR_VAPID_KEY'
];

// فحص كل ملف
filesToCheck.forEach(file => {
  console.log(`📄 فحص ${file.name}...`);
  
  if (!fs.existsSync(file.path)) {
    console.log(`❌ الملف غير موجود: ${file.path}`);
    hasErrors = true;
    return;
  }
  
  const content = fs.readFileSync(file.path, 'utf8');
  
  // فحص القيم الافتراضية
  const foundDefaults = defaultValues.filter(value => content.includes(value));
  
  if (foundDefaults.length > 0) {
    console.log(`❌ تم العثور على قيم افتراضية لم يتم تحديثها:`);
    foundDefaults.forEach(value => {
      console.log(`   - ${value}`);
    });
    hasErrors = true;
  } else {
    console.log(`✅ ${file.name} - تم التكوين بشكل صحيح`);
  }
  
  console.log('');
});

// فحص ملفات Firebase الأساسية
const firebaseFiles = [
  'firebase.json',
  'firestore.rules',
  '.firebaserc'
];

console.log('📋 فحص ملفات Firebase الأساسية...');
firebaseFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} موجود`);
  } else {
    console.log(`❌ ${file} غير موجود`);
    hasErrors = true;
  }
});

// فحص مجلد Functions
console.log('\n🔧 فحص مجلد Functions...');
if (fs.existsSync('functions/package.json')) {
  console.log('✅ functions/package.json موجود');
  
  // فحص تثبيت dependencies
  if (fs.existsSync('functions/node_modules')) {
    console.log('✅ Dependencies مثبتة في مجلد Functions');
  } else {
    console.log('⚠️  Dependencies غير مثبتة - تشغيل: cd functions && npm install');
  }
} else {
  console.log('❌ functions/package.json غير موجود');
  hasErrors = true;
}

// فحص الملفات الأساسية للواجهة
console.log('\n🌐 فحص ملفات الواجهة...');
const frontendFiles = [
  'public/index.html',
  'public/manifest.json',
  'scripts/app.js',
  'styles/main.css'
];

frontendFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} موجود`);
  } else {
    console.log(`❌ ${file} غير موجود`);
    hasErrors = true;
  }
});

// النتيجة النهائية
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ تم العثور على مشاكل في التكوين!');
  console.log('\n📋 قائمة المهام:');
  console.log('1. تحديث المفاتيح في scripts/firebase-config.js');
  console.log('2. تحديث المفاتيح في public/firebase-messaging-sw.js');
  console.log('3. تثبيت dependencies: cd functions && npm install');
  console.log('4. تشغيل الفحص مرة أخرى: node check-config.js');
  process.exit(1);
} else {
  console.log('✅ جميع التكوينات صحيحة!');
  console.log('\n🚀 يمكنك الآن نشر المشروع:');
  console.log('   firebase deploy');
  console.log('\n🌐 الموقع سيكون متاح على:');
  console.log('   https://food-recalls-early-warning-qatar.web.app');
}

// معلومات إضافية
console.log('\n📊 معلومات المشروع:');
console.log(`📁 اسم المشروع: food-recalls-early-warning-qatar`);
console.log(`🔗 Firebase Console: https://console.firebase.google.com/project/food-recalls-early-warning-qatar`);
console.log(`📱 PWA: قابل للتثبيت كتطبيق`);
console.log(`🔔 الإشعارات: FCM + Service Worker`);
console.log(`🌍 المصادر: FDA, Health Canada, SFDA, FSANZ, RASFF`);
console.log(`⏰ التحديث: كل 20 دقيقة`);
