# تكوين الأمان والحماية

## قواعد Firestore Security Rules

### القواعد الأساسية (موجودة في firestore.rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // قواعد collection recalls
    match /recalls/{docId} {
      // السماح بالقراءة للجميع
      allow read: if true;
      
      // السماح بالكتابة فقط للـ Functions المعتمدة
      allow write: if request.auth != null && 
                   (request.auth.token.admin == true || 
                    request.auth.token.function == true);
    }
    
    // قواعد المشتركين في الإشعارات
    match /subscribers/{tokenId} {
      allow read: if request.auth != null && request.auth.uid == tokenId;
      allow write: if request.auth != null;
    }
    
    // قواعد التقارير والشكاوى
    match /reports/{reportId} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.token.admin == true;
    }
    
    // قواعد الإحصائيات
    match /notification_stats/{statId} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow write: if request.auth != null && request.auth.token.function == true;
    }
    
    // قواعد الإعدادات العامة
    match /settings/{settingId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

### قواعد متقدمة للحماية

```javascript
// قواعد إضافية للحماية من الإساءة
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // دالة للتحقق من معدل الطلبات
    function isNotTooFrequent() {
      return request.time > resource.data.last_request + duration.value(1, 'm');
    }
    
    // دالة للتحقق من صحة البيانات
    function isValidRecallData() {
      return request.resource.data.keys().hasAll(['title', 'brand', 'reason', 'date', 'country', 'agency']) &&
             request.resource.data.title is string &&
             request.resource.data.title.size() > 0 &&
             request.resource.data.title.size() <= 500;
    }
    
    // قواعد محسنة للـ recalls
    match /recalls/{docId} {
      allow read: if true;
      allow create: if request.auth != null && 
                    request.auth.token.function == true &&
                    isValidRecallData();
      allow update: if request.auth != null && 
                     request.auth.token.admin == true &&
                     isValidRecallData();
      allow delete: if request.auth != null && request.auth.token.admin == true;
    }
    
    // قواعد محسنة للمشتركين
    match /subscribers/{tokenId} {
      allow read: if request.auth != null && request.auth.uid == tokenId;
      allow create: if request.auth != null && 
                    request.resource.data.token is string &&
                    request.resource.data.token.size() > 0;
      allow update: if request.auth != null && 
                    (request.auth.uid == tokenId || request.auth.token.admin == true) &&
                    isNotTooFrequent();
      allow delete: if request.auth != null && 
                    (request.auth.uid == tokenId || request.auth.token.admin == true);
    }
  }
}
```

## تكوين Cloud Functions Security

### متغيرات البيئة الآمنة

```bash
# إعداد متغيرات البيئة الحساسة
firebase functions:config:set api.fda_key="YOUR_FDA_API_KEY"
firebase functions:config:set api.health_canada_key="YOUR_HEALTH_CANADA_KEY"
firebase functions:config:set security.admin_emails="admin1@example.com,admin2@example.com"
firebase functions:config:set security.rate_limit="100"
firebase functions:config:set security.max_requests_per_minute="60"
```

### تحديث Functions للأمان المحسن

```javascript
// في functions/index.js - إضافة middleware للأمان
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// إعداد rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // حد أقصى 100 طلب لكل IP
  message: 'تم تجاوز الحد المسموح من الطلبات',
  standardHeaders: true,
  legacyHeaders: false,
});

// إعداد الأمان العام
const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
});
```

## تكوين HTTPS والشهادات

### إعداد HTTPS إجباري

```javascript
// في firebase.json
{
  "hosting": {
    "public": "public",
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=31536000; includeSubDomains; preload"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          }
        ]
      }
    ],
    "redirects": [
      {
        "source": "**",
        "destination": "https://food-recalls-early-warning-qatar.web.app/**",
        "type": 301
      }
    ]
  }
}
```

## حماية API والطلبات

### تكوين CORS المحسن

```javascript
// في functions/index.js
const cors = require('cors')({
  origin: [
    'https://food-recalls-early-warning-qatar.web.app',
    'https://food-recalls-early-warning-qatar.firebaseapp.com',
    /localhost:\d+$/ // للتطوير المحلي فقط
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### التحقق من صحة الطلبات

```javascript
// دالة للتحقق من صحة البيانات
function validateRecallData(data) {
  const requiredFields = ['title', 'brand', 'reason', 'date', 'country', 'agency'];
  
  // التحقق من وجود الحقول المطلوبة
  for (const field of requiredFields) {
    if (!data[field] || typeof data[field] !== 'string' || data[field].trim() === '') {
      throw new Error(`حقل ${field} مطلوب`);
    }
  }
  
  // التحقق من طول النصوص
  if (data.title.length > 500) {
    throw new Error('عنوان الاستدعاء طويل جداً');
  }
  
  if (data.reason.length > 1000) {
    throw new Error('سبب الاستدعاء طويل جداً');
  }
  
  // التحقق من صحة التاريخ
  const date = new Date(data.date);
  if (isNaN(date.getTime())) {
    throw new Error('تاريخ غير صحيح');
  }
  
  // التحقق من النطاق
  if (!['international', 'national'].includes(data.scope)) {
    throw new Error('نطاق غير صحيح');
  }
  
  return true;
}
```

## مراقبة الأمان والتنبيهات

### إعداد Cloud Monitoring

```javascript
// مراقبة الطلبات المشبوهة
exports.securityMonitor = functions.firestore
  .document('security_logs/{logId}')
  .onCreate(async (snap, context) => {
    const logData = snap.data();
    
    // التحقق من الأنشطة المشبوهة
    if (logData.suspicious_activity) {
      // إرسال تنبيه للمسؤولين
      await sendSecurityAlert(logData);
      
      // حظر IP إذا لزم الأمر
      if (logData.severity === 'high') {
        await blockIP(logData.ip_address);
      }
    }
  });

async function sendSecurityAlert(logData) {
  const message = {
    notification: {
      title: '🚨 تنبيه أمني',
      body: `تم اكتشاف نشاط مشبوه: ${logData.activity_type}`,
    },
    data: {
      type: 'security_alert',
      severity: logData.severity,
      ip: logData.ip_address,
      timestamp: new Date().toISOString()
    },
    topic: 'security-alerts'
  };
  
  await admin.messaging().send(message);
}
```

### تسجيل الأنشطة

```javascript
// تسجيل جميع الطلبات المهمة
async function logActivity(activity_type, details, ip_address) {
  await db.collection('security_logs').add({
    activity_type,
    details,
    ip_address,
    timestamp: new Date(),
    user_agent: details.user_agent || 'unknown',
    suspicious_activity: detectSuspiciousActivity(details)
  });
}

function detectSuspiciousActivity(details) {
  // قواعد اكتشاف الأنشطة المشبوهة
  const suspiciousPatterns = [
    /script/i,
    /select.*from/i,
    /union.*select/i,
    /<script/i,
    /javascript:/i
  ];
  
  const content = JSON.stringify(details).toLowerCase();
  return suspiciousPatterns.some(pattern => pattern.test(content));
}
```

## النسخ الاحتياطي والاستعادة

### إعداد النسخ الاحتياطي التلقائي

```javascript
// Cloud Function للنسخ الاحتياطي اليومي
exports.dailyBackup = functions.pubsub
  .schedule('0 2 * * *') // كل يوم في الساعة 2 صباحاً
  .timeZone('Asia/Qatar')
  .onRun(async (context) => {
    const projectId = process.env.GCLOUD_PROJECT;
    const timestamp = new Date().toISOString().split('T')[0];
    
    try {
      // إنشاء نسخة احتياطية من Firestore
      const client = new admin.firestore.v1.FirestoreAdminClient();
      const databaseName = client.databasePath(projectId, '(default)');
      const bucket = `gs://${projectId}-backups`;
      
      const responses = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: `${bucket}/firestore-backup-${timestamp}`,
        collectionIds: ['recalls', 'subscribers', 'notification_stats']
      });
      
      console.log(`تم إنشاء النسخة الاحتياطية: ${responses[0].name}`);
      
      // تنظيف النسخ القديمة (الاحتفاظ بآخر 30 يوم)
      await cleanupOldBackups(bucket);
      
    } catch (error) {
      console.error('خطأ في النسخ الاحتياطي:', error);
      
      // إرسال تنبيه للمسؤولين
      await sendBackupAlert('failed', error.message);
    }
  });
```

## التحديثات الأمنية

### فحص التبعيات

```bash
# فحص الثغرات الأمنية في الحزم
npm audit

# تحديث الحزم الآمنة
npm audit fix

# فحص متقدم
npm install -g snyk
snyk test
snyk monitor
```

### تحديث Firebase Security Rules

```bash
# اختبار القواعد قبل النشر
firebase firestore:rules:test

# نشر القواعد المحدثة
firebase deploy --only firestore:rules
```

## مراقبة الأداء والأمان

### إعداد التنبيهات

```javascript
// مراقبة استخدام الموارد
exports.resourceMonitor = functions.pubsub
  .schedule('*/15 * * * *') // كل 15 دقيقة
  .onRun(async (context) => {
    const stats = await getUsageStats();
    
    // تحقق من تجاوز الحدود
    if (stats.requests_per_minute > 1000) {
      await sendAlert('high_traffic', stats);
    }
    
    if (stats.error_rate > 0.05) { // أكثر من 5% أخطاء
      await sendAlert('high_error_rate', stats);
    }
    
    if (stats.storage_usage > 0.8) { // أكثر من 80% من التخزين
      await sendAlert('high_storage_usage', stats);
    }
  });
```

## الامتثال والخصوصية

### حماية البيانات الشخصية

```javascript
// تشفير البيانات الحساسة
const crypto = require('crypto');

function encryptSensitiveData(data) {
  const algorithm = 'aes-256-gcm';
  const key = process.env.ENCRYPTION_KEY;
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex')
  };
}
```

### سياسة الاحتفاظ بالبيانات

```javascript
// حذف البيانات القديمة تلقائياً
exports.dataRetentionCleanup = functions.pubsub
  .schedule('0 3 * * 0') // كل أحد في الساعة 3 صباحاً
  .onRun(async (context) => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 12); // الاحتفاظ بالبيانات لسنة واحدة
    
    // حذف الاستدعاءات القديمة
    const oldRecalls = await db.collection('recalls')
      .where('date', '<', cutoffDate)
      .get();
    
    const batch = db.batch();
    oldRecalls.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`تم حذف ${oldRecalls.size} استدعاء قديم`);
  });
```
