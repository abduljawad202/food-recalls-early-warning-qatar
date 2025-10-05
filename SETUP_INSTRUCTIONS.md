# تعليمات إعداد نظام الإنذار المبكر للاستدعاءات الغذائية

## المتطلبات الأساسية

- حساب Firebase
- Node.js (الإصدار 18 أو أحدث)
- Firebase CLI

## خطوات الإعداد

### 1. إعداد Firebase Console

#### إنشاء المشروع
1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. انقر على "Add project"
3. اكتب اسم المشروع: `food-recalls-early-warning-qatar`
4. اتبع الخطوات لإنشاء المشروع

#### إعداد Firestore Database
1. في Firebase Console، اذهب إلى "Firestore Database"
2. انقر على "Create database"
3. اختر "Start in test mode" (سنغير القواعد لاحقاً)
4. اختر المنطقة الأقرب لك (مثل: europe-west3)

#### إعداد Cloud Functions
1. في Firebase Console، اذهب إلى "Functions"
2. انقر على "Get started"
3. اختر المنطقة نفسها التي اخترتها لـ Firestore

#### إعداد Firebase Hosting
1. في Firebase Console، اذهب إلى "Hosting"
2. انقر على "Get started"

#### إعداد Cloud Messaging (FCM)
1. في Firebase Console، اذهب إلى "Cloud Messaging"
2. في "Project Settings" > "Cloud Messaging"
3. في قسم "Web configuration"، انقر على "Generate key pair"
4. احفظ الـ VAPID key

#### الحصول على تكوين Firebase
1. في Firebase Console، اذهب إلى "Project Settings"
2. في قسم "Your apps"، انقر على أيقونة الويب `</>`
3. اكتب اسم التطبيق: `food-recalls-qatar-web`
4. فعل "Also set up Firebase Hosting"
5. احفظ تكوين Firebase (firebaseConfig)

### 2. إعداد البيئة المحلية

#### تثبيت Firebase CLI
```bash
npm install -g firebase-tools
```

#### تسجيل الدخول إلى Firebase
```bash
firebase login
```

#### تهيئة المشروع
```bash
# في مجلد المشروع
firebase init

# اختر الخدمات التالية:
# - Functions
# - Firestore
# - Hosting

# اختر المشروع الذي أنشأته
# اختر JavaScript للـ Functions
# اختر Yes لـ ESLint
# اختر public كـ public directory
# اختر Yes لـ single-page app
# اختر No لـ overwrite index.html
```

### 3. تكوين الملفات

#### تحديث تكوين Firebase في الواجهة
1. افتح `scripts/firebase-config.js`
2. استبدل القيم التالية بالقيم الحقيقية من Firebase Console:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "food-recalls-early-warning-qatar.firebaseapp.com",
  projectId: "food-recalls-early-warning-qatar",
  storageBucket: "food-recalls-early-warning-qatar.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const VAPID_KEY = "YOUR_VAPID_KEY";
```

#### تحديث Service Worker
1. افتح `public/firebase-messaging-sw.js`
2. استبدل التكوين بنفس القيم السابقة

### 4. تثبيت Dependencies ونشر Functions

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

### 5. نشر قواعد Firestore

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 6. نشر الواجهة

```bash
firebase deploy --only hosting
```

### 7. إضافة الأصول المطلوبة

أضف الملفات التالية إلى مجلد `public/assets/`:

#### الأيقونات
- `icon-72x72.png` إلى `icon-512x512.png`
- `favicon-16x16.png`, `favicon-32x32.png`
- `apple-touch-icon.png`
- `notify.png`, `badge.png`

#### الأصوات
- `notification-sound.mp3` - صوت الإشعار العادي
- `urgent-sound.mp3` - صوت الإشعار العاجل
- `success-sound.mp3` - صوت النجاح

#### الصور
- `screenshot-wide.png` (1280x720)
- `screenshot-narrow.png` (720x1280)
- `urgent-icon.png`, `international-icon.png`

### 8. اختبار النظام

#### اختبار Cloud Functions
```bash
# اختبار جلب البيانات
curl -X POST https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls

# اختبار الإشعار التجريبي
curl -X POST https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/sendTestNotification
```

#### اختبار الواجهة
1. افتح الموقع في المتصفح
2. اختبر تفعيل الإشعارات
3. اختبر الفلاتر والبحث
4. اختبر مشاركة واتساب

### 9. إعداد التحديث التلقائي

سيتم تشغيل Cloud Function `scheduledRecallsUpdate` تلقائياً كل 20 دقيقة لجلب البيانات الجديدة من المصادر.

### 10. مراقبة النظام

#### في Firebase Console:
- **Functions**: مراقبة تنفيذ الدوال وسجلات الأخطاء
- **Firestore**: مراقبة استخدام قاعدة البيانات
- **Hosting**: مراقبة زيارات الموقع
- **Cloud Messaging**: مراقبة إرسال الإشعارات

#### سجلات مفيدة:
```bash
# عرض سجلات Functions
firebase functions:log

# عرض سجلات دالة معينة
firebase functions:log --only recalls
```

## الروابط المهمة

- **الموقع**: `https://food-recalls-early-warning-qatar.web.app`
- **API**: `https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls`
- **Firebase Console**: [رابط المشروع](https://console.firebase.google.com/project/food-recalls-early-warning-qatar)

## استكشاف الأخطاء

### مشاكل شائعة:

1. **خطأ في CORS**: تأكد من إعداد CORS في Cloud Functions
2. **فشل الإشعارات**: تحقق من VAPID key وإعدادات Service Worker
3. **بطء التحميل**: تحقق من فهارس Firestore
4. **خطأ في API**: تحقق من سجلات Functions

### أوامر مفيدة:

```bash
# إعادة نشر كامل
firebase deploy

# نشر Functions فقط
firebase deploy --only functions

# نشر Hosting فقط
firebase deploy --only hosting

# تشغيل محلي للاختبار
firebase emulators:start
```

## الأمان

- قواعد Firestore تسمح بالقراءة للجميع والكتابة للـ Functions فقط
- جميع البيانات الحساسة محمية
- استخدام HTTPS لجميع الطلبات
- تشفير البيانات أثناء النقل والتخزين

## الدعم

للمساعدة والدعم التقني، راجع:
- [وثائق Firebase](https://firebase.google.com/docs)
- [وثائق Cloud Functions](https://firebase.google.com/docs/functions)
- [وثائق FCM](https://firebase.google.com/docs/cloud-messaging)
