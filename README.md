# نظام الإنذار المبكر للاستدعاءات الغذائية - قطر

## خطوات إعداد المشروع على Firebase

### 1. إنشاء المشروع في Firebase Console

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. انقر على "Add project" أو "إضافة مشروع"
3. اكتب اسم المشروع: `food-recalls-early-warning-qatar`
4. اتبع الخطوات لإنشاء المشروع

### 2. إعداد Firestore Database

1. في Firebase Console، اذهب إلى "Firestore Database"
2. انقر على "Create database"
3. اختر "Start in test mode" (سنغير القواعد لاحقاً)
4. اختر المنطقة الأقرب لك
5. بعد إنشاء قاعدة البيانات، أنشئ Collection جديدة باسم `recalls`

#### هيكل البيانات في Collection `recalls`:
```json
{
  "title": "string",
  "brand": "string", 
  "lot": "string",
  "reason": "string",
  "date": "timestamp",
  "scope": "international | national",
  "country": "string",
  "agency": "string",
  "source_url": "string",
  "image": "string",
  "qa_possible": true
}
```

### 3. إعداد Cloud Functions

1. في Firebase Console، اذهب إلى "Functions"
2. انقر على "Get started"
3. في Terminal، نفذ الأوامر التالية:

```bash
# تثبيت Firebase CLI
npm install -g firebase-tools

# تسجيل الدخول
firebase login

# في مجلد المشروع
firebase init functions

# اختر المشروع الذي أنشأته
# اختر JavaScript
# اختر Yes لـ ESLint
# اختر Yes لتثبيت dependencies
```

4. انسخ محتويات مجلد `functions/` من هذا المشروع
5. نفذ الأمر لرفع Functions:
```bash
firebase deploy --only functions
```

### 4. إعداد Firebase Hosting

1. في Firebase Console، اذهب إلى "Hosting"
2. انقر على "Get started"
3. في Terminal، نفذ:

```bash
firebase init hosting

# اختر public كـ public directory
# اختر Yes لـ single-page app
# اختر No لـ overwrite index.html
```

4. انسخ ملفات الواجهة إلى مجلد `public/`
5. نفذ الأمر لرفع الموقع:
```bash
firebase deploy --only hosting
```

### 5. إعداد Security Rules

في Firebase Console، اذهب إلى "Firestore Database" > "Rules" وضع القواعد التالية:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /recalls/{docId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

### 6. إعداد Firebase Cloud Messaging (اختياري)

1. في Firebase Console، اذهب إلى "Cloud Messaging"
2. انقر على "Get started"
3. أضف Web app إذا لم تكن قد فعلت ذلك
4. احصل على Messaging configuration
5. أضف Service Worker للإشعارات

## الروابط المهمة

- **Cloud Function URL**: `https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls`
- **Hosting URL**: سيتم إنشاؤه بعد Deploy

## المصادر المدعومة

- FDA (الولايات المتحدة)
- Health Canada (كندا)
- SFDA (السعودية)
- FSANZ (أستراليا/نيوزيلندا)
- RASFF (الاتحاد الأوروبي)

## الميزات

- ✅ جلب البيانات كل 20 دقيقة
- ✅ عرض الاستدعاءات في الوقت الفعلي
- ✅ تنبيهات صوتية
- ✅ إرسال عبر واتساب
- ✅ إشعارات فورية (FCM)
- ✅ واجهة عربية/إنجليزية
