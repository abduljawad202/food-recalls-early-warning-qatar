// نظام الإنذار المبكر للاستدعاءات الغذائية - دولة قطر
// Enhanced Application Logic

// متغيرات عامة
let currentRecalls = [];
let filteredRecalls = [];
let currentPage = 1;
let totalPages = 1;
let currentFilter = 'all';
let currentSearch = '';
let isLoading = false;
let currentLanguage = localStorage.getItem('language') || 'ar';
let lastUpdateTime = null;
let autoRefreshInterval = null;

// إعدادات API
const API_CONFIG = {
    BASE_URL: 'https://us-central1-food-recalls-qatar.cloudfunctions.net',
    ENDPOINTS: {
        recalls: '/recalls',
        scheduledUpdate: '/scheduledUpdate',
        testNotification: '/sendTestNotification',
        topicSubscriptions: '/manageTopicSubscriptions'
    },
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000
};

// مصادر البيانات المعتمدة
const DATA_SOURCES = {
    FDA: {
        name: 'FDA',
        country: 'USA',
        fullName: 'U.S. Food and Drug Administration',
        api: 'openFDA Food Enforcement API',
        scope: 'international'
    },
    CFIA: {
        name: 'CFIA/Health Canada',
        country: 'Canada',
        fullName: 'Canadian Food Inspection Agency / Health Canada',
        api: 'Canada Recalls API',
        scope: 'international'
    },
    SFDA: {
        name: 'SFDA',
        country: 'Saudi Arabia',
        fullName: 'Saudi Food & Drug Authority',
        api: 'SFDA Recalls Feed',
        scope: 'national'
    },
    FSANZ: {
        name: 'FSANZ',
        country: 'Australia/New Zealand',
        fullName: 'Food Standards Australia New Zealand',
        api: 'FSANZ Recalls API',
        scope: 'international'
    }
};

// النصوص متعددة اللغات
const translations = {
    ar: {
        title: "نظام الإنذار المبكر للاستدعاءات الغذائية - دولة قطر",
        subtitle: "مراقبة مستمرة للسلامة الغذائية العالمية",
        loading: "جاري تحميل البيانات...",
        error: "حدث خطأ في تحميل البيانات",
        noData: "لا توجد استدعاءات تطابق معايير البحث",
        search: "البحث في الاستدعاءات...",
        filters: "تصفية النتائج",
        actions: "الإجراءات",
        all: "الكل",
        urgent: "عاجل",
        international: "عالمي",
        qatar: "قطر",
        gulf: "الخليج",
        refresh: "تحديث",
        notifications: "تفعيل الإشعارات",
        test: "إشعار تجريبي",
        export: "تصدير",
        whatsapp: "واتساب",
        previous: "السابق",
        next: "التالي",
        lastUpdate: "آخر تحديث:",
        totalRecalls: "إجمالي الاستدعاءات",
        urgentRecalls: "استدعاءات عاجلة",
        internationalRecalls: "استدعاءات عالمية",
        qatarRelevant: "ذات صلة بقطر",
        countriesCount: "عدد البلدان",
        agenciesCount: "عدد الوكالات",
        confirmed: "مؤكد في قطر",
        possible: "محتمل في قطر",
        notIndicated: "غير محدد",
        brand: "العلامة التجارية",
        lot: "رقم اللوت",
        reason: "السبب",
        agency: "الوكالة",
        country: "البلد",
        date: "التاريخ",
        scope: "النطاق",
        distribution: "منطقة التوزيع",
        affectedRegions: "المناطق المتأثرة",
        sourceLink: "المصدر الأصلي",
        shareWhatsApp: "مشاركة واتساب",
        copyInfo: "نسخ المعلومات",
        worldwide: "عالمي",
        nationwide: "وطني",
        subnational: "ولايات/مقاطعات",
        local: "محلي",
        unknown: "غير محدد"
    },
    en: {
        title: "Food Recalls Early Warning System - State of Qatar",
        subtitle: "Continuous monitoring of global food safety",
        loading: "Loading data...",
        error: "Error loading data",
        noData: "No recalls match the search criteria",
        search: "Search recalls...",
        filters: "Filter Results",
        actions: "Actions",
        all: "All",
        urgent: "Urgent",
        international: "International",
        qatar: "Qatar",
        gulf: "Gulf",
        refresh: "Refresh",
        notifications: "Enable Notifications",
        test: "Test Notification",
        export: "Export",
        whatsapp: "WhatsApp",
        previous: "Previous",
        next: "Next",
        lastUpdate: "Last Update:",
        totalRecalls: "Total Recalls",
        urgentRecalls: "Urgent Recalls",
        internationalRecalls: "International Recalls",
        qatarRelevant: "Qatar Relevant",
        countriesCount: "Countries Count",
        agenciesCount: "Agencies Count",
        confirmed: "Confirmed in Qatar",
        possible: "Possible in Qatar",
        notIndicated: "Not Indicated",
        brand: "Brand",
        lot: "Lot Number",
        reason: "Reason",
        agency: "Agency",
        country: "Country",
        date: "Date",
        scope: "Scope",
        distribution: "Distribution Area",
        affectedRegions: "Affected Regions",
        sourceLink: "Original Source",
        shareWhatsApp: "Share WhatsApp",
        copyInfo: "Copy Information",
        worldwide: "Worldwide",
        nationwide: "Nationwide",
        subnational: "States/Provinces",
        local: "Local",
        unknown: "Unknown"
    }
};

// دالة الترجمة
function t(key) {
    return translations[currentLanguage][key] || key;
}

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء تحميل نظام الإنذار المبكر...');
    
    initializeApp();
    setupEventListeners();
    applyLanguage();
    loadRecalls();
    
    // تحديث تلقائي كل 5 دقائق
    autoRefreshInterval = setInterval(loadRecalls, 5 * 60 * 1000);
    
    console.log('✅ تم تحميل النظام بنجاح');
});

// تهيئة التطبيق
async function initializeApp() {
    try {
        // تهيئة Firebase إذا كان متاحاً
        if (window.firebaseApp && window.firebaseMessaging) {
            await initializeFirebaseMessaging();
        }
        
        // تهيئة Service Worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                console.log('✅ Service Worker مسجل بنجاح');
            } catch (error) {
                console.warn('⚠️ فشل في تسجيل Service Worker:', error);
            }
        }
        
        // تحديث الإحصائيات الأولية
        updateStats({
            total: 0,
            urgent: 0,
            international: 0,
            qatar_relevant: 0,
            countries_count: 0,
            agencies_count: 0
        });
        
    } catch (error) {
        console.error('❌ خطأ في تهيئة التطبيق:', error);
    }
}

// تهيئة Firebase Messaging
async function initializeFirebaseMessaging() {
    try {
        // طلب إذن الإشعارات
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('✅ تم منح إذن الإشعارات');
            
            // الحصول على FCM token
            if (window.vapidKey) {
                const token = await getToken(window.firebaseMessaging, {
                    vapidKey: window.vapidKey
                });
                
                if (token) {
                    console.log('✅ تم الحصول على FCM token');
                    localStorage.setItem('fcm_token', token);
                    
                    // الاشتراك في المواضيع
                    await subscribeToTopics(token);
                }
            }
            
            // الاستماع للرسائل
            onMessage(window.firebaseMessaging, (payload) => {
                console.log('📨 تم استلام رسالة:', payload);
                handleIncomingMessage(payload);
            });
        }
        
    } catch (error) {
        console.error('❌ خطأ في تهيئة Firebase Messaging:', error);
    }
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // البحث
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            currentSearch = this.value.trim();
            currentPage = 1;
            filterAndDisplayRecalls();
        }, 500));
    }
    
    // تحديث الوقت والتاريخ
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // أصوات الأزرار
    document.addEventListener('click', function(e) {
        if (e.target.closest('.btn-sound')) {
            playButtonSound();
        }
    });
    
    // اختصارات لوحة المفاتيح
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'r':
                    e.preventDefault();
                    refreshData();
                    break;
                case 'f':
                    e.preventDefault();
                    searchInput?.focus();
                    break;
                case 'e':
                    e.preventDefault();
                    exportData();
                    break;
            }
        }
    });
}

// تطبيق اللغة
function applyLanguage() {
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    
    // تحديث النصوص
    updateUITexts();
    
    // تحديث زر اللغة
    const langButton = document.getElementById('languageToggle');
    if (langButton) {
        const span = langButton.querySelector('span');
        if (span) {
            span.textContent = currentLanguage === 'ar' ? 'EN' : 'عربي';
        }
    }
}

// تحديث نصوص الواجهة
function updateUITexts() {
    const elements = {
        'mainTitle': 'title',
        'subtitle': 'subtitle',
        'filtersTitle': 'filters',
        'searchTitle': 'search',
        'actionsTitle': 'actions',
        'refreshText': 'refresh',
        'notificationsText': 'notifications',
        'testText': 'test',
        'exportText': 'export',
        'whatsappText': 'whatsapp',
        'prevText': 'previous',
        'nextText': 'next',
        'lastUpdateLabel': 'lastUpdate',
        'totalRecallsLabel': 'totalRecalls',
        'urgentRecallsLabel': 'urgentRecalls',
        'internationalRecallsLabel': 'internationalRecalls',
        'qatarRelevantLabel': 'qatarRelevant',
        'countriesCountLabel': 'countriesCount',
        'agenciesCountLabel': 'agenciesCount',
        'loadingText': 'loading'
    };
    
    Object.entries(elements).forEach(([id, key]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = t(key);
        }
    });
    
    // تحديث placeholders
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.placeholder = t('search');
    }
    
    // تحديث أزرار الفلاتر
    const filterButtons = {
        'filter-all': 'all',
        'filter-urgent': 'urgent',
        'filter-international': 'international',
        'filter-qatar': 'qatar',
        'filter-gulf': 'gulf'
    };
    
    Object.entries(filterButtons).forEach(([id, key]) => {
        const button = document.getElementById(id);
        if (button) {
            const span = button.querySelector('span') || button;
            span.textContent = t(key);
        }
    });
}

// تبديل اللغة
function toggleLanguage() {
    currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    localStorage.setItem('language', currentLanguage);
    applyLanguage();
    filterAndDisplayRecalls();
    playButtonSound();
}

// تحديث الوقت والتاريخ
function updateDateTime() {
    const now = new Date();
    const timeOptions = { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
    };
    const dateOptions = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        weekday: 'long'
    };
    
    const locale = currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
    
    const timeElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');
    
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString(locale, timeOptions);
    }
    
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString(locale, dateOptions);
    }
}

// تحميل البيانات من API
async function loadRecalls() {
    if (isLoading) return;
    
    isLoading = true;
    showLoader(true);
    
    try {
        console.log('📡 جاري تحميل البيانات من API...');
        
        const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.recalls}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Qatar-Food-Recalls-System/1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
            currentRecalls = data.data;
            lastUpdateTime = new Date();
            
            // تحديث الإحصائيات
            updateStats(data.stats || calculateStats(currentRecalls));
            
            // تصفية وعرض البيانات
            filterAndDisplayRecalls();
            
            // تحديث وقت آخر تحديث
            updateLastUpdateTime();
            
            console.log(`✅ تم تحميل ${currentRecalls.length} استدعاء بنجاح`);
            
            // إرسال إشعار إذا كانت هناك استدعاءات جديدة عاجلة
            checkForUrgentRecalls(currentRecalls);
            
        } else {
            throw new Error(data.error || 'فشل في تحميل البيانات');
        }
        
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        showError(t('error') + ': ' + error.message);
    } finally {
        isLoading = false;
        showLoader(false);
    }
}

// جلب البيانات مع إعادة المحاولة
async function fetchWithRetry(url, options, attempts = API_CONFIG.RETRY_ATTEMPTS) {
    for (let i = 0; i < attempts; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
            
        } catch (error) {
            console.warn(`محاولة ${i + 1} فشلت:`, error.message);
            
            if (i === attempts - 1) throw error;
            
            // انتظار قبل إعادة المحاولة
            await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY * (i + 1)));
        }
    }
}

// حساب الإحصائيات
function calculateStats(recalls) {
    return {
        total: recalls.length,
        urgent: recalls.filter(r => r.urgent || r.qa_possible).length,
        international: recalls.filter(r => r.scope === 'international').length,
        qatar_relevant: recalls.filter(r => r.qatar_status === 'confirmed' || r.qatar_status === 'possible').length,
        countries_count: [...new Set(recalls.map(r => r.country))].length,
        agencies_count: [...new Set(recalls.map(r => r.agency))].length
    };
}

// تحديث الإحصائيات
function updateStats(stats) {
    const statElements = {
        'totalRecalls': stats.total || 0,
        'urgentRecalls': stats.urgent || 0,
        'internationalRecalls': stats.international || 0,
        'qatarRelevant': stats.qatar_relevant || 0,
        'countriesCount': stats.countries_count || 0,
        'agenciesCount': stats.agencies_count || 0
    };
    
    Object.entries(statElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            // تأثير العد التصاعدي
            animateNumber(element, parseInt(element.textContent) || 0, value, 1000);
        }
    });
}

// تأثير العد التصاعدي للأرقام
function animateNumber(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 16);
}

// تصفية وعرض الاستدعاءات
function filterAndDisplayRecalls() {
    // تطبيق الفلاتر
    filteredRecalls = currentRecalls.filter(recall => {
        // فلتر البحث
        if (currentSearch) {
            const searchTerm = currentSearch.toLowerCase();
            const searchableText = [
                recall.title,
                recall.brand,
                recall.reason,
                recall.agency,
                recall.country,
                recall.lot
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        // فلتر النوع
        switch (currentFilter) {
            case 'urgent':
                return recall.urgent || recall.qa_possible;
            case 'international':
                return recall.scope === 'international';
            case 'qatar':
                return recall.qatar_status === 'confirmed' || recall.qatar_status === 'possible';
            case 'gulf':
                const gulfCountries = ['Saudi Arabia', 'UAE', 'Kuwait', 'Bahrain', 'Oman', 'Qatar'];
                return gulfCountries.some(country => 
                    recall.country.includes(country) || 
                    recall.affected_regions?.some(region => region.includes(country))
                );
            default:
                return true;
        }
    });
    
    // حساب عدد الصفحات
    const itemsPerPage = 10;
    totalPages = Math.ceil(filteredRecalls.length / itemsPerPage);
    
    // التأكد من أن الصفحة الحالية صالحة
    if (currentPage > totalPages) {
        currentPage = Math.max(1, totalPages);
    }
    
    // عرض البيانات
    displayRecalls();
    updatePagination();
}

// عرض الاستدعاءات
function displayRecalls() {
    const container = document.getElementById('recallsContainer');
    if (!container) return;
    
    if (filteredRecalls.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #6C757D;">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i>
                <h3>${t('noData')}</h3>
                <p>يرجى تجربة معايير بحث مختلفة أو إزالة الفلاتر.</p>
            </div>
        `;
        return;
    }
    
    // حساب البيانات للصفحة الحالية
    const itemsPerPage = 10;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageRecalls = filteredRecalls.slice(startIndex, endIndex);
    
    // إنشاء HTML للبطاقات
    container.innerHTML = pageRecalls.map((recall, index) => 
        createRecallCard(recall, startIndex + index)
    ).join('');
    
    // إضافة تأثيرات الحركة
    container.querySelectorAll('.recall-card').forEach((card, index) => {
        card.classList.add('fade-in-up');
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// إنشاء بطاقة استدعاء
function createRecallCard(recall, index) {
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
    
    const qatarStatusBadge = getQatarStatusBadge(recall.qatar_status);
    const scopeBadge = getScopeBadge(recall.scope, recall.scope_label);
    const urgentBadge = (recall.urgent || recall.qa_possible) ? 
        '<span class="status-badge status-urgent">🚨 عاجل</span>' : '';
    
    return `
        <div class="recall-card ${(recall.urgent || recall.qa_possible) ? 'urgent' : ''}" data-recall-id="${recall.id}">
            <div class="recall-header">
                <div style="flex: 1;">
                    <h3 class="recall-title">${escapeHtml(recall.title)}</h3>
                    <div class="recall-meta">
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>${formattedDate}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-building"></i>
                            <span>${escapeHtml(recall.agency)} - ${escapeHtml(recall.country)}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-industry"></i>
                            <span>${escapeHtml(recall.brand)}</span>
                        </div>
                        ${recall.lot && recall.lot !== 'غير محدد' ? `
                        <div class="meta-item">
                            <i class="fas fa-barcode"></i>
                            <span>${t('lot')}: ${escapeHtml(recall.lot)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="status-badges">
                    ${urgentBadge}
                    ${scopeBadge}
                    ${qatarStatusBadge}
                </div>
            </div>
            
            <div class="recall-content">
                <p class="recall-description">
                    <strong>${t('reason')}:</strong> ${escapeHtml(recall.reason)}
                </p>
                ${recall.distribution && recall.distribution !== 'غير محدد' ? `
                <p class="recall-description">
                    <strong>${t('distribution')}:</strong> ${escapeHtml(recall.distribution)}
                </p>
                ` : ''}
                ${recall.affected_regions && recall.affected_regions.length > 0 ? `
                <p class="recall-description">
                    <strong>${t('affectedRegions')}:</strong> ${recall.affected_regions.map(escapeHtml).join(', ')}
                </p>
                ` : ''}
            </div>
            
            <div class="recall-actions">
                <button class="btn btn-primary btn-small btn-sound" onclick="openSourceLink('${recall.source_url}')">
                    <i class="fas fa-external-link-alt"></i>
                    <span>${t('sourceLink')}</span>
                </button>
                <button class="btn btn-success btn-small btn-sound" onclick="shareRecallToWhatsApp(${index})">
                    <i class="fab fa-whatsapp"></i>
                    <span>${t('shareWhatsApp')}</span>
                </button>
                <button class="btn btn-secondary btn-small btn-sound" onclick="copyRecallInfo(${index})">
                    <i class="fas fa-copy"></i>
                    <span>${t('copyInfo')}</span>
                </button>
            </div>
        </div>
    `;
}

// الحصول على شارة وضع قطر
function getQatarStatusBadge(status) {
    switch (status) {
        case 'confirmed':
            return '<div class="qatar-status confirmed">🇶🇦 ' + t('confirmed') + '</div>';
        case 'possible':
            return '<div class="qatar-status possible">⚠️ ' + t('possible') + '</div>';
        default:
            return '<div class="qatar-status not-indicated">❌ ' + t('notIndicated') + '</div>';
    }
}

// الحصول على شارة النطاق الجغرافي
function getScopeBadge(scope, label) {
    const scopeLabels = {
        'international': t('worldwide'),
        'nationwide': t('nationwide'),
        'subnational': t('subnational'),
        'local': t('local'),
        'unknown': t('unknown')
    };
    
    const displayLabel = label || scopeLabels[scope] || scope;
    
    switch (scope) {
        case 'international':
            return `<span class="status-badge status-international">${displayLabel}</span>`;
        case 'nationwide':
            return `<span class="status-badge status-national">${displayLabel}</span>`;
        case 'local':
        case 'subnational':
            return `<span class="status-badge status-local">${displayLabel}</span>`;
        default:
            return `<span class="status-badge">${displayLabel}</span>`;
    }
}

// تعيين الفلتر
function setFilter(filter) {
    currentFilter = filter;
    currentPage = 1;
    
    // تحديث الأزرار
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`filter-${filter}`)?.classList.add('active');
    
    filterAndDisplayRecalls();
    playButtonSound();
}

// تحديث التنقل بين الصفحات
function updatePagination() {
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (pageInfo) {
        pageInfo.textContent = `${currentPage} من ${totalPages}`;
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
    }
}

// الصفحة السابقة
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        filterAndDisplayRecalls();
        playButtonSound();
    }
}

// الصفحة التالية
function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        filterAndDisplayRecalls();
        playButtonSound();
    }
}

// تحديث البيانات
async function refreshData() {
    playButtonSound();
    showNotification('جاري تحديث البيانات...', 'info');
    
    try {
        // استدعاء endpoint التحديث المجدول
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.scheduledUpdate}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Qatar-Food-Recalls-Manual-Refresh/1.0'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`تم التحديث بنجاح! ${data.saved || 0} استدعاء جديد`, 'success');
            
            // إعادة تحميل البيانات
            setTimeout(loadRecalls, 2000);
        } else {
            throw new Error(data.error || 'فشل في التحديث');
        }
    } catch (error) {
        console.error('خطأ في التحديث:', error);
        showNotification('فشل في تحديث البيانات. جاري إعادة تحميل البيانات المحفوظة...', 'warning');
        
        // إعادة تحميل البيانات المحفوظة
        loadRecalls();
    }
}

// تفعيل الإشعارات
async function enableNotifications() {
    playButtonSound();
    
    if (!('Notification' in window)) {
        showNotification('الإشعارات غير مدعومة في هذا المتصفح', 'error');
        return;
    }
    
    try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            showNotification('تم تفعيل الإشعارات بنجاح!', 'success');
            
            // إرسال إشعار ترحيبي
            new Notification('نظام الإنذار المبكر - قطر', {
                body: 'تم تفعيل الإشعارات بنجاح. ستصلك تنبيهات فورية عند اكتشاف استدعاءات جديدة.',
                icon: '/assets/favicon-32x32.png',
                badge: '/assets/favicon-16x16.png'
            });
            
            // تحديث النص على الزر
            const btn = document.getElementById('enableNotifications');
            if (btn) {
                const span = btn.querySelector('span');
                if (span) {
                    span.textContent = 'الإشعارات مفعلة';
                }
                btn.disabled = true;
                btn.classList.remove('btn-success');
                btn.classList.add('btn-secondary');
            }
            
            // محاولة الحصول على FCM token إذا كان Firebase متاحاً
            if (window.firebaseMessaging && window.vapidKey) {
                try {
                    const token = await getToken(window.firebaseMessaging, {
                        vapidKey: window.vapidKey
                    });
                    
                    if (token) {
                        await subscribeToTopics(token);
                    }
                } catch (fcmError) {
                    console.warn('تحذير: فشل في تهيئة FCM:', fcmError);
                }
            }
            
        } else {
            showNotification('تم رفض إذن الإشعارات', 'warning');
        }
    } catch (error) {
        console.error('خطأ في تفعيل الإشعارات:', error);
        showNotification('فشل في تفعيل الإشعارات', 'error');
    }
}

// الاشتراك في المواضيع
async function subscribeToTopics(token) {
    const topics = ['all-users', 'qatar-relevant', 'international-recalls', 'urgent-recalls'];
    
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.topicSubscriptions}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,
                action: 'subscribe',
                topics: topics
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ تم الاشتراك في المواضيع بنجاح');
        }
    } catch (error) {
        console.error('خطأ في الاشتراك في المواضيع:', error);
    }
}

// إرسال إشعار تجريبي
async function sendTestNotification() {
    playButtonSound();
    
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.testNotification}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('تم إرسال الإشعار التجريبي!', 'success');
            
            // إشعار محلي كنسخة احتياطية
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('إشعار تجريبي - نظام الإنذار المبكر', {
                    body: 'هذا إشعار تجريبي للتأكد من عمل النظام بشكل صحيح.',
                    icon: '/assets/favicon-32x32.png'
                });
            }
        } else {
            throw new Error(data.error || 'فشل في إرسال الإشعار');
        }
    } catch (error) {
        console.error('خطأ في إرسال الإشعار التجريبي:', error);
        showNotification('فشل في إرسال الإشعار التجريبي', 'error');
        
        // إشعار محلي كنسخة احتياطية
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('إشعار تجريبي محلي', {
                body: 'هذا إشعار تجريبي محلي. قد تحتاج لتفعيل الإشعارات السحابية.',
                icon: '/assets/favicon-32x32.png'
            });
        }
    }
}

// تصدير البيانات
function exportData() {
    playButtonSound();
    
    if (filteredRecalls.length === 0) {
        showNotification('لا توجد بيانات للتصدير', 'warning');
        return;
    }
    
    try {
        const csvContent = generateCSV(filteredRecalls);
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `food-recalls-qatar-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification(`تم تصدير ${filteredRecalls.length} استدعاء بنجاح!`, 'success');
        }
    } catch (error) {
        console.error('خطأ في تصدير البيانات:', error);
        showNotification('فشل في تصدير البيانات', 'error');
    }
}

// إنشاء ملف CSV
function generateCSV(recalls) {
    const headers = [
        'التاريخ', 'الوكالة', 'البلد', 'العنوان', 'العلامة التجارية', 
        'رقم اللوت', 'السبب', 'النطاق', 'وضع قطر', 'عاجل', 'الرابط'
    ];
    
    const rows = recalls.map(recall => [
        new Date(recall.date).toLocaleDateString('ar-SA'),
        `"${recall.agency.replace(/"/g, '""')}"`,
        `"${recall.country.replace(/"/g, '""')}"`,
        `"${recall.title.replace(/"/g, '""')}"`,
        `"${recall.brand.replace(/"/g, '""')}"`,
        `"${recall.lot.replace(/"/g, '""')}"`,
        `"${recall.reason.replace(/"/g, '""')}"`,
        recall.scope_label || recall.scope,
        recall.qatar_status === 'confirmed' ? 'مؤكد' : 
        recall.qatar_status === 'possible' ? 'محتمل' : 'غير محدد',
        (recall.urgent || recall.qa_possible) ? 'نعم' : 'لا',
        recall.source_url
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// مشاركة عبر واتساب
function shareToWhatsApp() {
    playButtonSound();
    
    const stats = calculateStats(filteredRecalls);
    
    const message = `🚨 *نظام الإنذار المبكر للاستدعاءات الغذائية - دولة قطر*

📊 *الإحصائيات الحالية:*
• إجمالي الاستدعاءات: ${stats.total}
• استدعاءات عاجلة: ${stats.urgent}
• استدعاءات عالمية: ${stats.international}
• ذات صلة بقطر: ${stats.qatar_relevant}
• عدد البلدان: ${stats.countries_count}
• عدد الوكالات: ${stats.agencies_count}

🔗 *رابط النظام:*
https://food-recalls-qatar.web.app

⏰ *آخر تحديث:* ${new Date().toLocaleString('ar-SA')}

#سلامة_غذائية #قطر #إنذار_مبكر #استدعاء_غذائي`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// مشاركة استدعاء محدد عبر واتساب
function shareRecallToWhatsApp(index) {
    const recall = getRecallByIndex(index);
    if (!recall) return;
    
    playButtonSound();
    
    const qatarStatusText = recall.qatar_status === 'confirmed' ? '🇶🇦 مؤكد في قطر' : 
                           recall.qatar_status === 'possible' ? '⚠️ محتمل في قطر' : 
                           '❌ غير محدد';
    
    const urgentText = (recall.urgent || recall.qa_possible) ? ' 🚨 *عاجل*' : '';
    
    const message = `🚨 *استدعاء غذائي${urgentText}*

📋 *التفاصيل:*
• *المنتج:* ${recall.title}
• *العلامة التجارية:* ${recall.brand}
• *رقم اللوت:* ${recall.lot}
• *السبب:* ${recall.reason}

🏢 *المصدر:*
• *الوكالة:* ${recall.agency}
• *البلد:* ${recall.country}
• *النطاق:* ${recall.scope_label || recall.scope}

🇶🇦 *وضع قطر:* ${qatarStatusText}

📅 *التاريخ:* ${new Date(recall.date).toLocaleDateString('ar-SA')}

🔗 *المصدر الأصلي:* ${recall.source_url}

⚠️ *تنبيه من نظام الإنذار المبكر - دولة قطر*
https://food-recalls-qatar.web.app

#سلامة_غذائية #استدعاء_غذائي #قطر`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// نسخ معلومات الاستدعاء
function copyRecallInfo(index) {
    const recall = getRecallByIndex(index);
    if (!recall) return;
    
    playButtonSound();
    
    const text = `استدعاء غذائي: ${recall.title}
العلامة التجارية: ${recall.brand}
رقم اللوت: ${recall.lot}
السبب: ${recall.reason}
الوكالة: ${recall.agency} - ${recall.country}
النطاق: ${recall.scope_label || recall.scope}
وضع قطر: ${recall.qatar_status}
التاريخ: ${new Date(recall.date).toLocaleDateString('ar-SA')}
الرابط: ${recall.source_url}`;
    
    navigator.clipboard.writeText(text).then(() => {
        showNotification('تم نسخ المعلومات بنجاح!', 'success');
    }).catch(() => {
        showNotification('فشل في نسخ المعلومات', 'error');
    });
}

// فتح رابط المصدر
function openSourceLink(url) {
    playButtonSound();
    window.open(url, '_blank', 'noopener,noreferrer');
}

// الحصول على استدعاء بالفهرس
function getRecallByIndex(index) {
    const itemsPerPage = 10;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const actualIndex = startIndex + index;
    return filteredRecalls[actualIndex];
}

// عرض/إخفاء مؤشر التحميل
function showLoader(show) {
    const loader = document.getElementById('loader');
    const container = document.getElementById('recallsContainer');
    const pagination = document.getElementById('paginationContainer');
    
    if (loader) loader.style.display = show ? 'block' : 'none';
    if (container) container.style.display = show ? 'none' : 'block';
    if (pagination) pagination.style.display = show ? 'none' : 'flex';
}

// عرض رسالة خطأ
function showError(message) {
    const container = document.getElementById('recallsContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #DC3545;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px;"></i>
                <h3>حدث خطأ</h3>
                <p>${message}</p>
                <button class="btn btn-primary btn-sound" onclick="loadRecalls()" style="margin-top: 20px;">
                    <i class="fas fa-retry"></i> إعادة المحاولة
                </button>
            </div>
        `;
    }
}

// عرض الإشعارات
function showNotification(message, type = 'info', title = null) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            <div>
                ${title ? `<strong>${title}</strong><br>` : ''}
                <span>${message}</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // إزالة الإشعار تلقائياً
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// تحديث وقت آخر تحديث
function updateLastUpdateTime() {
    const element = document.getElementById('lastUpdateTime');
    if (element && lastUpdateTime) {
        const locale = currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
        element.textContent = lastUpdateTime.toLocaleString(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

// تشغيل صوت الأزرار
function playButtonSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        // تجاهل أخطاء الصوت
    }
}

// التعامل مع الرسائل الواردة
function handleIncomingMessage(payload) {
    console.log('📨 معالجة رسالة واردة:', payload);
    
    if (payload.notification) {
        showNotification(
            payload.notification.body, 
            payload.data?.urgent === 'true' ? 'error' : 'info',
            payload.notification.title
        );
        
        // تشغيل صوت تنبيه
        playNotificationSound(payload.data?.urgent === 'true');
        
        // تحديث البيانات إذا كانت الرسالة تتعلق بتحديث
        if (payload.data?.type === 'update' || payload.data?.type === 'scheduled_update') {
            setTimeout(loadRecalls, 2000);
        }
    }
}

// تشغيل صوت التنبيه
function playNotificationSound(isUrgent = false) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = isUrgent ? 1000 : 600;
        oscillator.type = isUrgent ? 'square' : 'sine';
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + (isUrgent ? 0.3 : 0.2));
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + (isUrgent ? 0.3 : 0.2));
        
        // صوت إضافي للاستدعاءات العاجلة
        if (isUrgent) {
            setTimeout(() => {
                const oscillator2 = audioContext.createOscillator();
                const gainNode2 = audioContext.createGain();
                
                oscillator2.connect(gainNode2);
                gainNode2.connect(audioContext.destination);
                
                oscillator2.frequency.value = 800;
                oscillator2.type = 'square';
                
                gainNode2.gain.setValueAtTime(0.15, audioContext.currentTime);
                gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                
                oscillator2.start(audioContext.currentTime);
                oscillator2.stop(audioContext.currentTime + 0.2);
            }, 400);
        }
    } catch (error) {
        console.warn('تحذير: فشل في تشغيل صوت التنبيه:', error);
    }
}

// فحص الاستدعاءات العاجلة الجديدة
function checkForUrgentRecalls(recalls) {
    const urgentRecalls = recalls.filter(r => r.urgent || r.qa_possible);
    const qatarRelevantUrgent = urgentRecalls.filter(r => 
        r.qatar_status === 'confirmed' || r.qatar_status === 'possible'
    );
    
    if (qatarRelevantUrgent.length > 0) {
        // إشعار للاستدعاءات العاجلة المتعلقة بقطر
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🚨 استدعاء عاجل - قطر', {
                body: `تم اكتشاف ${qatarRelevantUrgent.length} استدعاء عاجل قد يؤثر على قطر`,
                icon: '/assets/favicon-32x32.png',
                requireInteraction: true,
                tag: 'urgent-qatar-recall'
            });
        }
        
        playNotificationSound(true);
    }
}

// دالة التأخير للبحث
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// تنظيف HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// تنظيف الموارد عند إغلاق الصفحة
window.addEventListener('beforeunload', function() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
});

// تصدير الدوال للاستخدام العام
window.toggleLanguage = toggleLanguage;
window.setFilter = setFilter;
window.previousPage = previousPage;
window.nextPage = nextPage;
window.refreshData = refreshData;
window.enableNotifications = enableNotifications;
window.sendTestNotification = sendTestNotification;
window.exportData = exportData;
window.shareToWhatsApp = shareToWhatsApp;
window.shareRecallToWhatsApp = shareRecallToWhatsApp;
window.copyRecallInfo = copyRecallInfo;
window.openSourceLink = openSourceLink;

console.log('✅ تم تحميل نظام الإنذار المبكر بنجاح - الإصدار المحسن');
