// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging.js";
import { getFirestore, doc, setDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// تكوين Firebase - استبدل هذه القيم بالقيم الحقيقية من Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "food-recalls-early-warning-qatar.firebaseapp.com",
  projectId: "food-recalls-early-warning-qatar",
  storageBucket: "food-recalls-early-warning-qatar.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// مفتاح VAPID - احصل عليه من Firebase Console > Project Settings > Cloud Messaging
const VAPID_KEY = "YOUR_VAPID_KEY";

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const db = getFirestore(app);

// متغيرات عامة
let fcmToken = null;
let notificationsEnabled = false;

// طلب إذن الإشعارات وتسجيل FCM Token
async function initializeNotifications() {
  try {
    // التحقق من دعم الإشعارات
    if (!('Notification' in window)) {
      console.log('هذا المتصفح لا يدعم الإشعارات');
      return false;
    }

    // طلب الإذن
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('تم منح إذن الإشعارات');
      
      // تسجيل Service Worker
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('تم تسجيل Service Worker');
      }

      // الحصول على FCM Token
      fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (fcmToken) {
        console.log('FCM Token:', fcmToken);
        notificationsEnabled = true;
        
        // حفظ التوكن في قاعدة البيانات
        await saveSubscription(fcmToken);
        
        // تحديث واجهة المستخدم
        updateNotificationStatus(true);
        
        return true;
      } else {
        console.log('لم يتم الحصول على FCM Token');
        return false;
      }
    } else {
      console.log('تم رفض إذن الإشعارات');
      updateNotificationStatus(false);
      return false;
    }
  } catch (error) {
    console.error('خطأ في تهيئة الإشعارات:', error);
    updateNotificationStatus(false);
    return false;
  }
}

// حفظ اشتراك المستخدم في قاعدة البيانات
async function saveSubscription(token) {
  try {
    await setDoc(doc(db, "subscribers", token), {
      token: token,
      subscribed_at: new Date(),
      active: true,
      user_agent: navigator.userAgent,
      last_seen: new Date()
    });
    console.log('تم حفظ الاشتراك بنجاح');
  } catch (error) {
    console.error('خطأ في حفظ الاشتراك:', error);
  }
}

// التعامل مع الرسائل أثناء فتح الصفحة
onMessage(messaging, (payload) => {
  console.log('تم استلام رسالة:', payload);
  
  // عرض الإشعار
  if (Notification.permission === 'granted') {
    const notification = new Notification(
      payload.notification.title || '🚨 استدعاء غذائي جديد',
      {
        body: payload.notification.body || 'تم اكتشاف استدعاء غذائي جديد',
        icon: '/assets/notify.png',
        badge: '/assets/badge.png',
        tag: 'food-recall',
        requireInteraction: true,
        data: payload.data
      }
    );

    // تشغيل صوت التنبيه
    playNotificationSound();
    
    // إضافة تأثير بصري
    showVisualAlert(payload.notification.title, payload.notification.body);
    
    // النقر على الإشعار
    notification.onclick = function(event) {
      event.preventDefault();
      window.focus();
      notification.close();
      
      // تحديث البيانات إذا لزم الأمر
      if (typeof refreshRecalls === 'function') {
        refreshRecalls();
      }
    };
  }
});

// تشغيل صوت التنبيه
function playNotificationSound() {
  try {
    const audio = new Audio('/assets/notification-sound.mp3');
    audio.volume = 0.7;
    audio.play().catch(e => console.log('لا يمكن تشغيل الصوت:', e));
  } catch (error) {
    console.log('خطأ في تشغيل الصوت:', error);
  }
}

// عرض تنبيه بصري في الصفحة
function showVisualAlert(title, body) {
  // إنشاء عنصر التنبيه
  const alertDiv = document.createElement('div');
  alertDiv.className = 'notification-alert';
  alertDiv.innerHTML = `
    <div class="alert-content">
      <div class="alert-icon">🚨</div>
      <div class="alert-text">
        <div class="alert-title">${title}</div>
        <div class="alert-body">${body}</div>
      </div>
      <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  // إضافة التنبيه للصفحة
  document.body.appendChild(alertDiv);
  
  // إزالة التنبيه تلقائياً بعد 10 ثوان
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 10000);
}

// تحديث حالة الإشعارات في الواجهة
function updateNotificationStatus(enabled) {
  const statusElement = document.getElementById('notification-status');
  const toggleButton = document.getElementById('notification-toggle');
  
  if (statusElement) {
    statusElement.textContent = enabled ? 'مفعلة' : 'معطلة';
    statusElement.className = enabled ? 'status-enabled' : 'status-disabled';
  }
  
  if (toggleButton) {
    toggleButton.textContent = enabled ? 'تعطيل الإشعارات' : 'تفعيل الإشعارات';
    toggleButton.className = enabled ? 'btn-disable' : 'btn-enable';
  }
}

// تبديل حالة الإشعارات
async function toggleNotifications() {
  if (notificationsEnabled) {
    // تعطيل الإشعارات
    if (fcmToken) {
      try {
        await setDoc(doc(db, "subscribers", fcmToken), {
          active: false,
          disabled_at: new Date()
        }, { merge: true });
        
        notificationsEnabled = false;
        updateNotificationStatus(false);
        
        showMessage('تم تعطيل الإشعارات', 'success');
      } catch (error) {
        console.error('خطأ في تعطيل الإشعارات:', error);
        showMessage('خطأ في تعطيل الإشعارات', 'error');
      }
    }
  } else {
    // تفعيل الإشعارات
    const success = await initializeNotifications();
    if (success) {
      showMessage('تم تفعيل الإشعارات بنجاح', 'success');
    } else {
      showMessage('فشل في تفعيل الإشعارات', 'error');
    }
  }
}

// إرسال تقرير عن مشكلة
async function reportIssue(recallId, issueType, description) {
  try {
    await addDoc(collection(db, "reports"), {
      recall_id: recallId,
      issue_type: issueType,
      description: description,
      reported_at: new Date(),
      user_token: fcmToken,
      status: 'pending'
    });
    
    showMessage('تم إرسال التقرير بنجاح', 'success');
  } catch (error) {
    console.error('خطأ في إرسال التقرير:', error);
    showMessage('خطأ في إرسال التقرير', 'error');
  }
}

// تصدير الدوال للاستخدام في ملفات أخرى
window.initializeNotifications = initializeNotifications;
window.toggleNotifications = toggleNotifications;
window.reportIssue = reportIssue;
window.notificationsEnabled = () => notificationsEnabled;

// تهيئة الإشعارات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  // تأخير قصير للسماح للصفحة بالتحميل كاملة
  setTimeout(initializeNotifications, 1000);
});
