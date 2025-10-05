# 🚀 دليل النشر السريع - نظام الإنذار المبكر للاستدعاءات الغذائية

## المتطلبات الأساسية

```bash
# تثبيت Firebase CLI
npm install -g firebase-tools

# تسجيل الدخول
firebase login
```

---

## 📋 الخطوات بالتفصيل

### 1️⃣ إنشاء مشروع Firebase

1. اذهب إلى: https://console.firebase.google.com
2. انقر على **"Add project"**
3. اكتب اسم المشروع: `food-recalls-early-warning-qatar`
4. اتبع الخطوات لإنشاء المشروع

### 2️⃣ إعداد Firestore Database

1. في Firebase Console → **"Firestore Database"**
2. انقر على **"Create database"**
3. اختر **"Start in test mode"**
4. اختر المنطقة الأقرب (مثل: `europe-west3`)

### 3️⃣ إعداد Cloud Messaging (FCM)

1. اذهب إلى **Project Settings** ⚙️
2. انتقل إلى تبويب **"Cloud Messaging"**
3. في قسم **"Web configuration"**:
   - انقر على **"Generate key pair"**
   - احفظ الـ **VAPID key**

4. في تبويب **"General"**:
   - احفظ **Project ID**
   - احفظ **Web API Key**
   - احفظ **App ID**
   - احفظ **Messaging Sender ID**

### 4️⃣ تحديث ملفات التكوين

#### أ) تحديث `scripts/firebase-config.js`

```javascript
// استبدل هذه القيم بالقيم الحقيقية من Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyC...", // من Project Settings > General
  authDomain: "food-recalls-early-warning-qatar.firebaseapp.com",
  projectId: "food-recalls-early-warning-qatar",
  storageBucket: "food-recalls-early-warning-qatar.appspot.com",
  messagingSenderId: "123456789", // من Cloud Messaging
  appId: "1:123456789:web:abc123" // من General Settings
};

const VAPID_KEY = "BNdVr..."; // من Cloud Messaging > Web Push certificates
```

#### ب) تحديث `public/firebase-messaging-sw.js`

```javascript
// استبدل نفس القيم هنا أيضاً
firebase.initializeApp({
  apiKey: "AIzaSyC...",
  authDomain: "food-recalls-early-warning-qatar.firebaseapp.com",
  projectId: "food-recalls-early-warning-qatar",
  storageBucket: "food-recalls-early-warning-qatar.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
});
```

### 5️⃣ تهيئة Firebase في المشروع

```bash
# في مجلد المشروع
cd food-recalls-early-warning-qatar

# تهيئة Firebase
firebase init

# اختر:
# ✅ Functions
# ✅ Firestore
# ✅ Hosting

# اختر المشروع الذي أنشأته
# اختر JavaScript للـ Functions
# اختر Yes لـ ESLint
# اختر public كـ public directory
# اختر Yes لـ single-page app
# اختر No لـ overwrite index.html
```

### 6️⃣ نشر Cloud Functions

```bash
# الانتقال إلى مجلد Functions
cd functions

# تثبيت الحزم
npm install

# العودة إلى الجذر
cd ..

# نشر Functions
firebase deploy --only functions
```

### 7️⃣ نشر قواعد Firestore

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 8️⃣ نشر الواجهة

```bash
firebase deploy --only hosting
```

---

## ✅ التحقق من النشر

### اختبار الموقع
```bash
# الموقع سيكون متاح على:
https://food-recalls-early-warning-qatar.web.app
```

### اختبار API
```bash
# اختبار جلب البيانات
curl "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls"

# اختبار تحديث البيانات
curl -X POST "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls"

# اختبار الإشعار التجريبي
curl -X POST "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/sendTestNotification"
```

### اختبار الإشعارات
1. افتح الموقع في المتصفح
2. اقبل إذن الإشعارات
3. انقر على **"إشعار تجريبي"**
4. يجب أن تصل إشعار مع صوت

---

## 🔧 استكشاف الأخطاء

### مشكلة: Functions لا تعمل
```bash
# تحقق من السجلات
firebase functions:log

# إعادة نشر
firebase deploy --only functions
```

### مشكلة: الإشعارات لا تعمل
1. تأكد من تحديث VAPID key في الملفين
2. تأكد من تسجيل Service Worker
3. تحقق من إعدادات المتصفح

### مشكلة: البيانات لا تظهر
1. تحقق من قواعد Firestore
2. تحقق من عمل Functions
3. تحقق من Console للأخطاء

---

## 📊 مراقبة النظام

### في Firebase Console:
- **Functions**: مراقبة تنفيذ الدوال
- **Firestore**: مراقبة قاعدة البيانات
- **Hosting**: مراقبة الزيارات
- **Cloud Messaging**: مراقبة الإشعارات

### سجلات مفيدة:
```bash
# عرض سجلات Functions
firebase functions:log

# عرض سجلات دالة معينة
firebase functions:log --only recalls
```

---

## 🎯 النتيجة النهائية

بعد اكتمال النشر، ستحصل على:

✅ **موقع ويب متقدم** على Firebase Hosting  
✅ **تحديث تلقائي** كل 20 دقيقة من 5 مصادر عالمية  
✅ **إشعارات فورية** للاستدعاءات الجديدة  
✅ **واجهة عربية** سهلة الاستخدام  
✅ **مشاركة واتساب** للتنبيهات  
✅ **تطبيق PWA** قابل للتثبيت  

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. راجع سجلات Firebase Console
2. تحقق من ملفات التكوين
3. تأكد من صحة المفاتيح
4. اختبر كل خطوة على حدة

**الموقع النهائي**: `https://food-recalls-early-warning-qatar.web.app`
