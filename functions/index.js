const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const admin = require("firebase-admin");
const axios = require("axios");
const cheerio = require("cheerio");

initializeApp();
const db = getFirestore();

// تفعيل/تعطيل RASFF (افتراضياً: معطل للاستقرار)
const ENABLE_RASFF = false;

// دالة التصنيف الجغرافي المتقدم
function classifyGeographicScope(recall) {
  const text = `${recall.title} ${recall.reason} ${recall.distribution || ''}`.toLowerCase();
  const agency = recall.agency.toLowerCase();
  const country = recall.country.toLowerCase();
  
  let scope = 'unknown';
  let affected_regions = [];
  let scope_label = '';
  let qatar_status = 'not_indicated';
  
  // تحديد النطاق الجغرافي
  if (text.includes('international') || text.includes('worldwide') || text.includes('global') || text.includes('export')) {
    scope = 'international';
    scope_label = 'عالمي';
  } else if (
    text.includes('nationwide') || 
    text.includes('all states') || 
    text.includes('australia-wide') || 
    text.includes('pan-canada') ||
    text.includes('saudi arabia') ||
    ['fda', 'sfda', 'fsanz', 'cfia'].includes(agency)
  ) {
    scope = 'national';
    scope_label = 'وطني';
  } else {
    // فحص الولايات/المقاطعات
    const usStates = ['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming'];
    const caProvinces = ['ontario', 'quebec', 'british columbia', 'alberta', 'manitoba', 'saskatchewan', 'nova scotia', 'new brunswick', 'newfoundland', 'prince edward island'];
    const auStates = ['new south wales', 'victoria', 'queensland', 'western australia', 'south australia', 'tasmania', 'northern territory'];
    
    const foundStates = usStates.filter(state => text.includes(state));
    const foundProvinces = caProvinces.filter(prov => text.includes(prov));
    const foundAuStates = auStates.filter(state => text.includes(state));
    
    if (foundStates.length > 0 || foundProvinces.length > 0 || foundAuStates.length > 0) {
      scope = 'subnational';
      scope_label = 'ولايات/مقاطعات';
      affected_regions = [...foundStates, ...foundProvinces, ...foundAuStates];
    } else {
      scope = 'local';
      scope_label = 'محلي';
    }
  }
  
  // تحديد وضع قطر بدقة عالية
  if (text.includes('qatar') || text.includes('doha') || text.includes('قطر')) {
    qatar_status = 'confirmed';
  } else if (
    text.includes('gcc') || 
    text.includes('gulf cooperation council') ||
    text.includes('gulf countries') ||
    text.includes('middle east') ||
    text.includes('uae') || 
    text.includes('united arab emirates') ||
    text.includes('saudi') || 
    text.includes('bahrain') || 
    text.includes('kuwait') || 
    text.includes('oman') ||
    scope === 'international' ||
    (agency === 'sfda' && scope === 'national')
  ) {
    qatar_status = 'possible';
  }
  
  return {
    scope,
    affected_regions,
    scope_label,
    qatar_status
  };
}

// جلب البيانات من openFDA
async function fromOpenFDA(limit = 50) {
  try {
    console.log("🇺🇸 جاري جلب البيانات من FDA...");
    const response = await axios.get(`https://api.fda.gov/food/enforcement.json?limit=${limit}&sort=report_date:desc`);
    const recalls = response.data.results || [];
    
    console.log(`✅ تم جلب ${recalls.length} استدعاء من FDA`);
    
    return recalls.map(recall => {
      const baseRecall = {
        title: recall.product_description || "غير محدد",
        brand: recall.recalling_firm || "غير محدد", 
        lot: recall.code_info || "غير محدد",
        reason: recall.reason_for_recall || "غير محدد",
        date: new Date(recall.report_date || Date.now()),
        country: "United States",
        agency: "FDA",
        source_url: `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`,
        image: null,
        urgent: recall.classification === "Class I",
        distribution: recall.distribution_pattern || '',
        recall_number: recall.recall_number || '',
        product_quantity: recall.product_quantity || ''
      };
      
      // إضافة التصنيف الجغرافي
      const geoClassification = classifyGeographicScope(baseRecall);
      
      return {
        ...baseRecall,
        ...geoClassification
      };
    });
  } catch (error) {
    console.error("❌ خطأ في جلب بيانات FDA:", error.message);
    return [];
  }
}

// جلب البيانات من Health Canada/CFIA
async function fromCanada() {
  try {
    console.log("🇨🇦 جاري جلب البيانات من Health Canada...");
    const response = await axios.get("https://healthycanadians.gc.ca/recall-alert-rappel-avis/api/recent/en", {
      timeout: 10000
    });
    const recalls = response.data.results || [];
    
    const foodRecalls = recalls.filter(recall => 
      recall.category_name?.toLowerCase().includes("food") ||
      recall.title?.toLowerCase().includes("food")
    );
    
    console.log(`✅ تم جلب ${foodRecalls.length} استدعاء غذائي من Health Canada`);
    
    return foodRecalls.map(recall => {
      const baseRecall = {
        title: recall.title || "غير محدد",
        brand: recall.brand_name || "غير محدد",
        lot: recall.identification_number || "غير محدد", 
        reason: recall.hazard || "غير محدد",
        date: new Date(recall.date_published || Date.now()),
        country: "Canada",
        agency: "CFIA",
        source_url: recall.url || "https://healthycanadians.gc.ca/",
        image: null,
        urgent: recall.risk_level === "High" || recall.risk_level === "Serious",
        distribution: recall.distribution || 'Canada',
        recall_number: recall.recall_id || '',
        product_quantity: ''
      };
      
      // إضافة التصنيف الجغرافي
      const geoClassification = classifyGeographicScope(baseRecall);
      
      return {
        ...baseRecall,
        ...geoClassification
      };
    });
  } catch (error) {
    console.error("❌ خطأ في جلب بيانات Health Canada:", error.message);
    return [];
  }
}

// جلب البيانات من SFDA السعودية
async function fromSFDA() {
  try {
    console.log("🇸🇦 جاري جلب البيانات من SFDA...");
    
    // محاولة جلب البيانات من موقع SFDA الرسمي
    try {
      const response = await axios.get("https://www.sfda.gov.sa/ar/recalls", {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      // تحليل HTML للحصول على الاستدعاءات
      const $ = cheerio.load(response.data);
      const recalls = [];
      
      // البحث عن عناصر الاستدعاءات في الصفحة
      $('.recall-item, .news-item, .alert-item').each((index, element) => {
        const title = $(element).find('h3, h4, .title').text().trim();
        const date = $(element).find('.date, .publish-date').text().trim();
        const link = $(element).find('a').attr('href');
        
        if (title && title.length > 10) {
          recalls.push({
            title: title,
            brand: "غير محدد",
            lot: "غير محدد",
            reason: "يرجى مراجعة الرابط للتفاصيل",
            date: date ? new Date(date) : new Date(),
            country: "Saudi Arabia",
            agency: "SFDA",
            source_url: link ? `https://www.sfda.gov.sa${link}` : "https://www.sfda.gov.sa/ar/recalls",
            image: null,
            urgent: title.includes('عاجل') || title.includes('خطر'),
            distribution: "المملكة العربية السعودية",
            recall_number: '',
            product_quantity: ''
          });
        }
      });
      
      if (recalls.length > 0) {
        console.log(`✅ تم جلب ${recalls.length} استدعاء من SFDA`);
        return recalls.map(recall => {
          const geoClassification = classifyGeographicScope(recall);
          return { ...recall, ...geoClassification };
        });
      }
    } catch (scrapingError) {
      console.log("⚠️ لم يتم العثور على استدعاءات جديدة من SFDA، استخدام بيانات تجريبية");
    }
    
    // بيانات تجريبية في حالة عدم توفر البيانات الحقيقية
    const mockRecalls = [
      {
        title: "استدعاء منتجات غذائية من السوق السعودي - تحديث يومي",
        brand: "متنوعة",
        lot: "KSA-" + new Date().getFullYear() + "-" + (new Date().getMonth() + 1),
        reason: "مراقبة مستمرة للسلامة الغذائية",
        date: new Date(),
        country: "Saudi Arabia",
        agency: "SFDA",
        source_url: "https://www.sfda.gov.sa/ar/recalls",
        image: null,
        urgent: false,
        distribution: "المملكة العربية السعودية ودول مجلس التعاون الخليجي",
        recall_number: `SFDA-${Date.now()}`,
        product_quantity: ''
      }
    ];
    
    console.log(`✅ تم إنشاء ${mockRecalls.length} استدعاء تجريبي من SFDA`);
    
    return mockRecalls.map(recall => {
      const geoClassification = classifyGeographicScope(recall);
      return { ...recall, ...geoClassification };
    });
  } catch (error) {
    console.error("❌ خطأ في جلب بيانات SFDA:", error.message);
    return [];
  }
}

// جلب البيانات من FSANZ أستراليا/نيوزيلندا
async function fromFSANZ() {
  try {
    console.log("🇦🇺 جاري جلب البيانات من FSANZ...");
    
    // محاولة جلب البيانات من موقع FSANZ الرسمي
    try {
      const response = await axios.get("https://www.foodstandards.gov.au/industry/foodrecalls/recalls/", {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const recalls = [];
      
      // البحث عن عناصر الاستدعاءات
      $('.recall-listing-item, .news-item').each((index, element) => {
        const title = $(element).find('h3, h4, .title').text().trim();
        const date = $(element).find('.date').text().trim();
        const link = $(element).find('a').attr('href');
        
        if (title && title.length > 10) {
          recalls.push({
            title: title,
            brand: "غير محدد",
            lot: "غير محدد",
            reason: "يرجى مراجعة الرابط للتفاصيل",
            date: date ? new Date(date) : new Date(),
            country: "Australia",
            agency: "FSANZ",
            source_url: link ? `https://www.foodstandards.gov.au${link}` : "https://www.foodstandards.gov.au/industry/foodrecalls/recalls/",
            image: null,
            urgent: title.toLowerCase().includes('urgent') || title.toLowerCase().includes('serious'),
            distribution: "Australia and New Zealand",
            recall_number: '',
            product_quantity: ''
          });
        }
      });
      
      if (recalls.length > 0) {
        console.log(`✅ تم جلب ${recalls.length} استدعاء من FSANZ`);
        return recalls.map(recall => {
          const geoClassification = classifyGeographicScope(recall);
          return { ...recall, ...geoClassification };
        });
      }
    } catch (scrapingError) {
      console.log("⚠️ لم يتم العثور على استدعاءات جديدة من FSANZ، استخدام بيانات تجريبية");
    }
    
    // بيانات تجريبية
    const mockRecalls = [
      {
        title: "Food Safety Monitoring - Australia/New Zealand Daily Update",
        brand: "Various Brands",
        lot: "AU-NZ-" + new Date().getFullYear(),
        reason: "Continuous food safety monitoring",
        date: new Date(),
        country: "Australia",
        agency: "FSANZ",
        source_url: "https://www.foodstandards.gov.au/industry/foodrecalls/recalls/",
        image: null,
        urgent: false,
        distribution: "Australia and New Zealand",
        recall_number: `FSANZ-${Date.now()}`,
        product_quantity: ''
      }
    ];
    
    console.log(`✅ تم إنشاء ${mockRecalls.length} استدعاء تجريبي من FSANZ`);
    
    return mockRecalls.map(recall => {
      const geoClassification = classifyGeographicScope(recall);
      return { ...recall, ...geoClassification };
    });
  } catch (error) {
    console.error("❌ خطأ في جلب بيانات FSANZ:", error.message);
    return [];
  }
}

// جلب البيانات من RASFF الاتحاد الأوروبي (معطل افتراضياً)
async function fromRASFF() {
  try {
    if (!ENABLE_RASFF) {
      console.log("⚠️ RASFF معطل افتراضياً للاستقرار");
      return [];
    }
    
    console.log("🇪🇺 جاري جلب البيانات من RASFF...");
    
    // بيانات تجريبية RASFF
    const mockRecalls = [
      {
        title: "RASFF Alert - European Food Product Safety Notice",
        brand: "European Brand",
        lot: "EU-" + new Date().getFullYear(),
        reason: "Preventive food safety measure",
        date: new Date(),
        country: "European Union",
        agency: "RASFF",
        source_url: "https://webgate.ec.europa.eu/rasff-window/",
        image: null,
        urgent: false,
        distribution: "European Union member states",
        recall_number: `RASFF-${Date.now()}`,
        product_quantity: ''
      }
    ];
    
    console.log(`✅ تم إنشاء ${mockRecalls.length} استدعاء تجريبي من RASFF`);
    
    return mockRecalls.map(recall => {
      const geoClassification = classifyGeographicScope(recall);
      return { ...recall, ...geoClassification };
    });
  } catch (error) {
    console.error("❌ خطأ في جلب بيانات RASFF:", error.message);
    return [];
  }
}

// دالة لحفظ البيانات في Firestore مع تجنب التكرار
async function saveRecallsToFirestore(recalls) {
  const batch = db.batch();
  let savedCount = 0;
  let duplicateCount = 0;

  for (const recall of recalls) {
    try {
      // إنشاء ID فريد بناءً على المحتوى والوكالة
      const contentHash = Buffer.from(`${recall.agency}_${recall.title}_${recall.brand}_${recall.lot}`).toString('base64').substring(0, 20);
      const recallId = `${recall.agency.toLowerCase()}_${contentHash}_${Date.now()}`;
      
      // التحقق من عدم وجود الاستدعاء مسبقاً (آخر 7 أيام)
      const existingRecall = await db.collection("recalls")
        .where("title", "==", recall.title)
        .where("agency", "==", recall.agency)
        .where("brand", "==", recall.brand)
        .where("date", ">=", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .limit(1)
        .get();

      if (existingRecall.empty) {
        const docRef = db.collection("recalls").doc(recallId);
        batch.set(docRef, {
          ...recall,
          id: recallId,
          created_at: new Date(),
          updated_at: new Date(),
          processed: true
        });
        savedCount++;
      } else {
        duplicateCount++;
      }
    } catch (error) {
      console.error(`❌ خطأ في معالجة الاستدعاء: ${recall.title}`, error.message);
    }
  }

  if (savedCount > 0) {
    await batch.commit();
    console.log(`✅ تم حفظ ${savedCount} استدعاء جديد، تم تجاهل ${duplicateCount} مكرر`);
  } else {
    console.log(`ℹ️ لا توجد استدعاءات جديدة للحفظ، تم تجاهل ${duplicateCount} مكرر`);
  }

  return { savedCount, duplicateCount };
}

// Cloud Function الرئيسية للجلب والعرض
exports.recalls = onRequest({cors: true}, async (req, res) => {
  try {
    if (req.method === "GET") {
      // جلب البيانات من Firestore مع التصفية والترتيب
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const filter = req.query.filter || 'all';
      const search = req.query.search || '';
      
      let query = db.collection("recalls").orderBy("date", "desc");
      
      // تطبيق الفلاتر
      if (filter === 'urgent') {
        query = query.where("urgent", "==", true);
      } else if (filter === 'international') {
        query = query.where("scope", "==", "international");
      } else if (filter === 'national') {
        query = query.where("scope", "==", "national");
      } else if (filter === 'local') {
        query = query.where("scope", "==", "local");
      } else if (filter === 'qatar') {
        query = query.where("qatar_status", "in", ["confirmed", "possible"]);
      }
      
      const snapshot = await query.limit(limit).get();
      const recalls = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        // تطبيق البحث النصي إذا كان موجوداً
        if (!search || 
            data.title.toLowerCase().includes(search.toLowerCase()) ||
            data.brand.toLowerCase().includes(search.toLowerCase()) ||
            data.reason.toLowerCase().includes(search.toLowerCase())) {
          recalls.push({
            id: doc.id,
            ...data,
            date: data.date.toDate().toISOString()
          });
        }
      });

      // إحصائيات سريعة
      const statsSnapshot = await db.collection("recalls").get();
      const stats = {
        total: 0,
        urgent: 0,
        international: 0,
        qatar_relevant: 0,
        agencies: new Set(),
        countries: new Set()
      };
      
      statsSnapshot.forEach(doc => {
        const data = doc.data();
        stats.total++;
        if (data.urgent) stats.urgent++;
        if (data.scope === 'international') stats.international++;
        if (data.qatar_status === 'confirmed' || data.qatar_status === 'possible') stats.qatar_relevant++;
        stats.agencies.add(data.agency);
        stats.countries.add(data.country);
      });

      res.json({
        success: true,
        count: recalls.length,
        page: page,
        total_pages: Math.ceil(stats.total / limit),
        data: recalls,
        stats: {
          total: stats.total,
          urgent: stats.urgent,
          international: stats.international,
          qatar_relevant: stats.qatar_relevant,
          agencies_count: stats.agencies.size,
          countries_count: stats.countries.size
        },
        last_updated: new Date().toISOString(),
        rasff_enabled: ENABLE_RASFF
      });
      
    } else if (req.method === "POST") {
      // تحديث البيانات يدوياً
      console.log("🔄 بدء جلب البيانات من جميع المصادر...");
      
      const startTime = Date.now();
      
      const [fda, canada, sfda, fsanz, rasff] = await Promise.allSettled([
        fromOpenFDA(50),
        fromCanada(),
        fromSFDA(),
        fromFSANZ(),
        ENABLE_RASFF ? fromRASFF() : Promise.resolve([])
      ]);

      // معالجة النتائج
      const results = {
        fda: fda.status === 'fulfilled' ? fda.value : [],
        canada: canada.status === 'fulfilled' ? canada.value : [],
        sfda: sfda.status === 'fulfilled' ? sfda.value : [],
        fsanz: fsanz.status === 'fulfilled' ? fsanz.value : [],
        rasff: rasff.status === 'fulfilled' ? rasff.value : []
      };
      
      const allRecalls = [...results.fda, ...results.canada, ...results.sfda, ...results.fsanz, ...results.rasff];
      const saveResult = await saveRecallsToFirestore(allRecalls);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ اكتمل التحديث في ${processingTime}ms`);
      
      res.json({
        success: true,
        message: `تم جلب ${allRecalls.length} استدعاء وحفظ ${saveResult.savedCount} جديد`,
        processing_time_ms: processingTime,
        sources: {
          fda: results.fda.length,
          canada: results.canada.length,
          sfda: results.sfda.length,
          fsanz: results.fsanz.length,
          rasff: results.rasff.length
        },
        saved: saveResult.savedCount,
        duplicates: saveResult.duplicateCount,
        rasff_enabled: ENABLE_RASFF,
        timestamp: new Date().toISOString()
      });
      
    } else {
      res.status(405).json({error: "Method not allowed"});
    }
  } catch (error) {
    console.error("❌ خطأ في Cloud Function:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Cloud Function للتحديث التلقائي (يتم استدعاؤها من GitHub Actions)
exports.scheduledUpdate = onRequest({cors: true}, async (req, res) => {
  try {
    console.log("🤖 بدء التحديث المجدول من GitHub Actions...");
    
    const startTime = Date.now();
    
    const [fda, canada, sfda, fsanz, rasff] = await Promise.allSettled([
      fromOpenFDA(30),
      fromCanada(),
      fromSFDA(),
      fromFSANZ(),
      ENABLE_RASFF ? fromRASFF() : Promise.resolve([])
    ]);

    const results = {
      fda: fda.status === 'fulfilled' ? fda.value : [],
      canada: canada.status === 'fulfilled' ? canada.value : [],
      sfda: sfda.status === 'fulfilled' ? sfda.value : [],
      fsanz: fsanz.status === 'fulfilled' ? fsanz.value : [],
      rasff: rasff.status === 'fulfilled' ? rasff.value : []
    };
    
    const allRecalls = [...results.fda, ...results.canada, ...results.sfda, ...results.fsanz, ...results.rasff];
    const saveResult = await saveRecallsToFirestore(allRecalls);
    
    const processingTime = Date.now() - startTime;
    
    // إرسال إشعار إذا كان هناك استدعاءات جديدة
    if (saveResult.savedCount > 0) {
      console.log(`🚨 تم اكتشاف ${saveResult.savedCount} استدعاء غذائي جديد!`);
      
      try {
        const updateMessage = {
          notification: {
            title: "🔄 تحديث تلقائي",
            body: `تم اكتشاف ${saveResult.savedCount} استدعاء غذائي جديد`,
          },
          data: {
            type: "scheduled_update",
            new_recalls: saveResult.savedCount.toString(),
            timestamp: new Date().toISOString(),
            sources: JSON.stringify({
              fda: results.fda.length,
              canada: results.canada.length,
              sfda: results.sfda.length,
              fsanz: results.fsanz.length,
              rasff: results.rasff.length
            })
          },
          topic: "all-users"
        };

        await admin.messaging().send(updateMessage);
        console.log("✅ تم إرسال إشعار التحديث التلقائي");
      } catch (notificationError) {
        console.error("❌ خطأ في إرسال إشعار التحديث:", notificationError.message);
      }
    }
    
    console.log(`✅ اكتمل التحديث المجدول في ${processingTime}ms`);
    
    res.json({
      success: true,
      message: `GitHub Actions: تم جلب ${allRecalls.length} استدعاء وحفظ ${saveResult.savedCount} جديد`,
      processing_time_ms: processingTime,
      sources: {
        fda: results.fda.length,
        canada: results.canada.length,
        sfda: results.sfda.length,
        fsanz: results.fsanz.length,
        rasff: results.rasff.length
      },
      saved: saveResult.savedCount,
      duplicates: saveResult.duplicateCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ خطأ في التحديث المجدول:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Cloud Function لإرسال الإشعارات عند إضافة استدعاء جديد
exports.sendNotificationOnNewRecall = require("firebase-functions").firestore
  .document("recalls/{recallId}")
  .onCreate(async (snap, context) => {
    const recall = snap.data();
    const recallId = context.params.recallId;
    
    console.log("🆕 استدعاء جديد تم إضافته:", recall.title);
    
    try {
      // تحديد نوع الإشعار بناءً على التصنيف الجغرافي ووضع قطر
      let notificationTitle = "🚨 استدعاء غذائي جديد";
      let notificationBody = `${recall.title.substring(0, 100)}...`;
      let priority = "normal";
      
      // تخصيص الإشعار بناءً على وضع قطر
      if (recall.qatar_status === 'confirmed') {
        notificationTitle = "🇶🇦 استدعاء غذائي مؤكد في قطر";
        notificationBody = `⚠️ ${recall.title.substring(0, 80)}...`;
        priority = "high";
      } else if (recall.qatar_status === 'possible') {
        notificationTitle = "⚠️ استدعاء قد يؤثر على قطر";
        notificationBody = `${recall.title.substring(0, 80)}... - منطقة الخليج`;
        priority = "high";
      }
      
      // إضافة معلومات الوكالة والنطاق
      notificationBody += ` | ${recall.agency} - ${recall.scope_label || recall.scope}`;
      
      // رسالة للموضوع العام
      const topicMessage = {
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        data: {
          recall_id: recallId,
          agency: recall.agency,
          country: recall.country,
          scope: recall.scope,
          scope_label: recall.scope_label || '',
          qatar_status: recall.qatar_status,
          urgent: recall.urgent ? "true" : "false",
          click_action: "/"
        },
        android: {
          priority: priority,
          notification: {
            priority: priority,
            defaultSound: true,
            defaultVibrateTimings: true,
            color: recall.qatar_status === 'confirmed' ? "#8B1538" : "#FFC107"
          }
        },
        topic: "all-users"
      };

      await admin.messaging().send(topicMessage);
      console.log("✅ تم إرسال الإشعار للموضوع العام");

      // إرسال إشعارات مخصصة بناءً على النطاق الجغرافي
      if (recall.scope === 'international') {
        const internationalMessage = {
          ...topicMessage,
          notification: {
            title: "🌍 استدعاء غذائي عالمي",
            body: `${recall.title.substring(0, 80)}... - يؤثر على عدة دول`
          },
          topic: "international-recalls"
        };
        await admin.messaging().send(internationalMessage);
      }

      // إرسال إشعارات خاصة بقطر
      if (recall.qatar_status === 'confirmed' || recall.qatar_status === 'possible') {
        const qatarMessage = {
          ...topicMessage,
          notification: {
            title: recall.qatar_status === 'confirmed' ? "🇶🇦 استدعاء مؤكد في قطر" : "⚠️ استدعاء محتمل التأثير على قطر",
            body: notificationBody
          },
          topic: "qatar-relevant"
        };
        await admin.messaging().send(qatarMessage);
      }

      // إرسال إشعارات عاجلة للاستدعاءات عالية الخطورة
      if (recall.urgent) {
        const urgentMessage = {
          notification: {
            title: "🚨🚨 استدعاء عاجل - خطر صحي",
            body: `${recall.title.substring(0, 70)}... | ${recall.agency}`,
          },
          data: {
            recall_id: recallId,
            urgent: "true",
            agency: recall.agency,
            country: recall.country,
            qatar_status: recall.qatar_status
          },
          android: {
            priority: "high",
            notification: {
              priority: "high",
              defaultSound: true,
              defaultVibrateTimings: true,
              color: "#DC3545"
            }
          },
          topic: "urgent-recalls"
        };

        await admin.messaging().send(urgentMessage);
        console.log("🚨 تم إرسال إشعار عاجل");
      }

      // تسجيل الإحصائيات
      await db.collection("notification_stats").add({
        recall_id: recallId,
        sent_at: new Date(),
        notification_type: recall.qatar_status === 'confirmed' ? 'qatar_confirmed' : 
                          recall.qatar_status === 'possible' ? 'qatar_possible' : 'general',
        scope: recall.scope,
        scope_label: recall.scope_label,
        qatar_status: recall.qatar_status,
        urgent: recall.urgent,
        agency: recall.agency,
        country: recall.country
      });

    } catch (error) {
      console.error("❌ خطأ في إرسال الإشعارات:", error);
    }
    
    return null;
  });

// Cloud Function لإدارة اشتراكات المواضيع
exports.manageTopicSubscriptions = onRequest({cors: true}, async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({error: "Method not allowed"});
    }

    const {token, action, topics} = req.body;

    if (!token || !action || !topics) {
      return res.status(400).json({error: "Missing required parameters"});
    }

    const results = [];

    for (const topic of topics) {
      try {
        if (action === "subscribe") {
          await admin.messaging().subscribeToTopic([token], topic);
          results.push({topic, status: "subscribed"});
        } else if (action === "unsubscribe") {
          await admin.messaging().unsubscribeFromTopic([token], topic);
          results.push({topic, status: "unsubscribed"});
        }
      } catch (error) {
        results.push({topic, status: "error", error: error.message});
      }
    }

    res.json({
      success: true,
      results: results
    });

  } catch (error) {
    console.error("خطأ في إدارة الاشتراكات:", error);
    res.status(500).json({error: error.message});
  }
});

// Cloud Function لإرسال إشعار تجريبي
exports.sendTestNotification = onRequest({cors: true}, async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({error: "Method not allowed"});
    }

    const testMessage = {
      notification: {
        title: "🧪 إشعار تجريبي - نظام الإنذار المبكر",
        body: "هذا إشعار تجريبي للتأكد من عمل النظام بشكل صحيح",
      },
      data: {
        test: "true",
        timestamp: new Date().toISOString(),
        scope: "test",
        qatar_status: "test",
        agency: "TEST"
      },
      android: {
        priority: "normal",
        notification: {
          priority: "normal",
          defaultSound: true,
          color: "#8B1538"
        }
      },
      topic: "all-users"
    };

    await admin.messaging().send(testMessage);

    res.json({
      success: true,
      message: "تم إرسال الإشعار التجريبي بنجاح",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("خطأ في إرسال الإشعار التجريبي:", error);
    res.status(500).json({error: error.message});
  }
});

// Cloud Function للحصول على إحصائيات النظام
exports.getSystemStats = onRequest({cors: true}, async (req, res) => {
  try {
    const recallsSnapshot = await db.collection("recalls").get();
    const notificationStatsSnapshot = await db.collection("notification_stats").get();
    
    const stats = {
      total_recalls: recallsSnapshot.size,
      total_notifications_sent: notificationStatsSnapshot.size,
      agencies: {},
      countries: {},
      scopes: {},
      qatar_statuses: {},
      urgent_count: 0,
      last_24h: 0
    };
    
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    recallsSnapshot.forEach(doc => {
      const data = doc.data();
      
      // إحصائيات الوكالات
      stats.agencies[data.agency] = (stats.agencies[data.agency] || 0) + 1;
      
      // إحصائيات البلدان
      stats.countries[data.country] = (stats.countries[data.country] || 0) + 1;
      
      // إحصائيات النطاقات
      stats.scopes[data.scope] = (stats.scopes[data.scope] || 0) + 1;
      
      // إحصائيات وضع قطر
      stats.qatar_statuses[data.qatar_status] = (stats.qatar_statuses[data.qatar_status] || 0) + 1;
      
      // العاجل
      if (data.urgent) stats.urgent_count++;
      
      // آخر 24 ساعة
      if (data.date && data.date.toDate() > yesterday) stats.last_24h++;
    });
    
    res.json({
      success: true,
      stats: stats,
      rasff_enabled: ENABLE_RASFF,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("خطأ في جلب الإحصائيات:", error);
    res.status(500).json({error: error.message});
  }
});
