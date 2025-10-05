# 🚨 نظام الإنذار المبكر للاستدعاءات الغذائية - قطر

## 📋 نظرة سريعة

نظام متقدم لمراقبة الاستدعاءات الغذائية العالمية وإرسال تنبيهات فورية للمستهلكين في قطر والمنطقة العربية.

### 🌍 المصادر المراقبة:
- **FDA** (الولايات المتحدة)
- **Health Canada** (كندا)
- **SFDA** (السعودية)
- **FSANZ** (أستراليا/نيوزيلندا)
- **RASFF** (الاتحاد الأوروبي)

---

## ⚡ النشر السريع

### 1. إنشاء مشروع Firebase
```
🔗 https://console.firebase.google.com
📝 اسم المشروع: food-recalls-early-warning-qatar
```

### 2. تفعيل الخدمات
- ✅ Firestore Database
- ✅ Cloud Functions  
- ✅ Firebase Hosting
- ✅ Cloud Messaging (FCM)

### 3. الحصول على المفاتيح
```
Project Settings > General:
- API Key
- Project ID  
- App ID

Project Settings > Cloud Messaging:
- Sender ID
- VAPID Key
```

### 4. تحديث التكوين
```bash
# فحص التكوين
node check-config.js

# تحديث الملفات:
# - scripts/firebase-config.js
# - public/firebase-messaging-sw.js
```

### 5. النشر
```bash
# تثبيت Firebase CLI
npm install -g firebase-tools

# تسجيل الدخول
firebase login

# تهيئة المشروع
firebase init

# تثبيت dependencies
cd functions && npm install && cd ..

# النشر
firebase deploy
```

---

## 🎯 النتيجة النهائية

✅ **موقع ويب**: `https://food-recalls-early-warning-qatar.web.app`  
✅ **API**: `https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls`  
✅ **تحديث تلقائي**: كل 20 دقيقة  
✅ **إشعارات فورية**: FCM + أصوات تنبيه  
✅ **واجهة عربية**: متجاوبة مع جميع الأجهزة  
✅ **مشاركة واتساب**: رسائل رسمية مع الروابط  
✅ **تطبيق PWA**: قابل للتثبيت  

---

## 📁 هيكل المشروع

```
food-recalls-early-warning-qatar/
├── 📄 DEPLOYMENT_GUIDE.md      # دليل النشر التفصيلي
├── 📄 QUICK_CONFIG.md          # التكوين السريع
├── 📄 check-config.js          # سكريپت فحص التكوين
├── 📁 functions/               # Cloud Functions
│   ├── index.js               # الكود الرئيسي
│   └── package.json           # Dependencies
├── 📁 public/                  # الواجهة الأمامية
│   ├── index.html             # الصفحة الرئيسية
│   ├── manifest.json          # PWA Manifest
│   └── firebase-messaging-sw.js # Service Worker
├── 📁 scripts/                 # JavaScript
│   ├── app.js                 # التطبيق الرئيسي
│   ├── firebase-config.js     # تكوين Firebase
│   └── utils.js               # الأدوات المساعدة
├── 📁 styles/                  # CSS
│   ├── main.css               # التصميم الرئيسي
│   └── notifications.css      # تصميم الإشعارات
├── firebase.json               # تكوين Firebase
├── firestore.rules            # قواعد الأمان
└── .firebaserc                # مشروع Firebase
```

---

## 🔧 الأوامر المفيدة

```bash
# فحص التكوين
node check-config.js

# نشر Functions فقط
firebase deploy --only functions

# نشر Hosting فقط  
firebase deploy --only hosting

# نشر قواعد Firestore
firebase deploy --only firestore:rules

# مراقبة السجلات
firebase functions:log

# تشغيل محلي للاختبار
firebase emulators:start
```

---

## 🧪 الاختبار

```bash
# اختبار API
curl "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls"

# اختبار تحديث البيانات
curl -X POST "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls"

# اختبار الإشعار التجريبي
curl -X POST "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/sendTestNotification"
```

---

## 📱 الميزات التقنية

### Frontend
- **HTML5** مع دعم PWA
- **CSS3** متجاوب مع متغيرات CSS
- **JavaScript ES6+** مع Firebase SDK
- **Service Worker** للإشعارات والتخزين المؤقت

### Backend  
- **Node.js 18** مع Express
- **Cloud Functions** للمعالجة
- **Firestore** لقاعدة البيانات
- **Cloud Scheduler** للمهام المجدولة

### الأمان
- **SSL/TLS** لجميع الاتصالات
- **Firestore Rules** محكمة الإغلاق
- **CORS** مقيد بالنطاقات المعتمدة
- **Input Validation** شامل

---

## 📞 الدعم

### الملفات المرجعية:
- 📖 **DEPLOYMENT_GUIDE.md** - دليل النشر الشامل
- ⚡ **QUICK_CONFIG.md** - التكوين السريع
- 🧪 **TESTING_GUIDE.md** - دليل الاختبار
- 🔒 **SECURITY_CONFIG.md** - تكوين الأمان
- 📊 **PROJECT_DOCUMENTATION.md** - التوثيق الكامل

### روابط مفيدة:
- 🔗 [Firebase Console](https://console.firebase.google.com)
- 📚 [وثائق Firebase](https://firebase.google.com/docs)
- 🛠️ [Firebase CLI](https://firebase.google.com/docs/cli)

---

## ⚠️ ملاحظات مهمة

1. **لا تترك القيم الافتراضية** في ملفات التكوين
2. **تأكد من تطابق اسم المشروع** في جميع الملفات
3. **اختبر الإشعارات** في متصفح حديث
4. **راقب سجلات Functions** بانتظام
5. **احتفظ بنسخة احتياطية** من التكوينات

---

*🇶🇦 مطور خصيصاً لدولة قطر والمنطقة العربية*  
*📅 ديسمبر 2024*
