// firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

// تكوين Firebase - محدث للمشروع الجديد
firebase.initializeApp({
  apiKey: "AIzaSyBvOkBwNzEwNzEwNzEwNzEwNzEwNzEwNzEw",
  authDomain: "food-recalls-qatar.firebaseapp.com",
  projectId: "food-recalls-qatar",
  storageBucket: "food-recalls-qatar.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345678"
});

const messaging = firebase.messaging();

// التعامل مع الرسائل في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log("تم استلام رسالة في الخلفية: ", payload);
  
  const notificationTitle = payload.notification.title || "🚨 استدعاء غذائي جديد";
  const notificationOptions = {
    body: payload.notification.body || "تم اكتشاف استدعاء غذائي جديد",
    icon: "/assets/notify.png",
    badge: "/assets/badge.png",
    tag: "food-recall",
    requireInteraction: true,
    actions: [
      {
        action: "view",
        title: "عرض التفاصيل"
      },
      {
        action: "dismiss", 
        title: "إغلاق"
      }
    ],
    data: {
      url: "/",
      recall_id: payload.data?.recall_id || null
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  console.log('تم النقر على الإشعار:', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    // فتح الصفحة الرئيسية أو صفحة الاستدعاء المحدد
    const urlToOpen = event.notification.data?.url || '/';
    event.waitUntil(
      clients.matchAll({type: 'window'}).then((clientList) => {
        // البحث عن نافذة مفتوحة بالفعل
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // فتح نافذة جديدة إذا لم توجد
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});
