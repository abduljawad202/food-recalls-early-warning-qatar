// app.js - الملف الرئيسي للتطبيق

// تكوين API
const API = 'https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/recalls';

// متغيرات عامة
let allRecalls = [];
let filteredRecalls = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentLanguage = 'ar';
let selectedRecall = null;
let lastUpdateTime = null;

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    console.log('تم تحميل التطبيق');
    
    // تحميل البيانات الأولية
    loadRecalls();
    
    // تحديث البيانات كل 5 دقائق
    setInterval(loadRecalls, 5 * 60 * 1000);
    
    // تهيئة الفلاتر
    initializeFilters();
    
    // تهيئة الأحداث
    initializeEventListeners();
});

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
            
            // تحديث الإحصائيات
            updateStats();
            
            // عرض البيانات
            displayRecalls();
            
            // تحديث الفلاتر
            updateFilters();
            
            // تحديث وقت آخر تحديث
            lastUpdateTime = new Date();
            updateLastUpdateTime();
            
            console.log(`تم تحميل ${allRecalls.length} استدعاء`);
            
            // إخفاء رسالة التحميل
            showLoading(false);
            
        } else {
            throw new Error('فشل في تحميل البيانات');
        }
        
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        showError('فشل في تحميل البيانات. يرجى المحاولة مرة أخرى.');
        showLoading(false);
    }
}

// عرض البيانات في الواجهة
function displayRecalls() {
    const container = document.getElementById('recalls-container');
    const noResults = document.getElementById('no-results');
    const loadMore = document.getElementById('load-more');
    
    if (!container) return;
    
    // تنظيف الحاوية
    container.innerHTML = '';
    
    if (filteredRecalls.length === 0) {
        noResults.classList.remove('hidden');
        loadMore.classList.add('hidden');
        return;
    }
    
    noResults.classList.add('hidden');
    
    // عرض البيانات للصفحة الحالية
    const startIndex = 0;
    const endIndex = currentPage * itemsPerPage;
    const recallsToShow = filteredRecalls.slice(startIndex, endIndex);
    
    recallsToShow.forEach(recall => {
        const recallCard = createRecallCard(recall);
        container.appendChild(recallCard);
    });
    
    // إظهار/إخفاء زر "تحميل المزيد"
    if (endIndex < filteredRecalls.length) {
        loadMore.classList.remove('hidden');
    } else {
        loadMore.classList.add('hidden');
    }
}

// إنشاء بطاقة استدعاء
function createRecallCard(recall) {
    const card = document.createElement('div');
    card.className = `recall-card ${recall.qa_possible ? 'urgent' : ''} ${recall.scope}`;
    card.onclick = () => showRecallDetails(recall);
    
    const date = new Date(recall.date);
    const formattedDate = date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    card.innerHTML = `
        <div class="recall-header">
            <div class="recall-badges">
                ${recall.qa_possible ? '<span class="badge urgent">عاجل</span>' : ''}
                <span class="badge scope">${recall.scope === 'international' ? 'دولي' : 'محلي'}</span>
                <span class="badge agency">${recall.agency}</span>
            </div>
            <div class="recall-date">${formattedDate}</div>
        </div>
        
        <div class="recall-content">
            <h3 class="recall-title">${recall.title}</h3>
            
            <div class="recall-details">
                <div class="detail-item">
                    <i class="fas fa-tag"></i>
                    <span><strong>العلامة التجارية:</strong> ${recall.brand}</span>
                </div>
                
                <div class="detail-item">
                    <i class="fas fa-barcode"></i>
                    <span><strong>رقم الدفعة:</strong> ${recall.lot}</span>
                </div>
                
                <div class="detail-item">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span><strong>سبب الاستدعاء:</strong> ${recall.reason}</span>
                </div>
                
                <div class="detail-item">
                    <i class="fas fa-globe"></i>
                    <span><strong>الدولة:</strong> ${recall.country}</span>
                </div>
            </div>
            
            ${recall.image ? `<div class="recall-image">
                <img src="${recall.image}" alt="صورة المنتج" loading="lazy">
            </div>` : ''}
        </div>
        
        <div class="recall-actions">
            <button onclick="event.stopPropagation(); shareWhatsApp('${recall.id}')" class="btn-action whatsapp">
                <i class="fab fa-whatsapp"></i>
                واتساب
            </button>
            
            <button onclick="event.stopPropagation(); window.open('${recall.source_url}', '_blank')" class="btn-action source">
                <i class="fas fa-external-link-alt"></i>
                المصدر
            </button>
            
            <button onclick="event.stopPropagation(); showRecallDetails('${recall.id}')" class="btn-action details">
                <i class="fas fa-info-circle"></i>
                التفاصيل
            </button>
        </div>
    `;
    
    return card;
}

// عرض تفاصيل الاستدعاء في النافذة المنبثقة
function showRecallDetails(recallId) {
    const recall = typeof recallId === 'string' 
        ? allRecalls.find(r => r.id === recallId)
        : recallId;
    
    if (!recall) return;
    
    selectedRecall = recall;
    const modal = document.getElementById('recall-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    modalTitle.textContent = recall.title;
    
    const date = new Date(recall.date);
    const formattedDate = date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    modalBody.innerHTML = `
        <div class="modal-recall-details">
            <div class="detail-section">
                <h4>معلومات أساسية</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>العلامة التجارية:</label>
                        <span>${recall.brand}</span>
                    </div>
                    <div class="detail-item">
                        <label>رقم الدفعة:</label>
                        <span>${recall.lot}</span>
                    </div>
                    <div class="detail-item">
                        <label>التاريخ:</label>
                        <span>${formattedDate}</span>
                    </div>
                    <div class="detail-item">
                        <label>الدولة:</label>
                        <span>${recall.country}</span>
                    </div>
                    <div class="detail-item">
                        <label>الجهة المصدرة:</label>
                        <span>${recall.agency}</span>
                    </div>
                    <div class="detail-item">
                        <label>النطاق:</label>
                        <span>${recall.scope === 'international' ? 'دولي' : 'محلي'}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>سبب الاستدعاء</h4>
                <p class="reason-text">${recall.reason}</p>
            </div>
            
            ${recall.image ? `
            <div class="detail-section">
                <h4>صورة المنتج</h4>
                <div class="product-image">
                    <img src="${recall.image}" alt="صورة المنتج">
                </div>
            </div>
            ` : ''}
            
            <div class="detail-section">
                <h4>معلومات إضافية</h4>
                <div class="additional-info">
                    <div class="info-item ${recall.qa_possible ? 'urgent' : ''}">
                        <i class="fas fa-${recall.qa_possible ? 'exclamation-triangle' : 'info-circle'}"></i>
                        <span>${recall.qa_possible ? 'استدعاء عاجل - خطر محتمل على الصحة' : 'استدعاء احترازي'}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>المصدر الأصلي</h4>
                <a href="${recall.source_url}" target="_blank" class="source-link">
                    <i class="fas fa-external-link-alt"></i>
                    عرض في الموقع الرسمي
                </a>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// إغلاق النافذة المنبثقة
function closeModal() {
    const modal = document.getElementById('recall-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    selectedRecall = null;
}

// مشاركة عبر واتساب
function shareWhatsApp(recallId) {
    const recall = recallId 
        ? allRecalls.find(r => r.id === recallId)
        : selectedRecall;
    
    if (!recall) return;
    
    const message = `🚨 *استدعاء غذائي مهم*

*المنتج:* ${recall.title}
*العلامة التجارية:* ${recall.brand}
*رقم الدفعة:* ${recall.lot}
*السبب:* ${recall.reason}
*الدولة:* ${recall.country}
*الجهة:* ${recall.agency}

${recall.qa_possible ? '⚠️ *تحذير: خطر محتمل على الصحة*' : ''}

*المصدر:* ${recall.source_url}

#استدعاء_غذائي #سلامة_غذائية`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}

// تطبيق الفلاتر
function applyFilters() {
    const countryFilter = document.getElementById('country-filter').value;
    const agencyFilter = document.getElementById('agency-filter').value;
    const scopeFilter = document.getElementById('scope-filter').value;
    const urgentFilter = document.getElementById('urgent-filter').value;
    
    filteredRecalls = allRecalls.filter(recall => {
        if (countryFilter && recall.country !== countryFilter) return false;
        if (agencyFilter && recall.agency !== agencyFilter) return false;
        if (scopeFilter && recall.scope !== scopeFilter) return false;
        if (urgentFilter === 'true' && !recall.qa_possible) return false;
        
        return true;
    });
    
    // إعادة تعيين الصفحة الحالية
    currentPage = 1;
    
    // عرض النتائج المفلترة
    displayRecalls();
    
    // تحديث الإحصائيات
    updateStats();
}

// مسح الفلاتر
function clearFilters() {
    document.getElementById('country-filter').value = '';
    document.getElementById('agency-filter').value = '';
    document.getElementById('scope-filter').value = '';
    document.getElementById('urgent-filter').value = '';
    
    filteredRecalls = [...allRecalls];
    currentPage = 1;
    
    displayRecalls();
    updateStats();
}

// تحميل المزيد من البيانات
function loadMoreRecalls() {
    currentPage++;
    displayRecalls();
}

// تحديث الإحصائيات
function updateStats() {
    const totalRecalls = document.getElementById('total-recalls');
    const urgentRecalls = document.getElementById('urgent-recalls');
    const countriesCount = document.getElementById('countries-count');
    
    if (totalRecalls) totalRecalls.textContent = filteredRecalls.length;
    
    if (urgentRecalls) {
        const urgentCount = filteredRecalls.filter(r => r.qa_possible).length;
        urgentRecalls.textContent = urgentCount;
    }
    
    if (countriesCount) {
        const uniqueCountries = [...new Set(filteredRecalls.map(r => r.country))];
        countriesCount.textContent = uniqueCountries.length;
    }
}

// تحديث وقت آخر تحديث
function updateLastUpdateTime() {
    const lastUpdateElement = document.getElementById('last-update');
    if (lastUpdateElement && lastUpdateTime) {
        const timeString = lastUpdateTime.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
        lastUpdateElement.textContent = timeString;
    }
}

// تحديث خيارات الفلاتر
function updateFilters() {
    const countryFilter = document.getElementById('country-filter');
    
    if (countryFilter) {
        // الحصول على قائمة الدول الفريدة
        const countries = [...new Set(allRecalls.map(r => r.country))].sort();
        
        // مسح الخيارات الحالية (عدا الخيار الأول)
        while (countryFilter.children.length > 1) {
            countryFilter.removeChild(countryFilter.lastChild);
        }
        
        // إضافة خيارات الدول
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countryFilter.appendChild(option);
        });
    }
}

// تهيئة مستمعي الأحداث
function initializeEventListeners() {
    // إغلاق النافذة المنبثقة عند النقر خارجها
    document.getElementById('recall-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
    
    // إغلاق النافذة المنبثقة بمفتاح Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
    
    // تحديث البيانات عند العودة للصفحة
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            // تحديث البيانات إذا مر أكثر من 5 دقائق
            if (lastUpdateTime && Date.now() - lastUpdateTime.getTime() > 5 * 60 * 1000) {
                loadRecalls();
            }
        }
    });
}

// تهيئة الفلاتر
function initializeFilters() {
    // يمكن إضافة تهيئة إضافية للفلاتر هنا
}

// عرض/إخفاء مؤشر التحميل
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }
}

// عرض رسالة خطأ
function showError(message) {
    // يمكن تحسين هذا لعرض رسائل خطأ أفضل
    console.error(message);
    alert(message);
}

// تحديث البيانات يدوياً
async function refreshRecalls() {
    await loadRecalls();
    showMessage('تم تحديث البيانات بنجاح', 'success');
}

// عرض رسالة للمستخدم
function showMessage(message, type = 'info') {
    // إنشاء عنصر الرسالة
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
        <div class="message-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // إضافة الرسالة للصفحة
    document.body.appendChild(messageDiv);
    
    // إزالة الرسالة بعد 3 ثوان
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// تصدير البيانات
function exportData() {
    const dataToExport = filteredRecalls.map(recall => ({
        'العنوان': recall.title,
        'العلامة التجارية': recall.brand,
        'رقم الدفعة': recall.lot,
        'السبب': recall.reason,
        'التاريخ': new Date(recall.date).toLocaleDateString('ar-SA'),
        'النطاق': recall.scope === 'international' ? 'دولي' : 'محلي',
        'الدولة': recall.country,
        'الجهة': recall.agency,
        'عاجل': recall.qa_possible ? 'نعم' : 'لا',
        'المصدر': recall.source_url
    }));
    
    // تحويل إلى CSV
    const csv = convertToCSV(dataToExport);
    
    // تحميل الملف
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `food-recalls-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// تحويل البيانات إلى CSV
function convertToCSV(data) {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    return '\uFEFF' + csvContent; // إضافة BOM للدعم العربي
}

// إرسال إشعار تجريبي
async function sendTestNotification() {
    try {
        const response = await fetch('https://us-central1-food-recalls-early-warning-qatar.cloudfunctions.net/sendTestNotification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            showMessage('تم إرسال الإشعار التجريبي', 'success');
        } else {
            throw new Error('فشل في إرسال الإشعار');
        }
    } catch (error) {
        console.error('خطأ في إرسال الإشعار التجريبي:', error);
        showMessage('فشل في إرسال الإشعار التجريبي', 'error');
    }
}

// تبديل اللغة
function toggleLanguage() {
    // يمكن تطوير هذه الوظيفة لاحقاً لدعم اللغة الإنجليزية
    console.log('تبديل اللغة - قيد التطوير');
}

// إخفاء شريط التنبيه
function hideAlertBanner() {
    const banner = document.getElementById('alert-banner');
    if (banner) {
        banner.classList.add('hidden');
    }
}

// الإبلاغ عن مشكلة
function reportIssue() {
    if (!selectedRecall) return;
    
    const issueType = prompt('نوع المشكلة:\n1. معلومات خاطئة\n2. رابط لا يعمل\n3. صورة مفقودة\n4. أخرى\n\nأدخل رقم نوع المشكلة:');
    
    if (!issueType) return;
    
    const description = prompt('وصف المشكلة (اختياري):');
    
    // إرسال التقرير (يتطلب تنفيذ الدالة في firebase-config.js)
    if (window.reportIssue) {
        window.reportIssue(selectedRecall.id, issueType, description || '');
    }
}

// تصدير الدوال للاستخدام العام
window.loadRecalls = loadRecalls;
window.refreshRecalls = refreshRecalls;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.loadMoreRecalls = loadMoreRecalls;
window.showRecallDetails = showRecallDetails;
window.closeModal = closeModal;
window.shareWhatsApp = shareWhatsApp;
window.exportData = exportData;
window.sendTestNotification = sendTestNotification;
window.toggleLanguage = toggleLanguage;
window.hideAlertBanner = hideAlertBanner;
window.reportIssue = reportIssue;
