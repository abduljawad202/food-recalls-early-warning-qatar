// تكوين Firebase - محدث للمشروع الجديد
const firebaseConfig = {
  apiKey: "AIzaSyBvOkBwNzEwNzEwNzEwNzEwNzEwNzEwNzEw",
  authDomain: "food-recalls-qatar.firebaseapp.com",
  projectId: "food-recalls-qatar",
  storageBucket: "food-recalls-qatar.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345678",
  measurementId: "G-XXXXXXXXXX"
};

const VAPID_KEY = "BFkGGzcmQ1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0Q1h0";

// تكوين API - محدث للمشروع الجديد
const API = 'https://us-central1-food-recalls-qatar.cloudfunctions.net/recalls';

// متغيرات عامة
let allRecalls = [];
let filteredRecalls = [];
let currentPage = 1;
const itemsPerPage = 12;
let currentLanguage = localStorage.getItem('language') || 'ar';
let selectedRecall = null;
let lastUpdateTime = null;
let firebaseApp = null;
let messaging = null;

// النصوص متعددة اللغات
const translations = {
  ar: {
    title: "نظام الإنذار المبكر للاستدعاءات الغذائية - قطر",
    subtitle: "مراقبة مستمرة للسلامة الغذائية العالمية",
    loading: "جاري التحميل...",
    error: "حدث خطأ في تحميل البيانات",
    noData: "لا توجد بيانات متاحة",
    search: "البحث في الاستدعاءات...",
    filter: "تصفية",
    all: "الكل",
    urgent: "عاجل",
    international: "عالمي",
    national: "وطني",
    local: "محلي",
    country: "الدولة",
    agency: "الجهة",
    scope: "النطاق",
    qatarStatus: "وضع قطر",
    confirmed: "مؤكد",
    possible: "محتمل",
    notIndicated: "غير محدد",
    shareWhatsApp: "مشاركة واتساب",
    copyLink: "نسخ الرابط",
    exportData: "تصدير البيانات",
    enableNotifications: "تفعيل الإشعارات",
    testNotification: "إشعار تجريبي",
    lastUpdate: "آخر تحديث",
    showMore: "عرض المزيد",
    close: "إغلاق",
    details: "التفاصيل",
    source: "المصدر",
    date: "التاريخ",
    brand: "العلامة التجارية",
    lot: "رقم الدفعة",
    reason: "السبب",
    affectedRegions: "المناطق المتأثرة",
    worldwide: "عالمي",
    nationwide: "وطني", 
    subnational: "ولايات/مقاطعات",
    unknown: "غير محدد"
  },
  en: {
    title: "Food Recalls Early Warning System - Qatar",
    subtitle: "Continuous monitoring of global food safety",
    loading: "Loading...",
    error: "Error loading data",
    noData: "No data available",
    search: "Search recalls...",
    filter: "Filter",
    all: "All",
    urgent: "Urgent",
    international: "International",
    national: "National", 
    local: "Local",
    country: "Country",
    agency: "Agency",
    scope: "Scope",
    qatarStatus: "Qatar Status",
    confirmed: "Confirmed",
    possible: "Possible",
    notIndicated: "Not Indicated",
    shareWhatsApp: "Share WhatsApp",
    copyLink: "Copy Link",
    exportData: "Export Data",
    enableNotifications: "Enable Notifications",
    testNotification: "Test Notification",
    lastUpdate: "Last Update",
    showMore: "Show More",
    close: "Close",
    details: "Details",
    source: "Source",
    date: "Date",
    brand: "Brand",
    lot: "Lot Number",
    reason: "Reason",
    affectedRegions: "Affected Regions",
    worldwide: "Worldwide",
    nationwide: "Nationwide",
    subnational: "States/Provinces", 
    unknown: "Unknown"
  }
};

// دالة الترجمة
function t(key) {
  return translations[currentLanguage][key] || key;
}

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    console.log('تم تحميل التطبيق');
    
    // تطبيق اللغة المحفوظة
    applyLanguage();
    
    // تهيئة Firebase
    initializeFirebase();
    
    // تحميل البيانات الأولية
    loadRecalls();
    
    // تحديث البيانات كل دقيقتين
    setInterval(loadRecalls, 2 * 60 * 1000);
    
    // تهيئة الفلاتر
    initializeFilters();
    
    // تهيئة الأحداث
    initializeEventListeners();
    
    // تحديث واجهة المستخدم
    updateUI();
});

// تهيئة Firebase
async function initializeFirebase() {
    try {
        // تحقق من صحة التكوين
        if (firebaseConfig.apiKey === "YOUR_API_KEY") {
            console.warn("⚠️ يجب تحديث تكوين Firebase في app.js");
            return;
        }
        
        // تهيئة Firebase
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js');
        const { getMessaging, getToken, onMessage } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging.js');
        
        firebaseApp = initializeApp(firebaseConfig);
        messaging = getMessaging(firebaseApp);
        
        // تسجيل Service Worker
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('Service Worker مسجل بنجاح');
        }
        
        // طلب إذن الإشعارات
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('تم منح إذن الإشعارات');
            
            // الحصول على FCM token
            try {
                const token = await getToken(messaging, { vapidKey: VAPID_KEY });
                if (token) {
                    console.log('FCM Token:', token);
                    // حفظ التوكن في localStorage
                    localStorage.setItem('fcm_token', token);
                    
                    // الاشتراك في المواضيع
                    await subscribeToTopics(token);
                }
            } catch (tokenError) {
                console.error('خطأ في الحصول على FCM token:', tokenError);
            }
        }
        
        // الاستماع للإشعارات أثناء فتح التطبيق
        onMessage(messaging, (payload) => {
            console.log('تم استلام إشعار:', payload);
            
            // عرض الإشعار
            showInAppNotification(payload);
            
            // تشغيل صوت التنبيه
            playNotificationSound(payload.data?.urgent === 'true');
            
            // تحديث البيانات
            loadRecalls();
        });
        
    } catch (error) {
        console.error('خطأ في تهيئة Firebase:', error);
    }
}

// الاشتراك في المواضيع
async function subscribeToTopics(token) {
    try {
        const topics = ['all-users', 'qatar-relevant', 'urgent-recalls', 'international-recalls'];
        
        const response = await fetch(`${API.replace('/recalls', '')}/manageTopicSubscriptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: token,
                action: 'subscribe',
                topics: topics
            })
        });
        
        if (response.ok) {
            console.log('تم الاشتراك في المواضيع بنجاح');
        }
    } catch (error) {
        console.error('خطأ في الاشتراك في المواضيع:', error);
    }
}

// عرض إشعار داخل التطبيق
function showInAppNotification(payload) {
    const notification = document.createElement('div');
    notification.className = 'in-app-notification';
    
    // تحديد نوع الإشعار بناءً على البيانات
    let notificationClass = 'info';
    if (payload.data?.urgent === 'true') {
        notificationClass = 'urgent';
    } else if (payload.data?.qatar_status === 'confirmed') {
        notificationClass = 'qatar-confirmed';
    } else if (payload.data?.qatar_status === 'possible') {
        notificationClass = 'qatar-possible';
    }
    
    notification.classList.add(notificationClass);
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-title">${payload.notification.title}</div>
            <div class="notification-body">${payload.notification.body}</div>
            ${payload.data?.scope_label ? `<div class="notification-scope">${payload.data.scope_label}</div>` : ''}
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // إزالة الإشعار تلقائياً بعد 10 ثوان
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}

// تشغيل صوت التنبيه
function playNotificationSound(isUrgent = false) {
    try {
        const soundFile = isUrgent ? '/assets/urgent-sound.mp3' : '/assets/notification-sound.mp3';
        const audio = new Audio(soundFile);
        audio.volume = 0.7;
        audio.play().catch(e => {
            console.log('لا يمكن تشغيل الصوت:', e);
        });
    } catch (error) {
        console.error('خطأ في تشغيل الصوت:', error);
    }
}

// تطبيق اللغة
function applyLanguage() {
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    
    // تحديث زر اللغة
    const langButton = document.getElementById('languageToggle');
    if (langButton) {
        langButton.textContent = currentLanguage === 'ar' ? 'EN' : 'عربي';
    }
}

// تبديل اللغة
function toggleLanguage() {
    currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    localStorage.setItem('language', currentLanguage);
    applyLanguage();
    updateUI();
    renderRecalls();
}

// تحديث واجهة المستخدم
function updateUI() {
    // تحديث العناوين
    const titleElement = document.querySelector('h1');
    if (titleElement) {
        titleElement.textContent = t('title');
    }
    
    const subtitleElement = document.querySelector('.subtitle');
    if (subtitleElement) {
        subtitleElement.textContent = t('subtitle');
    }
    
    // تحديث placeholder للبحث
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.placeholder = t('search');
    }
    
    // تحديث أزرار الفلاتر
    updateFilterButtons();
    
    // تحديث الأزرار الأخرى
    updateActionButtons();
}

// تحديث أزرار الفلاتر
function updateFilterButtons() {
    const filterButtons = {
        'filter-all': t('all'),
        'filter-urgent': t('urgent'),
        'filter-international': t('international'),
        'filter-national': t('national'),
        'filter-local': t('local')
    };
    
    Object.entries(filterButtons).forEach(([id, text]) => {
        const button = document.getElementById(id);
        if (button) {
            button.textContent = text;
        }
    });
}

// تحديث أزرار الإجراءات
function updateActionButtons() {
    const actionButtons = {
        'enableNotifications': t('enableNotifications'),
        'testNotification': t('testNotification'),
        'exportData': t('exportData')
    };
    
    Object.entries(actionButtons).forEach(([id, text]) => {
        const button = document.getElementById(id);
        if (button) {
            button.textContent = text;
        }
    });
}

// تحميل البيانات من API
async function loadRecalls() {
    try {
        showLoading(true);
        
        const response = await fetch(API, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
            allRecalls = data.data;
            filteredRecalls = [...allRecalls];
            lastUpdateTime = new Date();
            
            // تحديث الإحصائيات
            updateStats();
            
            // عرض البيانات
            renderRecalls();
            
            // تحديث وقت آخر تحديث
            updateLastUpdateTime();
            
            console.log(`تم تحميل ${allRecalls.length} استدعاء`);
        } else {
            throw new Error(data.error || 'فشل في تحميل البيانات');
        }
        
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        showError(t('error'));
    } finally {
        showLoading(false);
    }
}

// عرض/إخفاء مؤشر التحميل
function showLoading(show) {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

// عرض رسالة خطأ
function showError(message) {
    const container = document.getElementById('recallsContainer');
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button onclick="loadRecalls()" class="retry-button">إعادة المحاولة</button>
            </div>
        `;
    }
}

// تحديث الإحصائيات
function updateStats() {
    const stats = {
        total: allRecalls.length,
        urgent: allRecalls.filter(r => r.qa_possible).length,
        international: allRecalls.filter(r => r.scope === 'international').length,
        qatarRelevant: allRecalls.filter(r => r.qatar_status === 'confirmed' || r.qatar_status === 'possible').length,
        countries: [...new Set(allRecalls.map(r => r.country))].length,
        agencies: [...new Set(allRecalls.map(r => r.agency))].length
    };
    
    // تحديث عناصر الإحصائيات في الواجهة
    updateStatElement('totalRecalls', stats.total);
    updateStatElement('urgentRecalls', stats.urgent);
    updateStatElement('internationalRecalls', stats.international);
    updateStatElement('qatarRelevant', stats.qatarRelevant);
    updateStatElement('countriesCount', stats.countries);
    updateStatElement('agenciesCount', stats.agencies);
}

// تحديث عنصر إحصائية واحد
function updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// عرض الاستدعاءات
function renderRecalls() {
    const container = document.getElementById('recallsContainer');
    if (!container) return;
    
    if (filteredRecalls.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-search"></i>
                <p>${t('noData')}</p>
            </div>
        `;
        return;
    }
    
    // حساب البيانات للصفحة الحالية
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageRecalls = filteredRecalls.slice(startIndex, endIndex);
    
    // إنشاء HTML للبطاقات
    const recallsHTML = pageRecalls.map(recall => createRecallCard(recall)).join('');
    
    container.innerHTML = recallsHTML;
    
    // تحديث أزرار التصفح
    updatePaginationButtons();
}

// إنشاء بطاقة استدعاء
function createRecallCard(recall) {
    // تحديد أيقونة وضع قطر
    const qatarStatusIcon = {
        'confirmed': '🇶🇦',
        'possible': '⚠️',
        'not_indicated': '❌'
    }[recall.qatar_status] || '❓';
    
    // تحديد لون البطاقة بناءً على الأهمية
    let cardClass = 'recall-card';
    if (recall.qa_possible) {
        cardClass += ' urgent';
    } else if (recall.qatar_status === 'confirmed') {
        cardClass += ' qatar-confirmed';
    } else if (recall.qatar_status === 'possible') {
        cardClass += ' qatar-possible';
    }
    
    // تنسيق التاريخ
    const date = new Date(recall.date);
    const formattedDate = currentLanguage === 'ar' ? 
        date.toLocaleDateString('ar-SA') : 
        date.toLocaleDateString('en-US');
    
    // تحديد نص النطاق الجغرافي
    const scopeText = {
        'international': t('worldwide'),
        'nationwide': t('nationwide'),
        'subnational': t('subnational'),
        'local': t('local'),
        'unknown': t('unknown')
    }[recall.scope] || recall.scope_label || t('unknown');
    
    return `
        <div class="${cardClass}" onclick="showRecallDetails('${recall.id}')">
            <div class="card-header">
                <div class="card-title">${recall.title}</div>
                <div class="card-badges">
                    ${recall.qa_possible ? '<span class="badge urgent">عاجل</span>' : ''}
                    <span class="badge scope">${scopeText}</span>
                    <span class="badge qatar-status">${qatarStatusIcon}</span>
                </div>
            </div>
            
            <div class="card-content">
                <div class="card-info">
                    <div class="info-item">
                        <strong>${t('brand')}:</strong> ${recall.brand}
                    </div>
                    <div class="info-item">
                        <strong>${t('country')}:</strong> ${recall.country}
                    </div>
                    <div class="info-item">
                        <strong>${t('agency')}:</strong> ${recall.agency}
                    </div>
                    <div class="info-item">
                        <strong>${t('date')}:</strong> ${formattedDate}
                    </div>
                </div>
                
                <div class="card-reason">
                    <strong>${t('reason')}:</strong> ${recall.reason}
                </div>
                
                ${recall.affected_regions && recall.affected_regions.length > 0 ? `
                    <div class="affected-regions">
                        <strong>${t('affectedRegions')}:</strong> ${recall.affected_regions.join(', ')}
                    </div>
                ` : ''}
            </div>
            
            <div class="card-actions">
                <button onclick="event.stopPropagation(); shareWhatsApp('${recall.id}')" class="action-btn whatsapp">
                    <i class="fab fa-whatsapp"></i> ${t('shareWhatsApp')}
                </button>
                <button onclick="event.stopPropagation(); copyRecallLink('${recall.id}')" class="action-btn copy">
                    <i class="fas fa-copy"></i> ${t('copyLink')}
                </button>
            </div>
        </div>
    `;
}

// عرض تفاصيل الاستدعاء
function showRecallDetails(recallId) {
    const recall = allRecalls.find(r => r.id === recallId);
    if (!recall) return;
    
    selectedRecall = recall;
    
    // إنشاء النافذة المنبثقة
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = createRecallDetailsHTML(recall);
    
    document.body.appendChild(modal);
    
    // إضافة مستمع لإغلاق النافذة
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// إنشاء HTML لتفاصيل الاستدعاء
function createRecallDetailsHTML(recall) {
    const date = new Date(recall.date);
    const formattedDate = currentLanguage === 'ar' ? 
        date.toLocaleDateString('ar-SA', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 
        date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    
    const qatarStatusText = {
        'confirmed': `${t('confirmed')} 🇶🇦`,
        'possible': `${t('possible')} ⚠️`,
        'not_indicated': `${t('notIndicated')} ❌`
    }[recall.qatar_status] || t('unknown');
    
    const scopeText = {
        'international': t('worldwide'),
        'nationwide': t('nationwide'),
        'subnational': t('subnational'),
        'local': t('local'),
        'unknown': t('unknown')
    }[recall.scope] || recall.scope_label || t('unknown');
    
    return `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${t('details')}</h2>
                <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            
            <div class="modal-body">
                <div class="detail-section">
                    <h3>${recall.title}</h3>
                    ${recall.qa_possible ? '<div class="urgent-badge">🚨 استدعاء عاجل</div>' : ''}
                </div>
                
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>${t('brand')}:</label>
                        <span>${recall.brand}</span>
                    </div>
                    
                    <div class="detail-item">
                        <label>${t('lot')}:</label>
                        <span>${recall.lot}</span>
                    </div>
                    
                    <div class="detail-item">
                        <label>${t('country')}:</label>
                        <span>${recall.country}</span>
                    </div>
                    
                    <div class="detail-item">
                        <label>${t('agency')}:</label>
                        <span>${recall.agency}</span>
                    </div>
                    
                    <div class="detail-item">
                        <label>${t('scope')}:</label>
                        <span>${scopeText}</span>
                    </div>
                    
                    <div class="detail-item">
                        <label>${t('qatarStatus')}:</label>
                        <span>${qatarStatusText}</span>
                    </div>
                    
                    <div class="detail-item">
                        <label>${t('date')}:</label>
                        <span>${formattedDate}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <label>${t('reason')}:</label>
                    <p>${recall.reason}</p>
                </div>
                
                ${recall.affected_regions && recall.affected_regions.length > 0 ? `
                    <div class="detail-section">
                        <label>${t('affectedRegions')}:</label>
                        <div class="regions-list">
                            ${recall.affected_regions.map(region => `<span class="region-tag">${region}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${recall.image ? `
                    <div class="detail-section">
                        <label>صورة المنتج:</label>
                        <img src="${recall.image}" alt="صورة المنتج" class="product-image">
                    </div>
                ` : ''}
            </div>
            
            <div class="modal-footer">
                <button onclick="shareWhatsApp('${recall.id}')" class="btn btn-whatsapp">
                    <i class="fab fa-whatsapp"></i> ${t('shareWhatsApp')}
                </button>
                <button onclick="copyRecallLink('${recall.id}')" class="btn btn-copy">
                    <i class="fas fa-copy"></i> ${t('copyLink')}
                </button>
                <a href="${recall.source_url}" target="_blank" class="btn btn-source">
                    <i class="fas fa-external-link-alt"></i> ${t('source')}
                </a>
            </div>
        </div>
    `;
}

// إغلاق النافذة المنبثقة
function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
    selectedRecall = null;
}

// مشاركة عبر واتساب
function shareWhatsApp(recallId) {
    const recall = allRecalls.find(r => r.id === recallId);
    if (!recall) return;
    
    // إنشاء رسالة رسمية
    const qatarStatusEmoji = {
        'confirmed': '🇶🇦',
        'possible': '⚠️',
        'not_indicated': '❌'
    }[recall.qatar_status] || '❓';
    
    const scopeText = {
        'international': 'عالمي',
        'nationwide': 'وطني',
        'subnational': 'ولايات/مقاطعات',
        'local': 'محلي',
        'unknown': 'غير محدد'
    }[recall.scope] || recall.scope_label || 'غير محدد';
    
    const date = new Date(recall.date);
    const formattedDate = date.toISOString().split('T')[0];
    const formattedTime = date.toISOString().split('T')[1].split('.')[0] + ' UTC';
    
    let message = `🚨 *تنبيه استدعاء غذائي رسمي*\n\n`;
    message += `📦 *المنتج:* ${recall.title}\n`;
    message += `🏷️ *العلامة التجارية:* ${recall.brand}\n`;
    message += `🔢 *رقم الدفعة:* ${recall.lot}\n`;
    message += `⚠️ *السبب:* ${recall.reason}\n\n`;
    message += `🌍 *النطاق الجغرافي:* ${scopeText}\n`;
    message += `🏛️ *الجهة المصدرة:* ${recall.agency} (${recall.country})\n`;
    message += `${qatarStatusEmoji} *وضع قطر:* ${recall.qatar_status === 'confirmed' ? 'مؤكد' : recall.qatar_status === 'possible' ? 'محتمل' : 'غير محدد'}\n\n`;
    
    if (recall.affected_regions && recall.affected_regions.length > 0) {
        message += `📍 *المناطق المتأثرة:* ${recall.affected_regions.join(', ')}\n\n`;
    }
    
    message += `📅 *التاريخ:* ${formattedDate}\n`;
    message += `🕐 *الوقت:* ${formattedTime}\n\n`;
    message += `🔗 *المصدر الرسمي:* ${recall.source_url}\n`;
    
    if (recall.image) {
        message += `🖼️ *صورة المنتج:* ${recall.image}\n`;
    }
    
    message += `\n📱 *نظام الإنذار المبكر للاستدعاءات الغذائية - قطر*`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}

// نسخ رابط الاستدعاء
async function copyRecallLink(recallId) {
    const recall = allRecalls.find(r => r.id === recallId);
    if (!recall) return;
    
    const link = `${window.location.origin}?recall=${recallId}`;
    
    try {
        await navigator.clipboard.writeText(link);
        showToast('تم نسخ الرابط بنجاح');
    } catch (error) {
        console.error('خطأ في نسخ الرابط:', error);
        showToast('فشل في نسخ الرابط');
    }
}

// عرض رسالة مؤقتة
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

// تهيئة الفلاتر
function initializeFilters() {
    // فلتر البحث
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterRecalls();
        });
    }
    
    // فلاتر الأزرار
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // إزالة الفئة النشطة من جميع الأزرار
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // إضافة الفئة النشطة للزر المحدد
            this.classList.add('active');
            
            // تطبيق الفلتر
            filterRecalls();
        });
    });
}

// تصفية الاستدعاءات
function filterRecalls() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const activeFilter = document.querySelector('.filter-btn.active')?.id || 'filter-all';
    
    filteredRecalls = allRecalls.filter(recall => {
        // فلتر البحث
        const matchesSearch = !searchTerm || 
            recall.title.toLowerCase().includes(searchTerm) ||
            recall.brand.toLowerCase().includes(searchTerm) ||
            recall.reason.toLowerCase().includes(searchTerm) ||
            recall.country.toLowerCase().includes(searchTerm) ||
            recall.agency.toLowerCase().includes(searchTerm);
        
        // فلتر الفئة
        let matchesFilter = true;
        switch (activeFilter) {
            case 'filter-urgent':
                matchesFilter = recall.qa_possible;
                break;
            case 'filter-international':
                matchesFilter = recall.scope === 'international';
                break;
            case 'filter-national':
                matchesFilter = recall.scope === 'nationwide';
                break;
            case 'filter-local':
                matchesFilter = recall.scope === 'local' || recall.scope === 'subnational';
                break;
            default:
                matchesFilter = true;
        }
        
        return matchesSearch && matchesFilter;
    });
    
    // إعادة تعيين الصفحة الحالية
    currentPage = 1;
    
    // عرض النتائج
    renderRecalls();
}

// تهيئة مستمعي الأحداث
function initializeEventListeners() {
    // زر تبديل اللغة
    const langButton = document.getElementById('languageToggle');
    if (langButton) {
        langButton.addEventListener('click', toggleLanguage);
    }
    
    // زر تفعيل الإشعارات
    const notificationButton = document.getElementById('enableNotifications');
    if (notificationButton) {
        notificationButton.addEventListener('click', enableNotifications);
    }
    
    // زر الإشعار التجريبي
    const testButton = document.getElementById('testNotification');
    if (testButton) {
        testButton.addEventListener('click', sendTestNotification);
    }
    
    // زر تصدير البيانات
    const exportButton = document.getElementById('exportData');
    if (exportButton) {
        exportButton.addEventListener('click', exportData);
    }
    
    // زر تحديث البيانات
    const refreshButton = document.getElementById('refreshData');
    if (refreshButton) {
        refreshButton.addEventListener('click', refreshData);
    }
    
    // أزرار التصفح
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderRecalls();
            }
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredRecalls.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderRecalls();
            }
        });
    }
}

// تفعيل الإشعارات
async function enableNotifications() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            showToast('تم تفعيل الإشعارات بنجاح');
            
            // إعادة تهيئة Firebase للحصول على التوكن
            await initializeFirebase();
        } else {
            showToast('تم رفض إذن الإشعارات');
        }
    } catch (error) {
        console.error('خطأ في تفعيل الإشعارات:', error);
        showToast('فشل في تفعيل الإشعارات');
    }
}

// إرسال إشعار تجريبي
async function sendTestNotification() {
    try {
        const response = await fetch(`${API.replace('/recalls', '')}/sendTestNotification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            showToast('تم إرسال الإشعار التجريبي');
        } else {
            throw new Error('فشل في إرسال الإشعار');
        }
    } catch (error) {
        console.error('خطأ في إرسال الإشعار التجريبي:', error);
        showToast('فشل في إرسال الإشعار التجريبي');
    }
}

// تصدير البيانات
function exportData() {
    if (filteredRecalls.length === 0) {
        showToast('لا توجد بيانات للتصدير');
        return;
    }
    
    // إعداد البيانات للتصدير
    const exportData = filteredRecalls.map(recall => ({
        'العنوان': recall.title,
        'العلامة التجارية': recall.brand,
        'رقم الدفعة': recall.lot,
        'السبب': recall.reason,
        'التاريخ': new Date(recall.date).toLocaleDateString('ar-SA'),
        'النطاق': recall.scope_label || recall.scope,
        'الدولة': recall.country,
        'الجهة': recall.agency,
        'وضع قطر': recall.qatar_status,
        'المناطق المتأثرة': recall.affected_regions ? recall.affected_regions.join(', ') : '',
        'عاجل': recall.qa_possible ? 'نعم' : 'لا',
        'المصدر': recall.source_url
    }));
    
    // تحويل إلى CSV
    const csvContent = convertToCSV(exportData);
    
    // تحميل الملف
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `food-recalls-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('تم تصدير البيانات بنجاح');
}

// تحويل البيانات إلى CSV
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // إضافة الرؤوس
    csvRows.push(headers.join(','));
    
    // إضافة البيانات
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] || '';
            // تنظيف القيم وإضافة علامات اقتباس إذا لزم الأمر
            return `"${value.toString().replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
}

// تحديث البيانات يدوياً
async function refreshData() {
    try {
        showLoading(true);
        
        const response = await fetch(API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(`تم تحديث البيانات: ${result.message}`);
            
            // إعادة تحميل البيانات
            await loadRecalls();
        } else {
            throw new Error('فشل في تحديث البيانات');
        }
    } catch (error) {
        console.error('خطأ في تحديث البيانات:', error);
        showToast('فشل في تحديث البيانات');
    } finally {
        showLoading(false);
    }
}

// تحديث أزرار التصفح
function updatePaginationButtons() {
    const totalPages = Math.ceil(filteredRecalls.length / itemsPerPage);
    
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    
    if (prevButton) {
        prevButton.disabled = currentPage <= 1;
    }
    
    if (nextButton) {
        nextButton.disabled = currentPage >= totalPages;
    }
    
    if (pageInfo) {
        pageInfo.textContent = `${currentPage} من ${totalPages}`;
    }
}

// تحديث وقت آخر تحديث
function updateLastUpdateTime() {
    const element = document.getElementById('lastUpdateTime');
    if (element && lastUpdateTime) {
        const timeString = currentLanguage === 'ar' ? 
            lastUpdateTime.toLocaleString('ar-SA') : 
            lastUpdateTime.toLocaleString('en-US');
        element.textContent = `${t('lastUpdate')}: ${timeString}`;
    }
}

// معالجة الأخطاء العامة
window.addEventListener('error', function(e) {
    console.error('خطأ في التطبيق:', e.error);
});

// معالجة الأخطاء غير المعالجة في Promise
window.addEventListener('unhandledrejection', function(e) {
    console.error('خطأ غير معالج في Promise:', e.reason);
});

// تصدير الدوال للاستخدام العام
window.toggleLanguage = toggleLanguage;
window.showRecallDetails = showRecallDetails;
window.closeModal = closeModal;
window.shareWhatsApp = shareWhatsApp;
window.copyRecallLink = copyRecallLink;
window.enableNotifications = enableNotifications;
window.sendTestNotification = sendTestNotification;
window.exportData = exportData;
window.refreshData = refreshData;
