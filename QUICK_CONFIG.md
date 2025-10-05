# ⚡ التكوين السريع - للمطور

## 🔑 المفاتيح المطلوبة من Firebase Console

بعد إنشاء المشروع في Firebase Console، احصل على هذه القيم:

### من Project Settings > General:
```
API Key: AIzaSyC...
Project ID: food-recalls-early-warning-qatar
App ID: 1:123456789:web:abc123
```

### من Project Settings > Cloud Messaging:
```
Sender ID: 123456789
VAPID Key: BNdVr...
```

---

## 📝 الملفات التي تحتاج تحديث

### 1. `scripts/firebase-config.js`

```javascript
// 🔴 استبدل هذه القيم
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",                    // ← ضع API Key هنا
  authDomain: "food-recalls-early-warning-qatar.firebaseapp.com",
  projectId: "food-recalls-early-warning-qatar",
  storageBucket: "food-recalls-early-warning-qatar.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",       // ← ضع Sender ID هنا
  appId: "YOUR_APP_ID"                       // ← ضع App ID هنا
};

const VAPID_KEY = "YOUR_VAPID_KEY";          // ← ضع VAPID Key هنا
```

### 2. `public/firebase-messaging-sw.js`

```javascript
// 🔴 استبدل نفس القيم هنا
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",                    // ← نفس API Key
  authDomain: "food-recalls-early-warning-qatar.firebaseapp.com",
  projectId: "food-recalls-early-warning-qatar",
  storageBucket: "food-recalls-early-warning-qatar.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",       // ← نفس Sender ID
  appId: "YOUR_APP_ID"                       // ← نفس App ID
});
```

---

## 🚀 أوامر النشر السريع

```bash
# 1. تهيئة Firebase (مرة واحدة فقط)
firebase init

# 2. تثبيت dependencies للـ Functions
cd functions && npm install && cd ..

# 3. نشر كل شيء
firebase deploy

# أو نشر منفصل:
firebase deploy --only functions
firebase deploy --only hosting
firebase deploy --only firestore:rules
```

---

## ✅ اختبار سريع

```bash
# اختبار API
curl "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls"

# اختبار تحديث البيانات
curl -X POST "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls"
```

---

## 🔍 نقاط التحقق

- [ ] تم إنشاء مشروع Firebase باسم `food-recalls-early-warning-qatar`
- [ ] تم تفعيل Firestore Database
- [ ] تم تفعيل Cloud Messaging وأخذ VAPID key
- [ ] تم تحديث المفاتيح في الملفين المذكورين أعلاه
- [ ] تم تشغيل `firebase deploy`
- [ ] الموقع يعمل على `https://food-recalls-early-warning-qatar.web.app`
- [ ] API يرد على الطلبات
- [ ] الإشعارات تعمل في المتصفح

---

## ⚠️ تحذيرات مهمة

1. **لا تترك القيم الافتراضية** مثل `YOUR_API_KEY`
2. **تأكد من تطابق اسم المشروع** في جميع الملفات
3. **اختبر الإشعارات** في متصفح يدعم Service Workers
4. **راقب سجلات Functions** للتأكد من عدم وجود أخطاء

---

## 📱 الميزات المتوقعة بعد النشر

✅ **تحديث تلقائي** كل 20 دقيقة من:
- FDA (أمريكا)
- Health Canada (كندا)  
- SFDA (السعودية)
- FSANZ (أستراليا/نيوزيلندا)
- RASFF (أوروبا)

✅ **إشعارات فورية** عند اكتشاف استدعاءات جديدة

✅ **واجهة عربية** متجاوبة مع جميع الأجهزة

✅ **مشاركة واتساب** مع رسائل رسمية

✅ **تطبيق PWA** قابل للتثبيت على الهواتف
