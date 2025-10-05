// utils.js - الأدوات المساعدة والوظائف العامة

// تنسيق التاريخ والوقت
const DateUtils = {
    // تنسيق التاريخ بالعربية
    formatArabicDate: (date) => {
        const arabicMonths = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];
        
        const d = new Date(date);
        const day = d.getDate();
        const month = arabicMonths[d.getMonth()];
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        
        return `${day} ${month} ${year} - ${hours}:${minutes}`;
    },
    
    // حساب الوقت المنقضي
    timeAgo: (date) => {
        const now = new Date();
        const past = new Date(date);
        const diffInSeconds = Math.floor((now - past) / 1000);
        
        if (diffInSeconds < 60) {
            return 'الآن';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `منذ ${minutes} دقيقة`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `منذ ${hours} ساعة`;
        } else if (diffInSeconds < 2592000) {
            const days = Math.floor(diffInSeconds / 86400);
            return `منذ ${days} يوم`;
        } else {
            return DateUtils.formatArabicDate(date);
        }
    },
    
    // التحقق من كون التاريخ حديث (أقل من 24 ساعة)
    isRecent: (date) => {
        const now = new Date();
        const past = new Date(date);
        const diffInHours = (now - past) / (1000 * 60 * 60);
        return diffInHours <= 24;
    }
};

// أدوات النصوص
const TextUtils = {
    // اختصار النص
    truncate: (text, maxLength = 100) => {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },
    
    // تنظيف النص من HTML
    stripHtml: (html) => {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
    },
    
    // تحويل النص إلى slug
    slugify: (text) => {
        return text
            .toLowerCase()
            .replace(/[^\u0600-\u06FF\w\s-]/g, '') // الاحتفاظ بالأحرف العربية والإنجليزية
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },
    
    // تمييز الكلمات المفتاحية
    highlight: (text, keywords) => {
        if (!keywords || keywords.length === 0) return text;
        
        let highlightedText = text;
        keywords.forEach(keyword => {
            const regex = new RegExp(`(${keyword})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
        });
        
        return highlightedText;
    }
};

// أدوات التحقق من صحة البيانات
const ValidationUtils = {
    // التحقق من صحة البريد الإلكتروني
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    // التحقق من صحة رقم الهاتف
    isValidPhone: (phone) => {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    },
    
    // التحقق من صحة الرابط
    isValidUrl: (url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },
    
    // التحقق من وجود النص
    isNotEmpty: (text) => {
        return text && text.trim().length > 0;
    }
};

// أدوات التخزين المحلي
const StorageUtils = {
    // حفظ البيانات
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('خطأ في حفظ البيانات:', error);
            return false;
        }
    },
    
    // استرجاع البيانات
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('خطأ في استرجاع البيانات:', error);
            return defaultValue;
        }
    },
    
    // حذف البيانات
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('خطأ في حذف البيانات:', error);
            return false;
        }
    },
    
    // مسح جميع البيانات
    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('خطأ في مسح البيانات:', error);
            return false;
        }
    }
};

// أدوات الشبكة والطلبات
const NetworkUtils = {
    // التحقق من حالة الاتصال
    isOnline: () => navigator.onLine,
    
    // إرسال طلب GET
    get: async (url, options = {}) => {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('خطأ في الطلب:', error);
            throw error;
        }
    },
    
    // إرسال طلب POST
    post: async (url, data, options = {}) => {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: JSON.stringify(data),
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('خطأ في الطلب:', error);
            throw error;
        }
    }
};

// أدوات الصوت
const AudioUtils = {
    // تشغيل صوت التنبيه
    playNotificationSound: (soundFile = '/assets/notification-sound.mp3') => {
        try {
            const audio = new Audio(soundFile);
            audio.volume = 0.7;
            audio.play().catch(e => {
                console.log('لا يمكن تشغيل الصوت:', e);
            });
        } catch (error) {
            console.error('خطأ في تشغيل الصوت:', error);
        }
    },
    
    // تشغيل صوت عاجل
    playUrgentSound: () => {
        AudioUtils.playNotificationSound('/assets/urgent-sound.mp3');
    },
    
    // تشغيل صوت نجاح
    playSuccessSound: () => {
        AudioUtils.playNotificationSound('/assets/success-sound.mp3');
    }
};

// أدوات المشاركة
const ShareUtils = {
    // مشاركة عبر واتساب
    shareWhatsApp: (text, url = '') => {
        const message = url ? `${text}\n\n${url}` : text;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    },
    
    // مشاركة عبر تويتر
    shareTwitter: (text, url = '') => {
        const encodedText = encodeURIComponent(text);
        const encodedUrl = encodeURIComponent(url);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        window.open(twitterUrl, '_blank');
    },
    
    // مشاركة عبر فيسبوك
    shareFacebook: (url) => {
        const encodedUrl = encodeURIComponent(url);
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        window.open(facebookUrl, '_blank');
    },
    
    // نسخ النص إلى الحافظة
    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            // طريقة بديلة للمتصفحات القديمة
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        }
    }
};

// أدوات التصدير
const ExportUtils = {
    // تصدير إلى CSV
    toCSV: (data, filename = 'data.csv') => {
        if (!data.length) return;
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
            )
        ].join('\n');
        
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        ExportUtils.downloadBlob(blob, filename);
    },
    
    // تصدير إلى JSON
    toJSON: (data, filename = 'data.json') => {
        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        ExportUtils.downloadBlob(blob, filename);
    },
    
    // تحميل ملف
    downloadBlob: (blob, filename) => {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

// أدوات الفلترة والبحث
const FilterUtils = {
    // فلترة البيانات
    filterData: (data, filters) => {
        return data.filter(item => {
            return Object.keys(filters).every(key => {
                const filterValue = filters[key];
                if (!filterValue || filterValue === '') return true;
                
                const itemValue = item[key];
                if (typeof itemValue === 'string') {
                    return itemValue.toLowerCase().includes(filterValue.toLowerCase());
                } else if (typeof itemValue === 'boolean') {
                    return itemValue === (filterValue === 'true');
                } else {
                    return itemValue === filterValue;
                }
            });
        });
    },
    
    // البحث في النص
    searchInText: (data, searchTerm, fields = []) => {
        if (!searchTerm) return data;
        
        const term = searchTerm.toLowerCase();
        return data.filter(item => {
            if (fields.length === 0) {
                // البحث في جميع الحقول
                return Object.values(item).some(value => 
                    value && value.toString().toLowerCase().includes(term)
                );
            } else {
                // البحث في حقول محددة
                return fields.some(field => 
                    item[field] && item[field].toString().toLowerCase().includes(term)
                );
            }
        });
    },
    
    // ترتيب البيانات
    sortData: (data, field, direction = 'asc') => {
        return [...data].sort((a, b) => {
            let aValue = a[field];
            let bValue = b[field];
            
            // التعامل مع التواريخ
            if (aValue instanceof Date || (typeof aValue === 'string' && !isNaN(Date.parse(aValue)))) {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }
            
            // التعامل مع الأرقام
            if (typeof aValue === 'string' && !isNaN(aValue)) {
                aValue = parseFloat(aValue);
                bValue = parseFloat(bValue);
            }
            
            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
};

// أدوات الإحصائيات
const StatsUtils = {
    // حساب الإحصائيات الأساسية
    calculateStats: (data) => {
        if (!data.length) return {};
        
        const total = data.length;
        const urgent = data.filter(item => item.qa_possible).length;
        const countries = [...new Set(data.map(item => item.country))].length;
        const agencies = [...new Set(data.map(item => item.agency))].length;
        const international = data.filter(item => item.scope === 'international').length;
        const recent = data.filter(item => DateUtils.isRecent(item.date)).length;
        
        return {
            total,
            urgent,
            countries,
            agencies,
            international,
            recent,
            urgentPercentage: total > 0 ? Math.round((urgent / total) * 100) : 0,
            internationalPercentage: total > 0 ? Math.round((international / total) * 100) : 0
        };
    },
    
    // تجميع البيانات حسب حقل معين
    groupBy: (data, field) => {
        return data.reduce((groups, item) => {
            const key = item[field] || 'غير محدد';
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
            return groups;
        }, {});
    },
    
    // حساب التكرارات
    countBy: (data, field) => {
        const groups = StatsUtils.groupBy(data, field);
        return Object.keys(groups).reduce((counts, key) => {
            counts[key] = groups[key].length;
            return counts;
        }, {});
    }
};

// أدوات الأداء
const PerformanceUtils = {
    // تأخير التنفيذ (debounce)
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // تحديد معدل التنفيذ (throttle)
    throttle: (func, limit) => {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // قياس وقت التنفيذ
    measureTime: (label) => {
        const start = performance.now();
        return {
            end: () => {
                const end = performance.now();
                console.log(`${label}: ${end - start} milliseconds`);
                return end - start;
            }
        };
    }
};

// تصدير الأدوات للاستخدام العام
window.DateUtils = DateUtils;
window.TextUtils = TextUtils;
window.ValidationUtils = ValidationUtils;
window.StorageUtils = StorageUtils;
window.NetworkUtils = NetworkUtils;
window.AudioUtils = AudioUtils;
window.ShareUtils = ShareUtils;
window.ExportUtils = ExportUtils;
window.FilterUtils = FilterUtils;
window.StatsUtils = StatsUtils;
window.PerformanceUtils = PerformanceUtils;
