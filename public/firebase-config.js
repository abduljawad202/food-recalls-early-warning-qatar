// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBvOkBwNzEwNzEwNzEwNzEwNzEwNzEwNzEw",
  authDomain: "food-recalls-qatar.firebaseapp.com",
  projectId: "food-recalls-qatar",
  storageBucket: "food-recalls-qatar.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345678",
  measurementId: "G-XXXXXXXXXX"
};

// تهيئة Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const analytics = getAnalytics(app);

// VAPID Key للإشعارات
const vapidKey = "BFkGGzcmQ1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0";

// متغيرات عامة
window.firebaseApp = app;
window.firebaseMessaging = messaging;
window.firebaseAnalytics = analytics;
window.vapidKey = vapidKey;

// إعدادات API
window.API_BASE_URL = 'https://us-central1-food-recalls-qatar.cloudfunctions.net';

console.log('✅ تم تحميل Firebase Configuration بنجاح');
