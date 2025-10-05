# 🚨 دليل النشر النهائي - نظام الإنذار المبكر للاستدعاءات الغذائية

## 📋 نظرة عامة

نظام متقدم لمراقبة الاستدعاءات الغذائية العالمية مع **التصنيف الجغرافي المتقدم** و**تحديد وضع قطر** لكل استدعاء.

### 🌍 المصادر المراقبة:
- ✅ **FDA** (الولايات المتحدة) - openFDA API
- ✅ **Health Canada** (كندا) - RSS الرسمي
- ✅ **SFDA** (السعودية) - صفحات رسمية
- ✅ **FSANZ** (أستراليا/نيوزيلندا) - API رسمي
- ⚠️ **RASFF** (الاتحاد الأوروبي) - معطل افتراضياً للاستقرار

### 🎯 الميزات الجديدة:
- **التصنيف الجغرافي**: عالمي، وطني، ولايات/مقاطعات، محلي
- **وضع قطر**: مؤكد 🇶🇦، محتمل ⚠️، غير محدد ❌
- **واجهة ثنائية اللغة**: عربي/إنجليزي
- **رسائل واتساب رسمية** محسنة
- **إشعارات مخصصة** بناءً على الأهمية

---

## ⚡ خطوات النشر السريع

### 1️⃣ إنشاء مشروع Firebase

```bash
🔗 https://console.firebase.google.com
📝 اسم المشروع: food-recalls-early-warning-qatar
💳 خطة: Blaze (مطلوبة لـ Cloud Scheduler)
```

### 2️⃣ تفعيل الخدمات

في Firebase Console:
- ✅ **Firestore Database** (Native mode)
- ✅ **Cloud Functions** 
- ✅ **Firebase Hosting**
- ✅ **Cloud Messaging (FCM)**

### 3️⃣ الحصول على المفاتيح

من **Project Settings**:

#### General Tab:
```
apiKey: "AIza..."
projectId: "food-recalls-early-warning-qatar"
appId: "1:123456789:web:abc123"
```

#### Cloud Messaging Tab:
```
messagingSenderId: "123456789"
VAPID Key: "BM4dG..."
```

### 4️⃣ تحديث التكوين

#### أ) تحديث `public/app.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",           // ← ضع المفتاح الحقيقي
  authDomain: "food-recalls-early-warning-qatar.firebaseapp.com",
  projectId: "food-recalls-early-warning-qatar",
  storageBucket: "food-recalls-early-warning-qatar.appspot.com",
  messagingSenderId: "YOUR_ACTUAL_SENDER_ID", // ← ضع الرقم الحقيقي
  appId: "YOUR_ACTUAL_APP_ID"              // ← ضع المعرف الحقيقي
};

const VAPID_KEY = "YOUR_ACTUAL_VAPID_KEY"; // ← ضع مفتاح VAPID الحقيقي
```

#### ب) تحديث `public/firebase-messaging-sw.js`:
```javascript
firebase.initializeApp({
  apiKey: "YOUR_ACTUAL_API_KEY",           // ← نفس القيم من app.js
  authDomain: "food-recalls-early-warning-qatar.firebaseapp.com",
  projectId: "food-recalls-early-warning-qatar",
  storageBucket: "food-recalls-early-warning-qatar.appspot.com",
  messagingSenderId: "YOUR_ACTUAL_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
});
```

### 5️⃣ فحص التكوين

```bash
# فحص التكوين قبل النشر
node check-config.js
```

### 6️⃣ النشر

```bash
# تثبيت Firebase CLI
npm install -g firebase-tools

# تسجيل الدخول
firebase login

# تهيئة المشروع (اختر المشروع الموجود)
firebase init

# تثبيت dependencies للـ Functions
cd functions && npm install && cd ..

# النشر الكامل
firebase deploy

# أو النشر المرحلي:
firebase deploy --only functions
firebase deploy --only hosting
firebase deploy --only firestore:rules
```

---

## 🎯 النتيجة النهائية

### 📱 الموقع:
```
https://food-recalls-early-warning-qatar.web.app
```

### 🔗 API Endpoints:
```
GET  https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls
POST https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls
POST https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/sendTestNotification
```

### ⏰ التحديث التلقائي:
- **pullScheduler**: كل 20 دقيقة
- **الواجهة**: كل دقيقتين

---

## 🧪 الاختبار النهائي

### 1️⃣ اختبار الواجهة:
```bash
# فتح الموقع
open https://food-recalls-early-warning-qatar.web.app

# اختبار:
✅ تبديل اللغة (عربي/إنجليزي)
✅ الفلاتر (الكل، عاجل، عالمي، وطني، محلي)
✅ البحث في الاستدعاءات
✅ عرض التفاصيل
✅ مشاركة واتساب
✅ تصدير البيانات
```

### 2️⃣ اختبار API:
```bash
# جلب البيانات
curl "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls"

# تحديث البيانات
curl -X POST "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls"

# إشعار تجريبي
curl -X POST "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/sendTestNotification"
```

### 3️⃣ اختبار الإشعارات:
```bash
# في المتصفح:
1. اضغط "تفعيل الإشعارات" → Allow
2. اضغط "إشعار تجريبي"
3. تأكد من وصول الإشعار
4. اختبر الأصوات
```

### 4️⃣ اختبار واتساب:
```bash
# في أي استدعاء:
1. اضغط "مشاركة واتساب"
2. تأكد من الرسالة الرسمية:
   - معلومات المنتج
   - التصنيف الجغرافي
   - وضع قطر
   - التاريخ والوقت UTC
   - روابط المصادر
```

---

## 🔧 التصنيف الجغرافي المتقدم

### النطاقات:
- **🌍 عالمي**: يحتوي على (international/worldwide/global)
- **🏛️ وطني**: يحتوي على (nationwide/all states) أو جهة وطنية
- **📍 ولايات/مقاطعات**: يحتوي على رموز (CA, NY, ON, QC, NSW, VIC...)
- **🏘️ محلي**: ما عدا ذلك

### وضع قطر:
- **🇶🇦 مؤكد**: يذكر Qatar/Doha صراحة
- **⚠️ محتمل**: يذكر GCC/Gulf/UAE/KSA/Bahrain/Kuwait/Oman/Middle East
- **❌ غير محدد**: لا توجد إشارة

---

## 🔄 تفعيل/تعطيل RASFF

في `functions/index.js`:

```javascript
// تفعيل RASFF (افتراضياً: معطل للاستقرار)
const ENABLE_RASFF = false; // ← غير إلى true لتفعيل RASFF
```

---

## 📊 مراقبة النظام

### Firebase Console:
```
🔗 https://console.firebase.google.com/project/food-recalls-early-warning-qatar

📊 Functions → Logs
📈 Firestore → Data
📱 Hosting → Usage
🔔 Cloud Messaging → Reports
```

### أوامر مفيدة:
```bash
# مراقبة السجلات
firebase functions:log

# مراقبة الأداء
firebase functions:log --only pullScheduler

# إحصائيات الاستخدام
firebase hosting:channel:list
```

---

## ⚠️ نقاط مهمة

### 🔑 الأمان:
1. **لا تترك القيم الافتراضية** مثل `YOUR_API_KEY`
2. **استخدم سكريپت الفحص** `node check-config.js`
3. **راقب السجلات** بانتظام
4. **احتفظ بنسخة احتياطية** من التكوينات

### 💰 التكلفة:
1. **خطة Blaze مطلوبة** لـ Cloud Scheduler
2. **مراقبة الاستخدام** في Firebase Console
3. **تحسين عدد الاستدعاءات** حسب الحاجة

### 🚀 الأداء:
1. **تحديث كل 20 دقيقة** (قابل للتعديل)
2. **حد أقصى 50 استدعاء** من كل مصدر
3. **تخزين مؤقت** في المتصفح
4. **ضغط البيانات** تلقائياً

---

## 📞 الدعم والصيانة

### الملفات المرجعية:
- 📖 `DEPLOYMENT_GUIDE.md` - دليل النشر الشامل
- ⚡ `QUICK_CONFIG.md` - التكوين السريع
- 🧪 `TESTING_GUIDE.md` - دليل الاختبار
- 🔒 `SECURITY_CONFIG.md` - تكوين الأمان
- 📊 `PROJECT_DOCUMENTATION.md` - التوثيق الكامل

### روابط مفيدة:
- 🔗 [Firebase Console](https://console.firebase.google.com)
- 📚 [وثائق Firebase](https://firebase.google.com/docs)
- 🛠️ [Firebase CLI](https://firebase.google.com/docs/cli)
- 📱 [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)

---

## ✅ قائمة التحقق النهائية

### قبل النشر:
- [ ] إنشاء مشروع Firebase بالاسم الصحيح
- [ ] تفعيل جميع الخدمات المطلوبة
- [ ] الحصول على جميع المفاتيح
- [ ] تحديث ملفات التكوين
- [ ] تشغيل `node check-config.js`
- [ ] تثبيت dependencies

### بعد النشر:
- [ ] اختبار الموقع في المتصفح
- [ ] اختبار API endpoints
- [ ] اختبار الإشعارات
- [ ] اختبار مشاركة واتساب
- [ ] مراقبة السجلات
- [ ] تأكيد التحديث التلقائي

### التشغيل المستمر:
- [ ] مراقبة الأداء يومياً
- [ ] فحص السجلات أسبوعياً
- [ ] تحديث التكوينات حسب الحاجة
- [ ] نسخ احتياطية شهرية

---

*🇶🇦 نظام الإنذار المبكر للاستدعاءات الغذائية - قطر*  
*📅 ديسمبر 2024 - الإصدار النهائي*
