import { chromium } from 'playwright';

// ضع رابط موقعك المحلي أو رابط GitHub Pages
const TARGET_URL = "https://df-thaer.github.io/Pass-Guard/"; 
const SLOW_MOTION_MS = 450;

const testResults = [];
const consoleErrors = [];

function logResult(testName, passed, details = "") {
  const status = passed ? "✅ ناجح (PASS)" : "❌ فاشل (FAIL)";
  testResults.push({ testName, passed, details });
  console.log(`${status} | ${testName} ${details ? `- (${details})` : ''}`);
}

(async () => {
  console.log("\n🚀 بدء الفحص الآلي الشامل لموقع Pass-Guard عبر المتصفح...\n" + "=".repeat(60));
  const browser = await chromium.launch({ headless: false, slowMo: SLOW_MOTION_MS });
  const context = await browser.newContext({ viewport: { width: 1366, height: 850 } });
  const page = await context.newPage();

  page.on('pageerror', err => consoleErrors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  try {
    // 1. فحص تحميل الصفحة الرئيسية
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    const titleVisible = await page.locator("text=Pass-Guard").first().isVisible();
    logResult("1. تحميل الصفحة الرئيسية وشعار Pass-Guard", titleVisible);

    // 2. فحص تبديل المظهر واللغة
    try {
      const themeBtn = page.locator("button[title='تبديل المظهر'], button[title='Toggle Appearance']").first();
      await themeBtn.click();
      await themeBtn.click();

      const langBtn = page.locator("button[title='English'], button[title='العربية']").first();
      await langBtn.click();
      const enLoaded = await page.locator("text=Open Vault (Sign In)").isVisible();
      await langBtn.click();
      const arLoaded = await page.locator("text=فتح الخزنة (تسجيل الدخول)").isVisible();
      logResult("2. تبديل المظهر (Dark/Light) واللغة (AR/EN)", enLoaded && arLoaded);
    } catch (e) {
      logResult("2. تبديل المظهر واللغة", false, e.message);
    }

    // 3. فحص النوافذ المنبثقة وفاحص كلمة السر
    try {
      await page.locator("button[title='فاحص كلمة السر']").click();
      const auditorInput = page.locator("input[placeholder*='اكتب أي كلمة مرور']");
      await auditorInput.fill("Weak123");
      const weakDetected = await page.locator("text=ضعيفة").isVisible();
      await auditorInput.fill("StrongPass#2026!XyZ");
      const strongDetected = await page.locator("text=قوية جداً").isVisible();
      await page.locator("button:has-text('إغلاق')").first().click();

      await page.locator("button[title='عن الموقع']").click();
      const aboutVisible = await page.locator("text=مميزات النظام").isVisible();
      await page.locator("button:has-text('إغلاق')").first().click();

      logResult("3. عمل فاحص كلمات المرور والنوافذ التعريفية", weakDetected && strongDetected && aboutVisible);
    } catch (e) {
      logResult("3. عمل فاحص كلمات المرور والنوافذ التعريفية", false, e.message);
    }

    // 4. فحص إنشاء خزنة جديدة
    const testUser = `test_user_${Math.floor(1000 + Math.random() * 9000)}`;
    const testPass = "MasterKey#2026!";
    try {
      await page.locator("button:has-text('إنشاء خزنة جديدة')").click();
      await page.locator("input[placeholder='user@domain.com']").fill(testUser);
      const passInputs = page.locator("input[placeholder='••••••••••••']");

      await passInputs.nth(0).fill("weakpass");
      await passInputs.nth(1).fill("weakpass");
      await page.locator("button:has-text('إنشاء الخزنة وبدء الاستخدام')").click();
      const complexityBlocked = await page.locator("text=كلمة المرور يجب أن لا تقل عن 8 خانات").isVisible();

      await passInputs.nth(0).fill(testPass);
      await passInputs.nth(1).fill(testPass);
      await page.locator("button:has-text('إنشاء الخزنة وبدء الاستخدام')").click();

      await page.waitForSelector("text=إضافة حساب جديد", { timeout: 10000 });
      const vaultOpened = await page.locator("text=إضافة حساب جديد").isVisible();
      logResult("4. إنشاء خزنة جديدة وتشفيرها وفك قفلها", complexityBlocked && vaultOpened, `User: ${testUser}`);
    } catch (e) {
      logResult("4. إنشاء خزنة جديدة وتشفيرها وفك قفلها", false, e.message);
    }

    // 5. فحص إضافة حسابات والمولد الحي
    try {
      await page.locator("button:has-text('إضافة حساب جديد')").click();
      await page.locator("button:has-text('خيارات المولد الحي والتحكم')").click();

      const formInputs = page.locator("form input[type='text']");
      const generatedPass = await formInputs.nth(4).inputValue();
      const genWorked = generatedPass.length >= 8;

      await formInputs.nth(0).fill("GitHub Account");
      await formInputs.nth(1).fill("thaer_dev");
      await formInputs.nth(2).fill("https://github.com");
      await formInputs.nth(3).fill("thaer@example.com");
      await page.locator("button:has-text('حفظ في الخزنة')").click();

      await page.locator("button:has-text('إضافة حساب جديد')").click();
      await formInputs.nth(0).fill("Google Account");
      await formInputs.nth(1).fill("thaer_google");
      await formInputs.nth(4).fill("GooglePass#2026!");
      await page.locator("button:has-text('حفظ في الخزنة')").click();

      const itemsVisible = await page.locator("text=GitHub Account").isVisible() && await page.locator("text=Google Account").isVisible();
      logResult("5. إضافة حسابات وتوليد كلمات المرور الحية", genWorked && itemsVisible);
    } catch (e) {
      logResult("5. إضافة حسابات وتوليد كلمات المرور الحية", false, e.message);
    }

    // 6. فحص التحديد أثناء البحث
    try {
      const searchInput = page.locator("input[placeholder='بحث في الحسابات المحفوظة...']");
      await searchInput.fill("GitHub");
      await page.waitForTimeout(300);

      const selectBtn = page.locator("button:has-text('تحديد')").first();
      await selectBtn.click();
      const btnText = await selectBtn.innerText();
      const selectedOne = btnText.includes("(1)");
      await selectBtn.click();
      await searchInput.fill("");
      logResult("6. التزام 'تحديد الكل' بفلتر البحث", selectedOne, btnText);
    } catch (e) {
      logResult("6. التزام 'تحديد الكل' بفلتر البحث", false, e.message);
    }

    // 7. فحص قسم التدقيق الأمني وسجل الأجهزة
    try {
      await page.locator("button:has-text('معلومات وأمان الخزنة')").click();
      const metricsVisible = await page.locator("text=تقييم مناعة الخزنة").isVisible();
      await page.locator("button:has-text('سجل الأجهزة والجلسات')").click();
      const devicesVisible = await page.locator("text=الجلسة الحالية").isVisible() || await page.locator("text=لا يوجد سجل").isVisible();
      logResult("7. قسم التدقيق الأمني وسجل الجلسات", metricsVisible && devicesVisible);
    } catch (e) {
      logResult("7. قسم التدقيق الأمني وسجل الجلسات", false, e.message);
    }

  } catch (err) {
    console.log(`\n⚠️ توقف الفحص بسبب خطأ: ${err.message}`);
  }

  console.log("\n" + "=".repeat(60));
  const passedCount = testResults.filter(r => r.passed).length;
  console.log(`📊 النتيجة النهائية: نجح ${passedCount} من أصل ${testResults.length} اختبارات`);
  if (consoleErrors.length > 0) {
    console.log(`⚠️ أخطاء الكونسول المرصودة (${consoleErrors.length}):`);
    consoleErrors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
  } else {
    console.log("✨ سجل الـ Console نظيف تماماً (0 أخطاء JavaScript)!");
  }
  console.log("=".repeat(60) + "\n");

  await page.waitForTimeout(3000);
  await browser.close();
})();