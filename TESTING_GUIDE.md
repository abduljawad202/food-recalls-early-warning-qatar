# دليل اختبار النظام الشامل

## اختبارات ما قبل النشر

### 1. اختبار Firebase Console

#### التحقق من إعداد المشروع
- [ ] المشروع منشأ باسم `food-recalls-early-warning-qatar`
- [ ] Firestore Database مفعل ويعمل
- [ ] Cloud Functions مفعل ويعمل
- [ ] Firebase Hosting مفعل ويعمل
- [ ] Cloud Messaging مفعل ويعمل

#### التحقق من Collections في Firestore
```bash
# في Firebase Console > Firestore Database
# تأكد من وجود Collections التالية:
- recalls (فارغ في البداية)
- subscribers (فارغ في البداية)  
- notification_stats (فارغ في البداية)
- settings (اختياري)
```

### 2. اختبار Cloud Functions

#### اختبار دالة جلب البيانات
```bash
# اختبار GET - جلب البيانات
curl -X GET "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls"

# النتيجة المتوقعة:
{
  "success": true,
  "count": 0,
  "data": []
}
```

```bash
# اختبار POST - تحديث البيانات
curl -X POST "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls"

# النتيجة المتوقعة:
{
  "success": true,
  "message": "تم جلب X استدعاء وحفظ Y جديد",
  "sources": {
    "fda": 5,
    "canada": 3,
    "sfda": 1,
    "fsanz": 2,
    "rasff": 1
  }
}
```

#### اختبار دالة الإشعار التجريبي
```bash
curl -X POST "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/sendTestNotification"

# النتيجة المتوقعة:
{
  "success": true,
  "message": "تم إرسال الإشعار التجريبي بنجاح"
}
```

#### مراقبة سجلات Functions
```bash
# عرض السجلات
firebase functions:log

# عرض سجلات دالة معينة
firebase functions:log --only recalls
```

### 3. اختبار الواجهة الأمامية

#### التحقق من تحميل الصفحة
- [ ] الصفحة تتحمل بدون أخطاء
- [ ] الخطوط العربية تظهر بشكل صحيح
- [ ] الأيقونات تظهر بشكل صحيح
- [ ] التصميم متجاوب على الهاتف والحاسوب

#### اختبار الوظائف الأساسية
- [ ] تحميل البيانات من API
- [ ] عرض البيانات في البطاقات
- [ ] الفلاتر تعمل بشكل صحيح
- [ ] البحث يعمل بشكل صحيح
- [ ] زر "تحميل المزيد" يعمل
- [ ] النافذة المنبثقة للتفاصيل تعمل

#### اختبار الإشعارات
- [ ] طلب إذن الإشعارات يظهر
- [ ] تفعيل الإشعارات يعمل
- [ ] الإشعار التجريبي يصل
- [ ] صوت التنبيه يعمل
- [ ] Service Worker مسجل بنجاح

#### اختبار المشاركة
- [ ] مشاركة واتساب تعمل
- [ ] نسخ الرابط يعمل
- [ ] تصدير البيانات CSV يعمل

### 4. اختبارات الأداء

#### اختبار سرعة التحميل
```bash
# استخدام Lighthouse للاختبار
npx lighthouse https://food-recalls-early-warning-qatar.web.app --output=html --output-path=./lighthouse-report.html

# النتائج المطلوبة:
# Performance: > 90
# Accessibility: > 95
# Best Practices: > 90
# SEO: > 90
# PWA: > 90
```

#### اختبار الاستجابة
- [ ] الصفحة تتحمل في أقل من 3 ثوان
- [ ] البيانات تظهر في أقل من 5 ثوان
- [ ] الفلاتر تستجيب فوراً
- [ ] النقر على البطاقات سريع

### 5. اختبارات الأمان

#### اختبار قواعد Firestore
```javascript
// في Firebase Console > Firestore > Rules
// اختبر القواعد التالية:

// قراءة البيانات (يجب أن تنجح)
allow read: if true;

// كتابة البيانات بدون مصادقة (يجب أن تفشل)
allow write: if false;

// كتابة البيانات مع مصادقة admin (يجب أن تنجح)
allow write: if request.auth != null && request.auth.token.admin == true;
```

#### اختبار الحماية من الهجمات
```bash
# اختبار SQL Injection
curl -X POST "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls" \
  -H "Content-Type: application/json" \
  -d '{"title": "'; DROP TABLE recalls; --"}'

# يجب أن يرفض الطلب أو يتعامل معه بأمان
```

```bash
# اختبار XSS
curl -X POST "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls" \
  -H "Content-Type: application/json" \
  -d '{"title": "<script>alert(\"XSS\")</script>"}'

# يجب أن يتم تنظيف البيانات
```

### 6. اختبارات التوافق

#### المتصفحات المدعومة
- [ ] Chrome (آخر إصدار)
- [ ] Firefox (آخر إصدار)
- [ ] Safari (آخر إصدار)
- [ ] Edge (آخر إصدار)
- [ ] Chrome Mobile
- [ ] Safari Mobile

#### الأجهزة المختلفة
- [ ] سطح المكتب (1920x1080)
- [ ] اللابتوب (1366x768)
- [ ] التابلت (768x1024)
- [ ] الهاتف (375x667)
- [ ] الهاتف الكبير (414x896)

### 7. اختبارات المصادر الخارجية

#### اختبار APIs المصادر
```bash
# اختبار FDA API
curl "https://api.fda.gov/food/enforcement.json?limit=1"

# اختبار Health Canada
curl "https://healthycanadians.gc.ca/recall-alert-rappel-avis/api/recent/en"

# اختبار FSANZ
curl "https://www.foodstandards.gov.au/api/foodrecalls"
```

#### التحقق من معالجة الأخطاء
- [ ] عند فشل API واحد، الباقي يعمل
- [ ] رسائل خطأ واضحة للمستخدم
- [ ] إعادة المحاولة التلقائية تعمل
- [ ] Fallback data متوفرة

## اختبارات ما بعد النشر

### 1. اختبار الإنتاج

#### التحقق من الروابط
- [ ] الموقع الرئيسي يعمل: `https://food-recalls-early-warning-qatar.web.app`
- [ ] API يعمل: `https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls`
- [ ] إعادة التوجيه من HTTP إلى HTTPS تعمل
- [ ] شهادة SSL صحيحة ومحدثة

#### مراقبة الأداء
```bash
# مراقبة استجابة API
curl -w "@curl-format.txt" -o /dev/null -s "https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls"

# ملف curl-format.txt:
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

### 2. اختبار التحديث التلقائي

#### التحقق من Cron Jobs
```bash
# في Firebase Console > Functions
# تأكد من تشغيل scheduledRecallsUpdate كل 20 دقيقة

# مراقبة السجلات
firebase functions:log --only scheduledRecallsUpdate
```

#### التحقق من البيانات الجديدة
- [ ] البيانات تتحدث كل 20 دقيقة
- [ ] الاستدعاءات الجديدة تظهر في الواجهة
- [ ] الإشعارات ترسل للاستدعاءات الجديدة
- [ ] الإحصائيات تتحدث

### 3. اختبار الإشعارات المباشرة

#### اختبار FCM
```bash
# إرسال إشعار تجريبي عبر Firebase Console
# Cloud Messaging > Send test message

# أو عبر API
curl -X POST "https://fcm.googleapis.com/fcm/send" \
  -H "Authorization: Bearer YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "/topics/all-users",
    "notification": {
      "title": "اختبار الإشعار",
      "body": "هذا إشعار تجريبي"
    }
  }'
```

#### التحقق من وصول الإشعارات
- [ ] الإشعارات تصل على Chrome Desktop
- [ ] الإشعارات تصل على Chrome Mobile
- [ ] الإشعارات تصل على Firefox
- [ ] الصوت يعمل مع الإشعارات
- [ ] النقر على الإشعار يفتح الموقع

### 4. اختبار الحمولة (Load Testing)

#### اختبار الضغط على API
```bash
# استخدام Apache Bench
ab -n 1000 -c 10 https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls

# النتائج المطلوبة:
# - 99% من الطلبات تكتمل في أقل من 5 ثوان
# - 0% معدل الخطأ
# - Throughput > 10 requests/second
```

#### اختبار الضغط على Firestore
```javascript
// سكريبت اختبار الضغط
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function loadTest() {
  const promises = [];
  
  for (let i = 0; i < 100; i++) {
    promises.push(
      db.collection('recalls').limit(50).get()
    );
  }
  
  const start = Date.now();
  await Promise.all(promises);
  const end = Date.now();
  
  console.log(`100 concurrent reads completed in ${end - start}ms`);
}

loadTest();
```

## اختبارات الصيانة

### 1. اختبار النسخ الاحتياطي

```bash
# تشغيل النسخ الاحتياطي يدوياً
gcloud firestore export gs://food-recalls-early-warning-qatar-backups/manual-backup-$(date +%Y%m%d)

# التحقق من النسخة الاحتياطية
gsutil ls gs://food-recalls-early-warning-qatar-backups/
```

### 2. اختبار الاستعادة

```bash
# استعادة من نسخة احتياطية (للاختبار فقط)
gcloud firestore import gs://food-recalls-early-warning-qatar-backups/backup-20240101/
```

### 3. اختبار التحديثات

#### تحديث Functions
```bash
# تحديث دالة واحدة
firebase deploy --only functions:recalls

# التحقق من عمل الدالة بعد التحديث
curl https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls
```

#### تحديث الواجهة
```bash
# تحديث الواجهة
firebase deploy --only hosting

# التحقق من التحديث
curl -I https://food-recalls-early-warning-qatar.web.app
```

## تقارير الاختبار

### نموذج تقرير الاختبار

```markdown
# تقرير اختبار النظام - [التاريخ]

## ملخص النتائج
- ✅ اختبارات ناجحة: X/Y
- ❌ اختبارات فاشلة: Z/Y
- ⚠️ تحذيرات: W

## تفاصيل الاختبارات

### Cloud Functions
- [✅] recalls API: يعمل بشكل صحيح
- [✅] sendTestNotification: يعمل بشكل صحيح
- [✅] scheduledRecallsUpdate: يعمل كل 20 دقيقة

### الواجهة الأمامية
- [✅] تحميل الصفحة: < 3 ثوان
- [✅] عرض البيانات: يعمل بشكل صحيح
- [✅] الفلاتر: تعمل بشكل صحيح

### الإشعارات
- [✅] FCM: يعمل بشكل صحيح
- [✅] Service Worker: مسجل بنجاح
- [✅] الصوت: يعمل بشكل صحيح

### الأداء
- [✅] Lighthouse Score: 95/100
- [✅] API Response Time: < 2 ثانية
- [✅] Page Load Time: < 3 ثوان

## المشاكل المكتشفة
1. [مشكلة]: وصف المشكلة
   - الحل: وصف الحل
   - الحالة: تم الحل / قيد العمل

## التوصيات
1. تحسين أداء API للمصادر البطيئة
2. إضافة المزيد من اختبارات الوحدة
3. تحسين معالجة الأخطاء
```

## أدوات الاختبار المفيدة

### أدوات سطر الأوامر
```bash
# تثبيت أدوات الاختبار
npm install -g lighthouse
npm install -g firebase-tools
npm install -g artillery  # للـ load testing

# اختبار الأداء
lighthouse https://food-recalls-early-warning-qatar.web.app

# اختبار الحمولة
artillery quick --count 10 --num 100 https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls
```

### أدوات المراقبة
- Firebase Console > Performance
- Firebase Console > Crashlytics  
- Google Cloud Console > Monitoring
- Google Analytics (إذا تم إعداده)

### سكريبت اختبار شامل
```bash
#!/bin/bash
# test-all.sh

echo "🧪 بدء الاختبار الشامل..."

# اختبار API
echo "📡 اختبار API..."
curl -f https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls || exit 1

# اختبار الواجهة
echo "🌐 اختبار الواجهة..."
curl -f https://food-recalls-early-warning-qatar.web.app || exit 1

# اختبار الأداء
echo "⚡ اختبار الأداء..."
lighthouse https://food-recalls-early-warning-qatar.web.app --quiet --chrome-flags="--headless"

# اختبار الإشعارات
echo "🔔 اختبار الإشعارات..."
curl -X POST https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/sendTestNotification || exit 1

echo "✅ جميع الاختبارات نجحت!"
```
