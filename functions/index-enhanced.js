// نظام الإنذار المبكر للاستدعاءات الغذائية - دولة قطر
// Firebase Cloud Functions - Enhanced Version

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const axios = require('axios');
const cheerio = require('cheerio');

// تهيئة Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// إعدادات المصادر المعتمدة
const DATA_SOURCES = {
    FDA: {
        name: 'FDA',
        country: 'USA',
        fullName: 'U.S. Food and Drug Administration',
        url: 'https://api.fda.gov/food/enforcement.json',
        params: {
            limit: 100,
            search: 'status:"Ongoing" OR status:"Completed"'
        },
        scope: 'international',
        enabled: true
    },
    CFIA: {
        name: 'CFIA/Health Canada',
        country: 'Canada',
        fullName: 'Canadian Food Inspection Agency / Health Canada',
        url: 'https://healthycanadians.gc.ca/recall-alert-rappel-avis/api/recent/en',
        scope: 'international',
        enabled: true
    },
    SFDA: {
        name: 'SFDA',
        country: 'Saudi Arabia',
        fullName: 'Saudi Food & Drug Authority',
        url: 'https://www.sfda.gov.sa/ar/recalls',
        scope: 'national',
        enabled: true
    },
    FSANZ: {
        name: 'FSANZ',
        country: 'Australia/New Zealand',
        fullName: 'Food Standards Australia New Zealand',
        url: 'https://www.foodstandards.gov.au/industry/foodrecalls/recalls/Pages/default.aspx',
        scope: 'international',
        enabled: true
    }
};

// كلمات مفتاحية للكشف عن قطر ودول الخليج
const QATAR_KEYWORDS = [
    'qatar', 'doha', 'قطر', 'الدوحة', 'qatari', 'قطري'
];

const GULF_KEYWORDS = [
    'gcc', 'gulf', 'خليج', 'خليجي', 'saudi', 'سعودي', 'السعودية',
    'uae', 'emirates', 'الإمارات', 'dubai', 'دبي', 'abu dhabi', 'أبوظبي',
    'kuwait', 'الكويت', 'كويتي', 'bahrain', 'البحرين', 'بحريني',
    'oman', 'عمان', 'عماني', 'muscat', 'مسقط'
];

// دالة تحليل وضع قطر
function analyzeQatarStatus(text, distribution, affectedRegions) {
    const searchText = `${text} ${distribution} ${affectedRegions.join(' ')}`.toLowerCase();
    
    // البحث عن ذكر صريح لقطر
    const qatarMentioned = QATAR_KEYWORDS.some(keyword => 
        searchText.includes(keyword.toLowerCase())
    );
    
    if (qatarMentioned) {
        return 'confirmed';
    }
    
    // البحث عن دول الخليج (احتمالية)
    const gulfMentioned = GULF_KEYWORDS.some(keyword => 
        searchText.includes(keyword.toLowerCase())
    );
    
    if (gulfMentioned) {
        return 'possible';
    }
    
    // البحث عن كلمات تدل على التوزيع العالمي
    const internationalKeywords = [
        'international', 'worldwide', 'global', 'export', 'import',
        'عالمي', 'دولي', 'تصدير', 'استيراد', 'عالميا'
    ];
    
    const isInternational = internationalKeywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
    );
    
    if (isInternational) {
        return 'possible';
    }
    
    return 'not_indicated';
}

// دالة تحديد النطاق الجغرافي
function determineScope(distribution, affectedRegions, country) {
    const searchText = `${distribution} ${affectedRegions.join(' ')}`.toLowerCase();
    
    // كلمات مفتاحية للنطاقات المختلفة
    const internationalKeywords = [
        'international', 'worldwide', 'global', 'export', 'multiple countries',
        'عالمي', 'دولي', 'عالميا', 'متعدد البلدان'
    ];
    
    const nationwideKeywords = [
        'nationwide', 'national', 'country-wide', 'all states', 'all provinces',
        'وطني', 'على مستوى البلاد', 'جميع الولايات', 'جميع المقاطعات'
    ];
    
    const subnationalKeywords = [
        'state', 'province', 'region', 'district', 'city', 'local',
        'ولاية', 'مقاطعة', 'منطقة', 'مدينة', 'محلي'
    ];
    
    if (internationalKeywords.some(k => searchText.includes(k))) {
        return { scope: 'international', label: 'عالمي' };
    }
    
    if (nationwideKeywords.some(k => searchText.includes(k))) {
        return { scope: 'nationwide', label: `${country} - وطني` };
    }
    
    if (subnationalKeywords.some(k => searchText.includes(k))) {
        return { scope: 'subnational', label: 'ولايات/مقاطعات' };
    }
    
    // تحديد تلقائي بناءً على البلد
    if (country === 'USA' || country === 'Canada' || country === 'Australia') {
        return { scope: 'international', label: 'عالمي' };
    }
    
    return { scope: 'unknown', label: 'غير محدد' };
}

// دالة جلب بيانات FDA
async function fetchFDARecalls() {
    try {
        console.log('📡 جاري جلب بيانات FDA...');
        
        const response = await axios.get(DATA_SOURCES.FDA.url, {
            params: DATA_SOURCES.FDA.params,
            timeout: 30000,
            headers: {
                'User-Agent': 'Qatar-Food-Recalls-System/1.0'
            }
        });
        
        if (!response.data || !response.data.results) {
            throw new Error('بيانات FDA غير صالحة');
        }
        
        const recalls = response.data.results.map(item => {
            const distribution = item.distribution_pattern || 'غير محدد';
            const affectedRegions = [distribution];
            const scopeInfo = determineScope(distribution, affectedRegions, 'USA');
            
            return {
                id: `fda_${item.recall_number}`,
                title: item.product_description || 'غير محدد',
                brand: extractBrand(item.product_description) || 'غير محدد',
                lot: item.code_info || 'غير محدد',
                reason: item.reason_for_recall || 'غير محدد',
                date: item.recall_initiation_date || new Date().toISOString(),
                agency: 'FDA',
                country: 'USA',
                source_url: `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`,
                distribution: distribution,
                affected_regions: affectedRegions,
                scope: scopeInfo.scope,
                scope_label: scopeInfo.label,
                qatar_status: analyzeQatarStatus(
                    `${item.product_description} ${item.reason_for_recall}`,
                    distribution,
                    affectedRegions
                ),
                urgent: item.classification === 'Class I',
                qa_possible: false,
                source: 'FDA'
            };
        });
        
        console.log(`✅ تم جلب ${recalls.length} استدعاء من FDA`);
        return recalls;
        
    } catch (error) {
        console.error('❌ خطأ في جلب بيانات FDA:', error.message);
        return [];
    }
}

// دالة جلب بيانات CFIA/Health Canada
async function fetchCFIARecalls() {
    try {
        console.log('📡 جاري جلب بيانات CFIA/Health Canada...');
        
        const response = await axios.get(DATA_SOURCES.CFIA.url, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Qatar-Food-Recalls-System/1.0'
            }
        });
        
        if (!response.data || !response.data.results) {
            throw new Error('بيانات CFIA غير صالحة');
        }
        
        const recalls = response.data.results
            .filter(item => item.category_name && item.category_name.toLowerCase().includes('food'))
            .map(item => {
                const distribution = item.distribution || 'Canada';
                const affectedRegions = [distribution];
                const scopeInfo = determineScope(distribution, affectedRegions, 'Canada');
                
                return {
                    id: `cfia_${item.recallId}`,
                    title: item.title || 'غير محدد',
                    brand: extractBrand(item.title) || 'غير محدد',
                    lot: 'غير محدد',
                    reason: item.issue || 'غير محدد',
                    date: item.date_published || new Date().toISOString(),
                    agency: 'CFIA/Health Canada',
                    country: 'Canada',
                    source_url: item.url || 'https://healthycanadians.gc.ca/recall-alert-rappel-avis/index-eng.php',
                    distribution: distribution,
                    affected_regions: affectedRegions,
                    scope: scopeInfo.scope,
                    scope_label: scopeInfo.label,
                    qatar_status: analyzeQatarStatus(
                        `${item.title} ${item.issue}`,
                        distribution,
                        affectedRegions
                    ),
                    urgent: item.classification === 'Class I' || item.issue?.toLowerCase().includes('serious'),
                    qa_possible: false,
                    source: 'CFIA'
                };
            });
        
        console.log(`✅ تم جلب ${recalls.length} استدعاء من CFIA`);
        return recalls;
        
    } catch (error) {
        console.error('❌ خطأ في جلب بيانات CFIA:', error.message);
        return [];
    }
}

// دالة جلب بيانات SFDA
async function fetchSFDARecalls() {
    try {
        console.log('📡 جاري جلب بيانات SFDA...');
        
        const response = await axios.get(DATA_SOURCES.SFDA.url, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Qatar-Food-Recalls-System/1.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });
        
        const $ = cheerio.load(response.data);
        const recalls = [];
        
        // البحث عن الاستدعاءات في الصفحة
        $('.recall-item, .news-item, .alert-item').each((index, element) => {
            const $item = $(element);
            const title = $item.find('h3, h4, .title').text().trim();
            const description = $item.find('p, .description, .content').text().trim();
            const link = $item.find('a').attr('href');
            const dateText = $item.find('.date, .publish-date').text().trim();
            
            if (title && title.length > 10) {
                const distribution = 'Saudi Arabia';
                const affectedRegions = ['Saudi Arabia', 'GCC'];
                const scopeInfo = determineScope(distribution, affectedRegions, 'Saudi Arabia');
                
                recalls.push({
                    id: `sfda_${Date.now()}_${index}`,
                    title: title,
                    brand: extractBrand(title) || 'غير محدد',
                    lot: 'غير محدد',
                    reason: description || 'غير محدد',
                    date: parseArabicDate(dateText) || new Date().toISOString(),
                    agency: 'SFDA',
                    country: 'Saudi Arabia',
                    source_url: link ? `https://www.sfda.gov.sa${link}` : DATA_SOURCES.SFDA.url,
                    distribution: distribution,
                    affected_regions: affectedRegions,
                    scope: scopeInfo.scope,
                    scope_label: scopeInfo.label,
                    qatar_status: 'possible', // السعودية قريبة من قطر
                    urgent: description.toLowerCase().includes('خطر') || description.toLowerCase().includes('عاجل'),
                    qa_possible: true, // احتمالية عالية لوجود المنتج في قطر
                    source: 'SFDA'
                });
            }
        });
        
        console.log(`✅ تم جلب ${recalls.length} استدعاء من SFDA`);
        return recalls;
        
    } catch (error) {
        console.error('❌ خطأ في جلب بيانات SFDA:', error.message);
        return [];
    }
}

// دالة جلب بيانات FSANZ
async function fetchFSANZRecalls() {
    try {
        console.log('📡 جاري جلب بيانات FSANZ...');
        
        const response = await axios.get(DATA_SOURCES.FSANZ.url, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Qatar-Food-Recalls-System/1.0'
            }
        });
        
        const $ = cheerio.load(response.data);
        const recalls = [];
        
        // البحث عن الاستدعاءات في الصفحة
        $('.recall-item, .news-item, .content-item').each((index, element) => {
            const $item = $(element);
            const title = $item.find('h3, h4, .title, a').first().text().trim();
            const description = $item.find('p, .description').text().trim();
            const link = $item.find('a').attr('href');
            const dateText = $item.find('.date, .publish-date').text().trim();
            
            if (title && title.length > 10) {
                const distribution = 'Australia/New Zealand';
                const affectedRegions = ['Australia', 'New Zealand'];
                const scopeInfo = determineScope(distribution, affectedRegions, 'Australia');
                
                recalls.push({
                    id: `fsanz_${Date.now()}_${index}`,
                    title: title,
                    brand: extractBrand(title) || 'غير محدد',
                    lot: 'غير محدد',
                    reason: description || 'غير محدد',
                    date: parseEnglishDate(dateText) || new Date().toISOString(),
                    agency: 'FSANZ',
                    country: 'Australia/New Zealand',
                    source_url: link ? `https://www.foodstandards.gov.au${link}` : DATA_SOURCES.FSANZ.url,
                    distribution: distribution,
                    affected_regions: affectedRegions,
                    scope: scopeInfo.scope,
                    scope_label: scopeInfo.label,
                    qatar_status: analyzeQatarStatus(
                        `${title} ${description}`,
                        distribution,
                        affectedRegions
                    ),
                    urgent: description.toLowerCase().includes('urgent') || description.toLowerCase().includes('serious'),
                    qa_possible: false,
                    source: 'FSANZ'
                });
            }
        });
        
        console.log(`✅ تم جلب ${recalls.length} استدعاء من FSANZ`);
        return recalls;
        
    } catch (error) {
        console.error('❌ خطأ في جلب بيانات FSANZ:', error.message);
        return [];
    }
}

// دالة استخراج العلامة التجارية
function extractBrand(text) {
    if (!text) return 'غير محدد';
    
    // البحث عن أنماط شائعة للعلامات التجارية
    const brandPatterns = [
        /brand[:\s]+([^,\n]+)/i,
        /manufactured by[:\s]+([^,\n]+)/i,
        /produced by[:\s]+([^,\n]+)/i,
        /company[:\s]+([^,\n]+)/i,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+brand/i,
        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/
    ];
    
    for (const pattern of brandPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    
    // استخراج أول كلمة بحروف كبيرة
    const words = text.split(/\s+/);
    for (const word of words) {
        if (word.length > 2 && /^[A-Z]/.test(word)) {
            return word;
        }
    }
    
    return 'غير محدد';
}

// دالة تحليل التاريخ العربي
function parseArabicDate(dateText) {
    if (!dateText) return null;
    
    try {
        // تحويل الأرقام العربية إلى إنجليزية
        const englishNumbers = dateText.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
        
        // البحث عن أنماط التاريخ
        const patterns = [
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
            /(\d{1,2})-(\d{1,2})-(\d{4})/,
            /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
            /(\d{4})-(\d{1,2})-(\d{1,2})/
        ];
        
        for (const pattern of patterns) {
            const match = englishNumbers.match(pattern);
            if (match) {
                const [, part1, part2, part3] = match;
                
                // تجربة تنسيقات مختلفة
                const date1 = new Date(`${part3}-${part2}-${part1}`);
                const date2 = new Date(`${part1}-${part2}-${part3}`);
                
                if (!isNaN(date1.getTime())) return date1.toISOString();
                if (!isNaN(date2.getTime())) return date2.toISOString();
            }
        }
        
        return new Date().toISOString();
    } catch (error) {
        return new Date().toISOString();
    }
}

// دالة تحليل التاريخ الإنجليزي
function parseEnglishDate(dateText) {
    if (!dateText) return null;
    
    try {
        const date = new Date(dateText);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
        return new Date().toISOString();
    } catch (error) {
        return new Date().toISOString();
    }
}

// دالة حفظ البيانات في Firestore
async function saveRecallsToFirestore(recalls) {
    const batch = db.batch();
    let savedCount = 0;
    
    for (const recall of recalls) {
        try {
            const docRef = db.collection('recalls').doc(recall.id);
            const existingDoc = await docRef.get();
            
            if (!existingDoc.exists) {
                batch.set(docRef, {
                    ...recall,
                    created_at: admin.firestore.FieldValue.serverTimestamp(),
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });
                savedCount++;
            } else {
                // تحديث البيانات الموجودة
                batch.update(docRef, {
                    ...recall,
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error(`خطأ في معالجة الاستدعاء ${recall.id}:`, error);
        }
    }
    
    if (savedCount > 0) {
        await batch.commit();
        console.log(`✅ تم حفظ ${savedCount} استدعاء جديد في Firestore`);
    }
    
    return savedCount;
}

// دالة حساب الإحصائيات
function calculateStats(recalls) {
    return {
        total: recalls.length,
        urgent: recalls.filter(r => r.urgent || r.qa_possible).length,
        international: recalls.filter(r => r.scope === 'international').length,
        qatar_relevant: recalls.filter(r => r.qatar_status === 'confirmed' || r.qatar_status === 'possible').length,
        countries_count: [...new Set(recalls.map(r => r.country))].length,
        agencies_count: [...new Set(recalls.map(r => r.agency))].length,
        by_source: recalls.reduce((acc, r) => {
            acc[r.source] = (acc[r.source] || 0) + 1;
            return acc;
        }, {}),
        by_country: recalls.reduce((acc, r) => {
            acc[r.country] = (acc[r.country] || 0) + 1;
            return acc;
        }, {}),
        by_qatar_status: recalls.reduce((acc, r) => {
            acc[r.qatar_status] = (acc[r.qatar_status] || 0) + 1;
            return acc;
        }, {})
    };
}

// دالة إرسال الإشعارات
async function sendNotifications(newRecalls, stats) {
    try {
        const urgentQatarRecalls = newRecalls.filter(r => 
            (r.urgent || r.qa_possible) && 
            (r.qatar_status === 'confirmed' || r.qatar_status === 'possible')
        );
        
        if (urgentQatarRecalls.length > 0) {
            // إشعار للاستدعاءات العاجلة المتعلقة بقطر
            const message = {
                notification: {
                    title: '🚨 استدعاء عاجل - قطر',
                    body: `تم اكتشاف ${urgentQatarRecalls.length} استدعاء عاجل قد يؤثر على قطر`
                },
                data: {
                    type: 'urgent_recall',
                    urgent: 'true',
                    count: urgentQatarRecalls.length.toString(),
                    timestamp: new Date().toISOString()
                },
                topic: 'urgent-recalls'
            };
            
            await messaging.send(message);
            console.log('✅ تم إرسال إشعار الاستدعاءات العاجلة');
        }
        
        if (newRecalls.length > 0) {
            // إشعار عام للتحديثات
            const message = {
                notification: {
                    title: 'تحديث نظام الإنذار المبكر',
                    body: `تم إضافة ${newRecalls.length} استدعاء جديد`
                },
                data: {
                    type: 'update',
                    urgent: 'false',
                    count: newRecalls.length.toString(),
                    timestamp: new Date().toISOString()
                },
                topic: 'all-users'
            };
            
            await messaging.send(message);
            console.log('✅ تم إرسال إشعار التحديث العام');
        }
        
    } catch (error) {
        console.error('❌ خطأ في إرسال الإشعارات:', error);
    }
}

// Cloud Function: جلب الاستدعاءات
exports.recalls = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
        try {
            console.log('📡 بدء جلب الاستدعاءات...');
            
            // جلب البيانات من Firestore
            const snapshot = await db.collection('recalls')
                .orderBy('created_at', 'desc')
                .limit(1000)
                .get();
            
            const recalls = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                recalls.push({
                    id: doc.id,
                    ...data,
                    created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
                    updated_at: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString()
                });
            });
            
            // حساب الإحصائيات
            const stats = calculateStats(recalls);
            
            res.status(200).json({
                success: true,
                data: recalls,
                stats: stats,
                timestamp: new Date().toISOString(),
                sources: Object.keys(DATA_SOURCES).filter(key => DATA_SOURCES[key].enabled)
            });
            
        } catch (error) {
            console.error('❌ خطأ في جلب الاستدعاءات:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
});

// Cloud Function: التحديث المجدول
exports.scheduledUpdate = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
        try {
            console.log('🔄 بدء التحديث المجدول...');
            
            const allRecalls = [];
            
            // جلب البيانات من جميع المصادر المفعلة
            const fetchPromises = [];
            
            if (DATA_SOURCES.FDA.enabled) {
                fetchPromises.push(fetchFDARecalls());
            }
            
            if (DATA_SOURCES.CFIA.enabled) {
                fetchPromises.push(fetchCFIARecalls());
            }
            
            if (DATA_SOURCES.SFDA.enabled) {
                fetchPromises.push(fetchSFDARecalls());
            }
            
            if (DATA_SOURCES.FSANZ.enabled) {
                fetchPromises.push(fetchFSANZRecalls());
            }
            
            // تنفيذ جميع الطلبات بالتوازي
            const results = await Promise.allSettled(fetchPromises);
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    allRecalls.push(...result.value);
                } else {
                    console.error(`فشل في جلب البيانات من المصدر ${index}:`, result.reason);
                }
            });
            
            console.log(`📊 تم جلب ${allRecalls.length} استدعاء من جميع المصادر`);
            
            // حفظ البيانات الجديدة
            const savedCount = await saveRecallsToFirestore(allRecalls);
            
            // حساب الإحصائيات
            const stats = calculateStats(allRecalls);
            
            // إرسال الإشعارات للاستدعاءات الجديدة
            if (savedCount > 0) {
                const newRecalls = allRecalls.slice(0, savedCount);
                await sendNotifications(newRecalls, stats);
            }
            
            // حفظ إحصائيات التحديث
            await db.collection('update_logs').add({
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                total_fetched: allRecalls.length,
                new_saved: savedCount,
                stats: stats,
                sources_status: Object.keys(DATA_SOURCES).reduce((acc, key) => {
                    acc[key] = DATA_SOURCES[key].enabled;
                    return acc;
                }, {})
            });
            
            res.status(200).json({
                success: true,
                message: 'تم التحديث بنجاح',
                fetched: allRecalls.length,
                saved: savedCount,
                stats: stats,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ خطأ في التحديث المجدول:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
});

// Cloud Function: إرسال إشعار تجريبي
exports.sendTestNotification = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
        try {
            const message = {
                notification: {
                    title: 'إشعار تجريبي - نظام الإنذار المبكر',
                    body: 'هذا إشعار تجريبي للتأكد من عمل النظام بشكل صحيح.'
                },
                data: {
                    type: 'test',
                    urgent: 'false',
                    timestamp: new Date().toISOString()
                },
                topic: 'all-users'
            };
            
            await messaging.send(message);
            
            res.status(200).json({
                success: true,
                message: 'تم إرسال الإشعار التجريبي بنجاح',
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ خطأ في إرسال الإشعار التجريبي:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
});

// Cloud Function: إدارة اشتراكات المواضيع
exports.manageTopicSubscriptions = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
        try {
            const { token, action, topics } = req.body;
            
            if (!token || !action || !topics) {
                throw new Error('معاملات مطلوبة مفقودة');
            }
            
            const results = [];
            
            for (const topic of topics) {
                try {
                    if (action === 'subscribe') {
                        await messaging.subscribeToTopic([token], topic);
                        results.push({ topic, status: 'subscribed' });
                    } else if (action === 'unsubscribe') {
                        await messaging.unsubscribeFromTopic([token], topic);
                        results.push({ topic, status: 'unsubscribed' });
                    }
                } catch (error) {
                    results.push({ topic, status: 'error', error: error.message });
                }
            }
            
            res.status(200).json({
                success: true,
                results: results,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ خطأ في إدارة اشتراكات المواضيع:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
});

console.log('✅ تم تحميل Firebase Functions بنجاح - الإصدار المحسن');
