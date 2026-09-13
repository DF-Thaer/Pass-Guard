import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, Copy, Check, Plus, Search, LogOut, Trash2, KeyRound, User, AlertTriangle, ShieldAlert, Users, Globe, Sun, Moon, Key, Unlock, Info, Shield, Zap, Download, Upload, Sliders, Eye, EyeOff, ExternalLink, BarChart3, Activity, ArrowRight, RotateCcw, Laptop, Smartphone, Wifi, Clock, Server, ArrowLeft, Save, CheckSquare, Square, Scissors, Clipboard, FolderPlus, Folder, Edit3, Settings } from 'lucide-react';

const importCryptoKey = async (password, salt) => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

async function encryptData(secretData, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await importCryptoKey(password, salt);
  const enc = new TextEncoder();
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    enc.encode(JSON.stringify(secretData))
  );

  return {
    ciphertext: Array.from(new Uint8Array(encrypted)),
    salt: Array.from(salt),
    iv: Array.from(iv)
  };
}

async function decryptData(encryptedObj, password) {
  try {
    const salt = new Uint8Array(encryptedObj.salt);
    const iv = new Uint8Array(encryptedObj.iv);
    const data = new Uint8Array(encryptedObj.ciphertext);
    const key = await importCryptoKey(password, salt);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
  } catch (e) {
    return null;
  }
}

const isValidPassword = (pass) => {
  if (!pass) return false;
  return pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass);
};

const POPULAR_SITES = [
  { name: "Snapchat", url: "https://snapchat.com" }, { name: "Google", url: "https://google.com" },
  { name: "GitHub", url: "https://github.com" }, { name: "Netflix", url: "https://netflix.com" },
  { name: "Instagram", url: "https://instagram.com" }, { name: "Twitter / X", url: "https://twitter.com" },
  { name: "Facebook", url: "https://facebook.com" }, { name: "Amazon", url: "https://amazon.com" },
  { name: "Apple ID", url: "https://apple.com" }, { name: "LinkedIn", url: "https://linkedin.com" },
  { name: "TikTok", url: "https://tiktok.com" }, { name: "Pinterest", url: "https://pinterest.com" },
  { name: "Reddit", url: "https://reddit.com" }, { name: "YouTube", url: "https://youtube.com" },
  { name: "WhatsApp", url: "https://web.whatsapp.com" }, { name: "Telegram", url: "https://web.telegram.org" },
  { name: "Discord", url: "https://discord.com" }, { name: "Spotify", url: "https://spotify.com" },
  { name: "Zoom", url: "https://zoom.us" }, { name: "PayPal", url: "https://paypal.com" },
  { name: "Quora", url: "https://quora.com" }, { name: "Tumblr", url: "https://tumblr.com" },
  { name: "Dropbox", url: "https://dropbox.com" }, { name: "WordPress", url: "https://wordpress.com" },
  { name: "Vimeo", url: "https://vimeo.com" }, { name: "Yahoo", url: "https://yahoo.com" },
  { name: "Bing", url: "https://bing.com" }, { name: "eBay", url: "https://ebay.com" },
  { name: "AliExpress", url: "https://aliexpress.com" }, { name: "Booking", url: "https://booking.com" },
  { name: "Airbnb", url: "https://airbnb.com" }, { name: "Uber", url: "https://uber.com" },
  { name: "Microsoft", url: "https://microsoft.com" }, { name: "Stack Overflow", url: "https://stackoverflow.com" },
  { name: "Twitch", url: "https://twitch.tv" }, { name: "Shopify", url: "https://shopify.com" },
  { name: "Medium", url: "https://medium.com" }, { name: "Canva", url: "https://canva.com" },
  { name: "Slack", url: "https://slack.com" }, { name: "Trello", url: "https://trello.com" },
  { name: "Asana", url: "https://asana.com" }, { name: "Notion", url: "https://notion.so" },
  { name: "Figma", url: "https://figma.com" }, { name: "Adobe", url: "https://adobe.com" },
  { name: "Salesforce", url: "https://salesforce.com" }, { name: "HubSpot", url: "https://hubspot.com" },
  { name: "Mailchimp", url: "https://mailchimp.com" }, { name: "Zendesk", url: "https://zendesk.com" },
  { name: "Stripe", url: "https://stripe.com" }, { name: "Square", url: "https://squareup.com" },
  { name: "Patreon", url: "https://patreon.com" }, { name: "OnlyFans", url: "https://onlyfans.com" },
  { name: "SoundCloud", url: "https://soundcloud.com" }, { name: "Viber", url: "https://viber.com" },
  { name: "Line", url: "https://line.me" }, { name: "WeChat", url: "https://wechat.com" },
  { name: "QQ", url: "https://im.qq.com" }, { name: "Baidu", url: "https://baidu.com" },
  { name: "Yandex", url: "https://yandex.com" }, { name: "Naver", url: "https://naver.com" },
  { name: "KakaoTalk", url: "https://kakaocorp.com" }, { name: "Roblox", url: "https://roblox.com" },
  { name: "Epic Games", url: "https://epicgames.com" }, { name: "Steam", url: "https://store.steampowered.com" },
  { name: "PlayStation", url: "https://playstation.com" }, { name: "Xbox", url: "https://xbox.com" },
  { name: "Nintendo", url: "https://nintendo.com" }, { name: "EA", url: "https://ea.com" },
  { name: "Ubisoft", url: "https://ubisoft.com" }, { name: "Riot Games", url: "https://riotgames.com" },
  { name: "Blizzard", url: "https://blizzard.com" }, { name: "Hulu", url: "https://hulu.com" }, 
  { name: "Disney+", url: "https://disneyplus.com" }, { name: "Amazon Prime", url: "https://primevideo.com" }, 
  { name: "HBO Max", url: "https://hbomax.com" }, { name: "Peacock", url: "https://peacocktv.com" }, 
  { name: "Paramount+", url: "https://paramountplus.com" }, { name: "Apple TV+", url: "https://tv.apple.com" }, 
  { name: "Crunchyroll", url: "https://crunchyroll.com" }, { name: "Wikipedia", url: "https://wikipedia.org" }, 
  { name: "IMDb", url: "https://imdb.com" }, { name: "Fandom", url: "https://fandom.com" }, 
  { name: "IGN", url: "https://ign.com" }, { name: "GameSpot", url: "https://gamespot.com" }, 
  { name: "PC Gamer", url: "https://pcgamer.com" }, { name: "The Verge", url: "https://theverge.com" }, 
  { name: "TechCrunch", url: "https://techcrunch.com" }, { name: "Wired", url: "https://wired.com" }, 
  { name: "CNET", url: "https://cnet.com" }, { name: "Forbes", url: "https://forbes.com" }, 
  { name: "Bloomberg", url: "https://bloomberg.com" }, { name: "Wall Street Journal", url: "https://wsj.com" }, 
  { name: "New York Times", url: "https://nytimes.com" }, { name: "CNN", url: "https://cnn.com" }, 
  { name: "BBC", url: "https://bbc.com" }, { name: "Fox News", url: "https://foxnews.com" }, 
  { name: "Al Jazeera", url: "https://aljazeera.net" }, { name: "Skype", url: "https://skype.com" }, 
  { name: "Tinder", url: "https://tinder.com" }
];

const translations = {
  en: {
    appName: "Pass-Guard",
    toolsBtn: "Tools",
    aboutBtn: "About",
    toggleTheme: "Theme",
    welcomeTitle: "Welcome to",
    welcomeDesc: "A local, highly encrypted zero-knowledge vault utilizing military-grade AES-GCM 256-bit cryptography to secure your credentials entirely on your device.",
    openVaultBtn: "Open Vault",
    createVaultBtn: "Create Vault",
    adminPortalBtn: "Admin Portal",
    statVisits: "Visits",
    statLocal: "Zero-Knowledge",
    statEncryption: "AES-GCM",
    statProtection: "24/7 Security",
    loginHeading: "Sign In",
    registerHeading: "Create New Vault",
    adminHeading: "Admin Portal",
    loginSub: "Enter credentials to decrypt your local vault",
    registerSub: "Create a local encrypted vault secured by master password",
    adminSub: "Audit and security alert dashboard",
    identifierLabel: "Username, Email, or Phone",
    adminIdentifierLabel: "Administrator Identifier",
    passwordLabel: "Master Password",
    adminPasswordLabel: "Administrator Secret Key",
    submitLogin: "Decrypt Vault",
    submitRegister: "Initialize Vault",
    submitAdmin: "Access Dashboard",
    backToHome: "Return to Home",
    adminPanelTitle: "Admin Control Panel",
    adminBadge: "Root",
    adminPanelSub: "Encrypted auditing metrics and storage health",
    registeredUsersCount: "Total Vaults",
    visitsCounter: "Visits Counter",
    resetVisitsConfirm: "Reset visits counter to 0?",
    securityScore: "Security Rating",
    activeAlerts: "Active Alerts",
    userRecordsTitle: "Registered Vaults",
    noUsers: "No registered vaults found locally.",
    accountSuspended: "Locked",
    securityAlertBadge: "Alert",
    localCryptoNote: "Zero-Knowledge Local",
    unblockBtn: "Lift Lock",
    manageUserBtn: "Manage",
    deleteAccountBtn: "Delete",
    deleteAccountConfirm: "Permanently delete this vault?",
    vaultTitlePrefix: "Encrypted Vault:",
    vaultDossierBtn: "Audit Dossier",
    vaultItemsBtn: "Accounts",
    manageVaultBtn: "Settings",
    exportBtn: "Export",
    importBtn: "Import",
    addAccountBtn: "Add Account",
    logoutBtn: "Sign Out",
    searchPlaceholder: "Search saved records...",
    showHidePass: "Toggle Visibility",
    copyBtn: "Copy",
    detailsBtn: "Details",
    deleteRecordBtn: "Delete",
    auditModalTitle: "Security Audit & Telemetry",
    auditModalSub: "Credential strength evaluation and connected devices",
    auditTabMetrics: "Metrics",
    auditTabDevices: "Sessions",
    totalCredentials: "Total Records",
    vaultHealthScore: "Health Score",
    reusedPasswords: "Reused",
    weakPasswords: "Weak",
    securityRecommendations: "Hardening Recommendations:",
    rec1: "• Avoid reusing the same password across multiple platforms.",
    rec2: "• Ensure passwords are at least 16 characters with symbols and numbers.",
    rec3: "• Your vault is protected by a key derived solely from your master password.",
    noDeviceLogs: "No device login records captured yet.",
    currentSessionBadge: "Active Session",
    aboutModalTitle: "About Architecture",
    aboutModalBody: "Pass-Guard is a zero-knowledge local password vault built entirely on Web Crypto standards (AES-GCM 256-bit and PBKDF2). All cryptographic procedures execute strictly in-memory on your machine. Your plaintext data never leaves your device.",
    toolsModalTitle: "Password Strength Auditor",
    toolsPlaceholder: "Type any password to evaluate...",
    recordDetailsTitle: "Edit Record Details",
    siteUrlLabel: "Platform URL",
    usernameLabel: "Username",
    passwordRecordLabel: "Password",
    emailLabel: "Linked Email",
    phoneLabel: "Phone Number",
    groupLabel: "Group",
    lastModifiedLabel: "Last Modified:",
    notesLabel: "Notes",
    saveNotesBtn: "Save Changes",
    closeBtn: "Close",
    selectBtn: "Select",
    cutBtn: "Cut",
    copyBtnAction: "Copy",
    pasteBtn: "Paste",
    selectAllBtn: "All",
    manageGroupsBtn: "Groups",
    manageGroupsTitle: "Manage Groups",
    allGroups: "All",
    groupPlaceholder: "Group name...",
    captchaTitle: "Automated Access Verification",
    captchaSub: "5 failed attempts detected. Solve the arithmetic problem to resume.",
    captchaInput: "Result",
    captchaSubmit: "Verify",
    cancelBtn: "Cancel",
    confirmBtn: "Confirm",
    addModalTitle: "Add New Record",
    siteTitlePlaceholder: "Website Name (e.g. Google)",
    usernamePlaceholder: "Username / Email",
    siteUrlPlaceholder: "Platform URL",
    emailPlaceholder: "Linked Email",
    phonePlaceholder: "Phone Number",
    notesPlaceholder: "Notes...",
    passwordPlaceholder: "Password",
    generatePassTitle: "Generate",
    saveRecordBtn: "Store in Vault",
    copiedFeedback: "Copied!",
    invalidAdminAlert: "Invalid administrator credentials!",
    missingFieldsAlert: "Please fill in all mandatory fields.",
    lockedAccountAlert: "Account temporarily locked. Consult administrator.",
    accountNotFoundAlert: "Vault record not found!",
    maxTriesExceededAlert: "Maximum attempts exceeded. Vault locked.",
    incorrectPasswordAlert: "Incorrect master password!",
    captchaFailedAlert: "Incorrect answer. Please retry.",
    captchaPassedAlert: "Verification successful.",
    reservedUsernameAlert: "Identifier reserved by system policies.",
    passwordComplexityAlert: "Password must be >= 8 chars, contain an uppercase letter, number, and symbol.",
    accountExistsAlert: "A vault with this identifier already exists!",
    unblockSuccessAlert: "Account suspension lifted.",
    masterPassResetSuccessAlert: "Master password successfully reset.",
    importSuccessAlert: "Passwords imported successfully!",
    importPasswordMismatchAlert: "Master password mismatch on import!",
    importFormatErrorAlert: "Invalid backup file format!",
    importReadErrorAlert: "Error reading backup file!",
    vaultActionsTitle: "Navigation",
    passLength: "Length",
    includeSymbols: "Symbols",
    includeNumbers: "Numbers",
    toggleGenOptions: "Generator Options",
    vaultSettingsTitle: "Vault Settings",
    vaultSettingsSub: "Update master credentials and recovery details",
    adminManageUserTitle: "Manage Vault Data",
    adminManageUserSub: "Emergency recovery and adjustments",
    creationDateLabel: "Created:",
    saveSettingsBtn: "Save Updates",
    updateSuccessNotice: "Updates applied successfully!",
    confirmDeleteGroup: "Delete group '{group}'? Accounts will move to '{all}'.",
    groupDeletedNotice: "Group deleted successfully."
  },
  ar: {
    appName: "Pass-Guard",
    toolsBtn: "الأدوات",
    aboutBtn: "عن التطبيق",
    toggleTheme: "المظهر",
    welcomeTitle: "مرحباً بك في",
    welcomeDesc: "خزنة محلية مشفرة تعمل بمبدأ المعرفة الصفرية وتقنيات التشفير العسكري AES-GCM 256-bit لحفظ وحماية بياناتك وحساباتك دون أن تغادر جهازك إطلاقاً.",
    openVaultBtn: "فتح الخزنة",
    createVaultBtn: "إنشاء خزنة",
    adminPortalBtn: "بوابة المشرف",
    statVisits: "الزيارات",
    statLocal: "تشفير تام",
    statEncryption: "AES-GCM",
    statProtection: "حماية 24/7",
    loginHeading: "تسجيل الدخول",
    registerHeading: "إنشاء خزنة جديدة",
    adminHeading: "بوابة المشرف",
    loginSub: "أدخل بياناتك لفك تشفير الخزنة والوصول لحساباتك",
    registerSub: "أنشئ خزنتك المشفرة محلياً والمحمية بكلمة مرورك",
    adminSub: "الوصول الإداري لتدقيق العمليات الأمنية",
    identifierLabel: "اسم المستخدم، البريد، أو الهاتف",
    adminIdentifierLabel: "معرّف المشرف",
    passwordLabel: "كلمة المرور الرئيسية",
    adminPasswordLabel: "المفتاح السري للمشرف",
    submitLogin: "فك تشفير الخزنة",
    submitRegister: "إنشاء الخزنة",
    submitAdmin: "دخول اللوحة",
    backToHome: "العودة للرئيسية",
    adminPanelTitle: "لوحة التحكم الإداري",
    adminBadge: "مشرف النظام",
    adminPanelSub: "نظام تدقيق العمليات ومراقبة وسائط التخزين",
    registeredUsersCount: "إجمالي الخزنات",
    visitsCounter: "عداد الزيارات",
    resetVisitsConfirm: "تصفير عداد الزيارات إلى 0؟",
    securityScore: "مؤشر الأمان",
    activeAlerts: "الإنذارات النشطة",
    userRecordsTitle: "الخزنات المسجلة",
    noUsers: "لا توجد أي خزنات مسجلة محلياً.",
    accountSuspended: "موقوف أمنياً",
    securityAlertBadge: "إنذار",
    localCryptoNote: "تشفير محلي تام",
    unblockBtn: "فك الحظر",
    manageUserBtn: "إدارة",
    deleteAccountBtn: "حذف",
    deleteAccountConfirm: "حذف هذه الخزنة نهائياً؟",
    vaultTitlePrefix: "الخزنة المشفرة:",
    vaultDossierBtn: "أمان الخزنة",
    vaultItemsBtn: "الحسابات",
    manageVaultBtn: "الإعدادات",
    exportBtn: "تصدير",
    importBtn: "استيراد",
    addAccountBtn: "إضافة حساب",
    logoutBtn: "خروج",
    searchPlaceholder: "بحث في الحسابات...",
    showHidePass: "إظهار/إخفاء",
    copyBtn: "نسخ",
    detailsBtn: "تفاصيل",
    deleteRecordBtn: "حذف",
    auditModalTitle: "الملف الأمني الشامل",
    auditModalSub: "تدقيق متانة كلمات المرور وسجل الأجهزة المأذون لها",
    auditTabMetrics: "المؤشرات",
    auditTabDevices: "الأجهزة والجلسات",
    totalCredentials: "إجمالي الحسابات",
    vaultHealthScore: "تقييم المناعة",
    reusedPasswords: "مكررة",
    weakPasswords: "ضعيفة",
    securityRecommendations: "التوصيات الأمنية لحصانة الخزنة:",
    rec1: "• تجنب تماماً استخدام نفس كلمة المرور لأكثر من منصة.",
    rec2: "• احرص ألا يقل طول كلمة المرور عن 16 خانة مع رموز وأرقام.",
    rec3: "• خزنتك محمية بمفتاح تشفير مشتق من كلمة مرورك الرئيسية فقط.",
    noDeviceLogs: "لا يوجد سجل أجهزة ملتقط حتى الآن.",
    currentSessionBadge: "الجلسة الحالية",
    aboutModalTitle: "عن المنظومة الأمنية",
    aboutModalBody: "برنامج Pass-Guard هو خزنة محلية لإدارة كلمات المرور تعمل بمبدأ المعرفة الصفرية المستند إلى المعايير القياسية للويب (AES-GCM 256-bit و PBKDF2). تتم كافة عمليات التشفير وفك التشفير حصراً داخل ذاكرة جهازك دون إرسال أي حرف إلى أي خادم خارجي.",
    toolsModalTitle: "فاحص متانة كلمات المرور",
    toolsPlaceholder: "اكتب كلمة مرور لفحص صمودها...",
    recordDetailsTitle: "تعديل بيانات الحساب",
    siteUrlLabel: "عنوان المنصة الإلكترونية",
    usernameLabel: "اسم المستخدم",
    passwordRecordLabel: "كلمة المرور",
    emailLabel: "البريد الإلكتروني",
    phoneLabel: "رقم الهاتف",
    groupLabel: "المجموعة",
    lastModifiedLabel: "تاريخ آخر تعديل:",
    notesLabel: "الملاحظات",
    saveNotesBtn: "حفظ التعديلات",
    closeBtn: "إغلاق",
    selectBtn: "تحديد",
    cutBtn: "قص",
    copyBtnAction: "نسخ",
    pasteBtn: "لصق",
    selectAllBtn: "الكل",
    manageGroupsBtn: "المجموعات",
    manageGroupsTitle: "إدارة مجموعات الحسابات",
    allGroups: "الكل",
    groupPlaceholder: "اسم المجموعة...",
    captchaTitle: "التحقق من الدخول الآلي",
    captchaSub: "تم رصد 5 محاولات خاطئة. حل المسألة للمتابعة.",
    captchaInput: "الناتج",
    captchaSubmit: "تحقق",
    cancelBtn: "إلغاء",
    confirmBtn: "تأكيد",
    addModalTitle: "إضافة حساب جديد",
    siteTitlePlaceholder: "اسم الموقع (مثل: Google)",
    usernamePlaceholder: "اسم المستخدم أو البريد",
    siteUrlPlaceholder: "رابط المنصة (URL)",
    emailPlaceholder: "البريد الإلكتروني المقترن",
    phonePlaceholder: "رقم الهاتف",
    notesPlaceholder: "ملاحظات...",
    passwordPlaceholder: "كلمة المرور",
    generatePassTitle: "توليد",
    saveRecordBtn: "حفظ في الخزنة",
    copiedFeedback: "تم النسخ!",
    invalidAdminAlert: "بيانات اعتماد المشرف غير صحيحة!",
    missingFieldsAlert: "يرجى استكمال جميع الحقول الإلزامية.",
    lockedAccountAlert: "الحساب موقوف أمنياً. يرجى مراجعة المشرف العام.",
    accountNotFoundAlert: "سجل الخزنة هذا غير موجود!",
    maxTriesExceededAlert: "تم استنفاد المحاولات وقفل الخزنة أمنياً.",
    incorrectPasswordAlert: "كلمة المرور الرئيسية غير صحيحة!",
    captchaFailedAlert: "الناتج غير صحيح. أعد المحاولة.",
    captchaPassedAlert: "تم التحقق بنجاح.",
    reservedUsernameAlert: "اسم المستخدم محجوز لسياسات النظام.",
    passwordComplexityAlert: "كلمة المرور يجب أن لا تقل عن 8 خانات وتحتوي على حرف كبير، رقم، ورمز.",
    accountExistsAlert: "توجد خزنة مسجلة مسبقاً بهذا المعرّف!",
    unblockSuccessAlert: "تم فك الحظر الأمني بنجاح.",
    masterPassResetSuccessAlert: "تمت إعادة تعيين كلمة المرور بنجاح.",
    importSuccessAlert: "تم استيراد كلمات المرور بنجاح!",
    importPasswordMismatchAlert: "كلمة المرور الحالية لا تطابق ملف النسخ الاحتياطي!",
    importFormatErrorAlert: "صيغة ملف النسخة الاحتياطية غير صالحة!",
    importReadErrorAlert: "حدث خطأ أثناء قراءة الملف!",
    vaultActionsTitle: "التنقل",
    passLength: "الطول",
    includeSymbols: "رموز",
    includeNumbers: "أرقام",
    toggleGenOptions: "خيارات المولد",
    vaultSettingsTitle: "إعدادات الخزنة",
    vaultSettingsSub: "تحديث بيانات الاعتماد ومعلومات الطوارئ",
    adminManageUserTitle: "إدارة بيانات المستخدم",
    adminManageUserSub: "تعديل معلومات الطوارئ والدخول",
    creationDateLabel: "تاريخ الإنشاء:",
    saveSettingsBtn: "حفظ التغييرات",
    updateSuccessNotice: "تم تحديث البيانات بنجاح!",
    confirmDeleteGroup: "حذف المجموعة '{group}'؟ سيتم نقل حساباتها إلى '{all}'.",
    groupDeletedNotice: "تم حذف المجموعة بنجاح."
  }
};

export default function App() {
  const [lang, setLang] = useState('ar');
  const [theme, setTheme] = useState('dark');
  const t = translations[lang];

  const [currentView, setCurrentView] = useState('welcome');
  const [authMode, setAuthMode] = useState('login');

  const [identifier, setIdentifier] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [postCaptchaAttempts, setPostCaptchaAttempts] = useState(0);
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const [userCaptchaInput, setUserCaptchaInput] = useState('');
  const [mathCaptcha, setMathCaptcha] = useState({ num1: 5, num2: 3, answer: 8 });

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

  const [vaultItems, setVaultItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [visitCount, setVisitCount] = useState(0);

  const [vaultSubView, setVaultSubView] = useState('items'); 
  const [adminSubView, setAdminSubView] = useState('dashboard');
  const [auditTab, setAuditTab] = useState('metrics');

  const [vaultDeviceLogs, setVaultDeviceLogs] = useState([]);
  const [editableRecord, setEditableRecord] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const [groups, setGroups] = useState(['شخصي', 'عمل']);
  const [selectedGroup, setSelectedGroup] = useState('ALL_GROUPS');
  const [showManageGroupsModal, setShowManageGroupsModal] = useState(false);
  const [newGroupNameInput, setNewGroupNameInput] = useState('');
  const [editingGroupOldName, setEditingGroupOldName] = useState(null);
  const [editingGroupNewName, setEditingGroupNewName] = useState('');

  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [clipboardBuffer, setClipboardBuffer] = useState([]);

  const [newTitle, setNewTitle] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newGroupSelection, setNewGroupSelection] = useState('');

  const [showGenOptions, setShowGenOptions] = useState(false);
  const [genLength, setGenLength] = useState(16);
  const [useSymbols, setUseSymbols] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);

  const [siteSuggestions, setSiteSuggestions] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [copyStatusMsg, setCopyStatusMsg] = useState('');
  const [testPassword, setTestPassword] = useState('');

  const [manageData, setManageData] = useState({ oldId: '', identifier: '', masterPassword: '', oldPass: '', email: '', phone: '', createdAt: '' });
  const [inAppNotice, setInAppNotice] = useState('');

  const triggerNotice = (msg) => {
    setInAppNotice(msg);
    setTimeout(() => setInAppNotice(''), 4000);
  };

  const askConfirm = (message, onConfirm) => {
    setConfirmDialog({ isOpen: true, message, onConfirm });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d)) return isoString;
      return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { 
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  const handlePhoneChange = (e, setter) => {
    setter(e.target.value.replace(/[^0-9+]/g, ''));
  };

  const parseDeviceInfo = () => {
    const ua = navigator.userAgent;
    let os = lang === 'ar' ? "نظام غير معروف" : "Unknown OS";
    if (ua.indexOf("Win") !== -1) os = "Windows PC";
    else if (ua.indexOf("Mac") !== -1) os = "Apple macOS";
    else if (ua.indexOf("Linux") !== -1) os = "Linux";
    else if (ua.indexOf("Android") !== -1) os = "Android";
    else if (ua.indexOf("like Mac") !== -1) os = "Apple iOS";

    let browser = lang === 'ar' ? "متصفح غير معروف" : "Unknown Browser";
    if (ua.indexOf("Chrome") !== -1 && ua.indexOf("Edg") === -1) browser = "Google Chrome";
    else if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) browser = "Apple Safari";
    else if (ua.indexOf("Firefox") !== -1) browser = "Mozilla Firefox";
    else if (ua.indexOf("Edg") !== -1) browser = "Microsoft Edge";

    const screenRes = `${window.screen.width}x${window.screen.height}`;
    const deviceId = `DEV-${Math.abs(screenRes.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)).toString(16).toUpperCase()}`;

    return { os, browser, screenRes, deviceId };
  };

  const registerDeviceLogin = async (cleanId) => {
    const device = parseDeviceInfo();
    const nowISO = new Date().toISOString(); 
    let netInfo = { ip: "127.0.0.1", isp: "Secure Local Network", location: "Local Host" };
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        netInfo = {
          ip: data.ip || "127.0.0.1",
          isp: data.org || data.asn || "Verified Network",
          location: `${data.city || ''}، ${data.country_name || ''}`
        };
      }
    } catch (e) {}

    const logKey = `passguard_devices_${cleanId}`;
    let logs = [];
    try {
      const saved = localStorage.getItem(logKey);
      if (saved) logs = JSON.parse(saved);
    } catch (e) {}

    const existingIndex = logs.findIndex(l => l.deviceId === device.deviceId && l.ip === netInfo.ip);
    const newEntry = { ...device, ...netInfo, lastLogin: nowISO, isCurrent: true };

    if (existingIndex !== -1) {
      logs[existingIndex] = newEntry;
    } else {
      logs.unshift(newEntry);
    }

    const updated = logs.slice(0, 10);
    localStorage.setItem(logKey, JSON.stringify(updated));
    setVaultDeviceLogs(updated);
  };

  useEffect(() => {
    let currentTotal = parseInt(localStorage.getItem('passguard_total_visits') || '0', 10);
    const hasVisitedThisSession = sessionStorage.getItem('passguard_session_visited');

    if (!hasVisitedThisSession) {
      currentTotal += 1;
      localStorage.setItem('passguard_total_visits', currentTotal.toString());
      sessionStorage.setItem('passguard_session_visited', 'true');
    }
    setVisitCount(currentTotal);
  }, []);

  // قفل الخزنة عند الخروج
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isUnlocked && !isAdmin) {
        setIsUnlocked(false);
        setMasterPassword('');
        setCurrentView('welcome');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isUnlocked, isAdmin]);

  // مؤقت خمول زمني
  useEffect(() => {
    if (!isUnlocked || isAdmin) return;
    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsUnlocked(false);
        setMasterPassword('');
        setCurrentView('welcome');
      }, 5 * 60 * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isUnlocked, isAdmin]);

  const handleResetVisits = () => {
    askConfirm(t.resetVisitsConfirm, () => {
      localStorage.setItem('passguard_total_visits', '0');
      setVisitCount(0);
      triggerNotice(t.visitsResetSuccess);
    });
  };

  const loadAdminUsersData = () => {
    const users = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('passguard_vault_')) {
        const username = key.replace('passguard_vault_', '');
        const metaKey = `passguard_meta_${username}`;
        let isLocked = false;
        let alertMsg = false;
        let meta = {};
        try {
          meta = JSON.parse(localStorage.getItem(metaKey)) || {};
          if (meta) {
            isLocked = meta.isLocked || false;
            alertMsg = meta.alert || false;
          }
        } catch (e) {}

        users.push({ 
          username, 
          storageKey: key, 
          metaKey, 
          isLocked, 
          alert: alertMsg,
          masterPassword: meta.masterPassword || '',
          email: meta.email || '',
          phone: meta.phone || '',
          createdAt: meta.createdAt || 'N/A'
        });
      }
    }
    setRegisteredUsers(users);
  };

  useEffect(() => {
    loadAdminUsersData();
  }, [isUnlocked, currentView]);

  const handleTitleChange = (val) => {
    setNewTitle(val);
    if (val.trim().length > 0) {
      const matches = POPULAR_SITES.filter(s => s.name.toLowerCase().includes(val.toLowerCase()));
      setSiteSuggestions(matches);
    } else {
      setSiteSuggestions([]);
    }
  };

  const selectSuggestion = (site) => {
    setNewTitle(site.name);
    setNewUrl(site.url);
    setSiteSuggestions([]);
  };

  const triggerLiveGeneration = (length, symbols, numbers) => {
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    if (numbers) chars += "0123456789";
    if (symbols) chars += "@#$%&*!-_";
    let pass = "";
    for (let i = 0; i < length; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (symbols && !/[^A-Za-z0-9]/.test(pass)) pass += '@';
    if (numbers && !/[0-9]/.test(pass)) pass += '1';
    if (!/[A-Z]/.test(pass)) pass += 'A';
    
    setNewPassword(pass);
    if(editableRecord) setEditableRecord({...editableRecord, password: pass});
  };

  useEffect(() => {
    if (showGenOptions) {
      triggerLiveGeneration(genLength, useSymbols, useNumbers);
    }
  }, [genLength, useSymbols, useNumbers, showGenOptions]);

  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let mouse = { x: width / 2, y: height / 2 };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const particles = [];
    const particleCount = Math.floor((width * height) / 14000);

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        radius: Math.random() * 2.5 + 1,
      });
    }

    const draw = () => {
      ctx.fillStyle = theme === 'dark' ? '#030712' : '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = theme === 'dark' ? 'rgba(99, 102, 241, 0.7)' : 'rgba(79, 70, 229, 0.6)';
        ctx.fill();

        let dx = mouse.x - p.x;
        let dy = mouse.y - p.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = theme === 'dark' ? `rgba(99, 102, 241, ${1 - dist / 120})` : `rgba(79, 70, 229, ${1 - dist / 120})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (authMode === 'admin') {
      if (identifier.trim() === 'admin' && masterPassword === 'Samawy@2007') {
        setIsAdmin(true);
        setIsUnlocked(true);
        setAdminSubView('dashboard');
        loadAdminUsersData();
        setError('');
        return;
      } else {
        setError(t.invalidAdminAlert);
        return;
      }
    }

    if (!identifier.trim() || !masterPassword.trim()) {
      setError(t.missingFieldsAlert);
      return;
    }

    const cleanId = identifier.trim().toLowerCase();
    const metaKey = `passguard_meta_${cleanId}`;
    let metaData = { isLocked: false, alert: false };
    try {
      const savedMeta = localStorage.getItem(metaKey);
      if (savedMeta) metaData = JSON.parse(savedMeta);
    } catch (e) {}

    if (metaData.isLocked) {
      setError(t.lockedAccountAlert);
      return;
    }

    const storageKey = `passguard_vault_${cleanId}`;
    const savedVault = localStorage.getItem(storageKey);

    if (!savedVault) {
      setError(t.accountNotFoundAlert);
      return;
    }

    const encryptedObj = JSON.parse(savedVault);
    const decrypted = await decryptData(encryptedObj, masterPassword);
    
    if (decrypted) {
      setVaultItems(decrypted);
      let customGroups = ['شخصي', 'عمل'];
      decrypted.forEach(item => {
          if(item.group && !customGroups.includes(item.group)) customGroups.push(item.group);
      });
      setGroups(customGroups);

      setIsAdmin(false);
      setIsUnlocked(true);
      setVaultSubView('items');
      setError('');
      setFailedAttempts(0);
      setPostCaptchaAttempts(0);
      
      const currentMeta = JSON.parse(localStorage.getItem(metaKey)) || {};
      const updatedMeta = {
        ...currentMeta,
        isLocked: false, 
        alert: false,
        identifier: currentMeta.identifier || cleanId,
        masterPassword: currentMeta.masterPassword || masterPassword,
        email: currentMeta.email || '',
        phone: currentMeta.phone || '',
        createdAt: currentMeta.createdAt || new Date().toISOString()
      };
      localStorage.setItem(metaKey, JSON.stringify(updatedMeta));
      registerDeviceLogin(cleanId);
    } else {
      if (failedAttempts >= 5) {
        const newPostAttempts = postCaptchaAttempts + 1;
        setPostCaptchaAttempts(newPostAttempts);
        const remaining = 3 - newPostAttempts;

        if (newPostAttempts >= 3) {
          metaData.isLocked = true;
          metaData.alert = true;
          localStorage.setItem(metaKey, JSON.stringify(metaData));
          setError(t.maxTriesExceededAlert);
          return;
        } else {
          setError(`${t.incorrectPasswordAlert} (${remaining})`);
        }
      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= 5) {
          const n1 = Math.floor(Math.random() * 10) + 1;
          const n2 = Math.floor(Math.random() * 10) + 1;
          setMathCaptcha({ num1: n1, num2: n2, answer: n1 + n2 });
          setUserCaptchaInput('');
          setShowCaptchaModal(true);
          setError('');
        } else {
          setError(`${t.incorrectPasswordAlert} (${newAttempts}/5)`);
        }
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !masterPassword.trim()) {
      setError(t.missingFieldsAlert);
      return;
    }

    if (identifier.trim().toLowerCase() === 'admin') {
      setError(t.reservedUsernameAlert);
      return;
    }

    if (!isValidPassword(masterPassword)) {
      setError(t.passwordComplexityAlert);
      return;
    }

    const cleanId = identifier.trim().toLowerCase();
    const storageKey = `passguard_vault_${cleanId}`;
    const metaKey = `passguard_meta_${cleanId}`;
    const savedVault = localStorage.getItem(storageKey);

    if (savedVault) {
      setError(t.accountExistsAlert);
      return;
    }

    const initialItems = [];
    const encrypted = await encryptData(initialItems, masterPassword);
    localStorage.setItem(storageKey, JSON.stringify(encrypted));
    
    const newMeta = {
        isLocked: false,
        alert: false,
        identifier: cleanId,
        masterPassword: masterPassword,
        email: '',
        phone: '',
        createdAt: new Date().toISOString()
    };
    localStorage.setItem(metaKey, JSON.stringify(newMeta));
    
    setGroups(['شخصي', 'عمل']);
    setVaultItems(initialItems);
    setIsAdmin(false);
    setIsUnlocked(true);
    setVaultSubView('items');
    setError('');
    loadAdminUsersData();
    registerDeviceLogin(cleanId);
  };

  const openDirectAction = (mode) => {
    setAuthMode(mode);
    if (mode === 'admin') {
      setIdentifier('admin');
    } else {
      setIdentifier('');
    }
    setMasterPassword('');
    setError('');
    setCurrentView('auth');
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setCopyStatusMsg(t.copiedFeedback);
      setTimeout(() => {
        setCopiedId(null);
        setCopyStatusMsg('');
      }, 3000);
    } catch (err) {}
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleImportVault = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (importedData.ciphertext && importedData.salt && importedData.iv) {
          const decrypted = await decryptData(importedData, masterPassword);
          if (decrypted) {
            const storageKey = `passguard_vault_${identifier.trim().toLowerCase()}`;
            localStorage.setItem(storageKey, JSON.stringify(importedData));
            
            let customGroups = ['شخصي', 'عمل'];
            decrypted.forEach(item => {
                if(item.group && !customGroups.includes(item.group)) customGroups.push(item.group);
            });
            setGroups(customGroups);
            
            setVaultItems(decrypted);
            triggerNotice(t.importSuccessAlert);
          } else {
            triggerNotice(t.importPasswordMismatchAlert);
          }
        } else {
          triggerNotice(t.importFormatErrorAlert);
        }
      } catch (err) {
        triggerNotice(t.importReadErrorAlert);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveRecordChanges = async (e) => {
    e.preventDefault();
    if (!isValidPassword(editableRecord.password)) {
      triggerNotice(t.passwordComplexityAlert);
      return;
    }

    const updatedRecord = { ...editableRecord, lastUpdated: new Date().toISOString() };
    const updatedItems = vaultItems.map(item => item.id === editableRecord.id ? updatedRecord : item);
    
    setVaultItems(updatedItems);
    setEditableRecord(updatedRecord);

    const storageKey = `passguard_vault_${identifier.trim().toLowerCase()}`;
    const encrypted = await encryptData(updatedItems, masterPassword);
    localStorage.setItem(storageKey, JSON.stringify(encrypted));
    
    triggerNotice(t.updateSuccessNotice);
  };

  const submitNewGroup = (e) => {
    e.preventDefault();
    if (newGroupNameInput && newGroupNameInput.trim()) {
      const trimmed = newGroupNameInput.trim();
      if (!groups.includes(trimmed)) {
        setGroups([...groups, trimmed]);
        triggerNotice(lang === 'ar' ? `تم إنشاء المجموعة "${trimmed}".` : `Group "${trimmed}" created.`);
      }
      setNewGroupNameInput('');
    }
  };

  const saveRenamedGroup = async (oldName) => {
    const trimmed = editingGroupNewName.trim();
    if(!trimmed || trimmed === oldName || groups.includes(trimmed)) { 
        setEditingGroupOldName(null); 
        return; 
    }
    const newGroups = groups.map(g => g === oldName ? trimmed : g);
    setGroups(newGroups);
    const updatedItems = vaultItems.map(item => item.group === oldName ? {...item, group: trimmed} : item);
    setVaultItems(updatedItems);
    if (selectedGroup === oldName) setSelectedGroup(trimmed);
    
    const storageKey = `passguard_vault_${identifier.trim().toLowerCase()}`;
    const encrypted = await encryptData(updatedItems, masterPassword);
    localStorage.setItem(storageKey, JSON.stringify(encrypted));
    setEditingGroupOldName(null);
    triggerNotice(t.updateSuccessNotice);
  };

  const deleteGroup = (groupName) => {
    askConfirm(t.confirmDeleteGroup.replace('{group}', groupName).replace('{all}', t.allGroups), async () => {
        const newGroups = groups.filter(g => g !== groupName);
        setGroups(newGroups);
        const updatedItems = vaultItems.map(item => item.group === groupName ? {...item, group: ''} : item);
        setVaultItems(updatedItems);
        if(selectedGroup === groupName) setSelectedGroup('ALL_GROUPS');

        const storageKey = `passguard_vault_${identifier.trim().toLowerCase()}`;
        const encrypted = await encryptData(updatedItems, masterPassword);
        localStorage.setItem(storageKey, JSON.stringify(encrypted));
        triggerNotice(t.groupDeletedNotice);
    });
  };

  const toggleSelectAccount = (id) => {
    setSelectedAccountIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const filtered = selectedGroup === 'ALL_GROUPS' ? vaultItems : vaultItems.filter(i => i.group === selectedGroup || (!i.group && selectedGroup === 'ALL_GROUPS'));
    if (selectedAccountIds.length === filtered.length && filtered.length > 0) {
      setSelectedAccountIds([]);
    } else {
      setSelectedAccountIds(filtered.map(i => i.id));
    }
  };

  const handleBulkCopy = () => {
    if (selectedAccountIds.length === 0) return;
    const itemsToCopy = vaultItems.filter(i => selectedAccountIds.includes(i.id));
    setClipboardBuffer(itemsToCopy);
    triggerNotice(lang === 'ar' ? `تم نسخ ${itemsToCopy.length} حساب.` : `Copied ${itemsToCopy.length} accounts.`);
  };

  const handleBulkCut = () => {
    if (selectedAccountIds.length === 0) return;
    const itemsToCut = vaultItems.filter(i => selectedAccountIds.includes(i.id));
    setClipboardBuffer(itemsToCut);
    const remaining = vaultItems.filter(i => !selectedAccountIds.includes(i.id));
    setVaultItems(remaining);
    setSelectedAccountIds([]);

    const storageKey = `passguard_vault_${identifier.trim().toLowerCase()}`;
    encryptData(remaining, masterPassword).then(enc => localStorage.setItem(storageKey, JSON.stringify(enc)));
    triggerNotice(lang === 'ar' ? `تم قص ${itemsToCut.length} حساب.` : `Cut ${itemsToCut.length} accounts.`);
  };

  const handleBulkPaste = async () => {
    if (clipboardBuffer.length === 0) return;
    const pastedItems = clipboardBuffer.map(i => ({ 
      ...i, 
      id: Date.now() + Math.random(), 
      title: i.title, 
      group: selectedGroup === 'ALL_GROUPS' ? '' : selectedGroup 
    }));
    const updated = [...vaultItems, ...pastedItems];
    setVaultItems(updated);

    const storageKey = `passguard_vault_${identifier.trim().toLowerCase()}`;
    const encrypted = await encryptData(updated, masterPassword);
    localStorage.setItem(storageKey, JSON.stringify(encrypted));
    triggerNotice(lang === 'ar' ? `تم لصق ${pastedItems.length} حساب.` : `Pasted ${pastedItems.length} accounts.`);
  };

  const calculateVaultMetrics = () => {
    const total = vaultItems.length;
    if (total === 0) return { score: 100, weakCount: 0, reusedCount: 0, strongCount: 0 };
    let weakCount = 0;
    let strongCount = 0;
    const passFreq = {};

    vaultItems.forEach(item => {
      const p = item.password || '';
      passFreq[p] = (passFreq[p] || 0) + 1;
      if (p.length < 8 || !/[0-9]/.test(p) || !/[@#$%&*!-_]/.test(p)) {
        weakCount++;
      } else {
        strongCount++;
      }
    });

    let reusedCount = 0;
    Object.values(passFreq).forEach(count => {
      if (count > 1) reusedCount += count;
    });

    let score = Math.round(100 - (weakCount * 15 + reusedCount * 20) / (total || 1));
    if (score < 20) score = 20;

    return { score, weakCount, reusedCount, strongCount, total };
  };

  const openVaultSettings = () => {
    const cleanId = identifier.trim().toLowerCase();
    const metaKey = `passguard_meta_${cleanId}`;
    const meta = JSON.parse(localStorage.getItem(metaKey)) || {};
    setManageData({
      oldId: cleanId,
      identifier: meta.identifier || cleanId,
      masterPassword: meta.masterPassword || masterPassword,
      oldPass: masterPassword,
      email: meta.email || '',
      phone: meta.phone || '',
      createdAt: meta.createdAt || new Date().toISOString()
    });
    setVaultSubView('settings');
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!manageData.identifier || !manageData.masterPassword) {
      triggerNotice(t.missingFieldsAlert);
      return;
    }
    if (!isValidPassword(manageData.masterPassword)) {
      triggerNotice(t.passwordComplexityAlert);
      return;
    }

    const newIdClean = manageData.identifier.trim().toLowerCase();
    const newStorageKey = `passguard_vault_${newIdClean}`;
    const newMetaKey = `passguard_meta_${newIdClean}`;
    const oldStorageKey = `passguard_vault_${manageData.oldId}`;
    const oldMetaKey = `passguard_meta_${manageData.oldId}`;
    const oldMeta = JSON.parse(localStorage.getItem(oldMetaKey)) || {};

    let currentItems = vaultItems;
    if (manageData.masterPassword !== manageData.oldPass) {
        currentItems = [...vaultItems]; 
    }
    const newEncrypted = await encryptData(currentItems, manageData.masterPassword);

    if (oldStorageKey !== newStorageKey) {
        const existingNewVault = localStorage.getItem(newStorageKey);
        if(existingNewVault) {
            triggerNotice(t.accountExistsAlert);
            return;
        }
        localStorage.removeItem(oldStorageKey);
        localStorage.removeItem(oldMetaKey);
    }

    localStorage.setItem(newStorageKey, JSON.stringify(newEncrypted));
    localStorage.setItem(newMetaKey, JSON.stringify({
        isLocked: oldMeta.isLocked || false,
        alert: oldMeta.alert || false,
        identifier: manageData.identifier,
        masterPassword: manageData.masterPassword,
        email: manageData.email,
        phone: manageData.phone,
        createdAt: manageData.createdAt
    }));

    setIdentifier(manageData.identifier);
    setMasterPassword(manageData.masterPassword);
    setManageData({...manageData, oldId: newIdClean, oldPass: manageData.masterPassword});
    triggerNotice(t.updateSuccessNotice);
    setVaultSubView('items');
  };

  const openAdminManageUser = (user) => {
    setManageData({
      oldId: user.username,
      identifier: user.username,
      masterPassword: user.masterPassword || '',
      oldPass: user.masterPassword || '',
      email: user.email || '',
      phone: user.phone || '',
      createdAt: user.createdAt || 'N/A',
      storageKey: user.storageKey,
      metaKey: user.metaKey,
      isLocked: user.isLocked,
      alert: user.alert
    });
    setAdminSubView('manageUser');
  };

  const handleAdminSaveUser = async (e) => {
    e.preventDefault();
    if (!manageData.identifier || !manageData.masterPassword) {
      triggerNotice(t.missingFieldsAlert);
      return;
    }
    if (!isValidPassword(manageData.masterPassword)) {
      triggerNotice(t.passwordComplexityAlert);
      return;
    }

    const oldVaultStr = localStorage.getItem(manageData.storageKey);
    if (!oldVaultStr) return;
    const decrypted = await decryptData(JSON.parse(oldVaultStr), manageData.oldPass);

    if(!decrypted) {
      triggerNotice(lang === 'ar' ? 'فشل فك تشفير الخزنة، كلمة المرور غير مطابقة.' : 'Decryption failed.');
      return;
    }

    const newIdClean = manageData.identifier.trim().toLowerCase();
    const newStorageKey = `passguard_vault_${newIdClean}`;
    const newMetaKey = `passguard_meta_${newIdClean}`;
    const newEncrypted = await encryptData(decrypted, manageData.masterPassword);

    if (manageData.storageKey !== newStorageKey) {
        localStorage.removeItem(manageData.storageKey);
        localStorage.removeItem(manageData.metaKey);
    }

    localStorage.setItem(newStorageKey, JSON.stringify(newEncrypted));
    localStorage.setItem(newMetaKey, JSON.stringify({
        isLocked: manageData.isLocked,
        alert: manageData.alert,
        identifier: manageData.identifier,
        masterPassword: manageData.masterPassword,
        email: manageData.email,
        phone: manageData.phone,
        createdAt: manageData.createdAt
    }));

    triggerNotice(t.updateSuccessNotice);
    loadAdminUsersData();
    setAdminSubView('dashboard');
  };

  const metrics = calculateVaultMetrics();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col justify-between relative overflow-x-hidden transition-colors duration-500 ${isDark ? 'text-slate-100 bg-slate-950' : 'text-slate-900 bg-slate-50'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      <style>{`
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10 pointer-events-none" />

      {/* حوار التأكيد */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className={`border p-6 rounded-3xl w-full max-w-xs shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-base font-bold mb-5 text-center leading-relaxed">{confirmDialog.message}</h3>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })} 
                className={`flex-1 py-2.5 border rounded-xl text-xs font-semibold cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'}`}
              >
                {t.cancelBtn}
              </button>
              <button 
                onClick={() => {
                  if(confirmDialog.onConfirm) confirmDialog.onConfirm();
                  setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
                }} 
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {t.confirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إدارة المجموعات */}
      {showManageGroupsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className={`border p-5 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                <h3 className="font-bold text-sm flex items-center gap-2"><FolderPlus className="w-4 h-4 text-indigo-500"/> {t.manageGroupsTitle}</h3>
                <button onClick={() => setShowManageGroupsModal(false)} className="text-slate-400 hover:text-rose-400 font-bold p-1">✕</button>
            </div>
            
            <form onSubmit={submitNewGroup} className="flex gap-2 mb-2">
                <input
                    type="text"
                    placeholder={t.groupPlaceholder}
                    value={newGroupNameInput}
                    onChange={(e) => setNewGroupNameInput(e.target.value)}
                    className={`flex-1 px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`}
                    required
                />
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md">+</button>
            </form>

            <div className="space-y-2 max-h-56 overflow-y-auto">
                {groups.map(g => (
                    <div key={g} className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        {editingGroupOldName === g ? (
                            <input 
                               type="text" 
                               value={editingGroupNewName} 
                               onChange={(e) => setEditingGroupNewName(e.target.value)}
                               className={`flex-1 px-2 py-1 border rounded-lg text-xs focus:outline-none focus:border-emerald-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'}`}
                               autoFocus
                            />
                        ) : (
                            <span className="font-bold flex items-center gap-1.5 truncate"><Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0"/> {g}</span>
                        )}
                        
                        <div className="flex gap-1">
                           {editingGroupOldName === g ? (
                               <button onClick={() => saveRenamedGroup(g)} className="p-1 bg-emerald-500/10 text-emerald-500 rounded-lg">
                                  <Save className="w-3.5 h-3.5" />
                               </button>
                           ) : (
                               <>
                                 <button onClick={() => { setEditingGroupOldName(g); setEditingGroupNewName(g); }} className="p-1 bg-sky-500/10 text-sky-500 rounded-lg">
                                    <Edit3 className="w-3.5 h-3.5" />
                                 </button>
                                 <button onClick={() => deleteGroup(g)} className="p-1 bg-rose-500/10 text-rose-500 rounded-lg">
                                     <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                               </>
                           )}
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={() => setShowManageGroupsModal(false)} className="w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-bold">{t.closeBtn}</button>
          </div>
        </div>
      )}

      {/* الشريط العلوي المتجاوب */}
      <header className={`w-full px-4 md:px-8 py-3.5 border-b z-20 flex items-center justify-between shadow-xl transition-all duration-300 shrink-0 ${isDark ? 'bg-slate-950/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white/90 border-slate-200 backdrop-blur-xl'}`}>
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { if (!isUnlocked) setCurrentView('welcome'); }}>
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl overflow-hidden border border-indigo-500/40 shadow shrink-0 bg-slate-900 flex items-center justify-center p-0.5">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Pass-Guard Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-black text-lg md:text-xl tracking-wider bg-gradient-to-r from-indigo-400 via-sky-400 to-blue-500 bg-clip-text text-transparent">Pass-Guard</span>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2.5">
          <button
            onClick={() => setVaultSubView('tools')}
            className={`px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${isDark ? 'bg-slate-900 border-slate-700 text-amber-300' : 'bg-white border-slate-300 text-amber-700'}`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{t.toolsBtn}</span>
          </button>

          <button
            onClick={() => setVaultSubView('about')}
            className={`px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${isDark ? 'bg-slate-900 border-slate-700 text-indigo-300' : 'bg-white border-slate-300 text-indigo-700'}`}
          >
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">{t.aboutBtn}</span>
          </button>

          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className={`px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'}`}
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>{lang === 'en' ? 'AR' : 'EN'}</span>
          </button>

          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`p-1.5 md:p-2 rounded-xl border transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-amber-400' : 'bg-white border-slate-300 text-slate-700'}`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* الحاوية الرئيسية القابلة للتمدد على الموبايل */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 md:p-6 w-full max-w-6xl mx-auto z-20">
        
        {inAppNotice && (
          <div className="mb-3 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-bold shadow-lg text-center animate-pulse">
            {inAppNotice}
          </div>
        )}

        {/* 1. الواجهة الترحيبية */}
        {!isUnlocked && currentView === 'welcome' && (
          <div className="flex flex-col items-center justify-center px-3 py-6 max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-4">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>معيار أمان محلي 100% بالمعرفة الصفرية</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 tracking-tight">
              {t.welcomeTitle} <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-blue-500 bg-clip-text text-transparent">Pass-Guard</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed mb-6 opacity-90">
              {t.welcomeDesc}
            </p>

            <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center justify-center gap-2.5 mb-8">
              <button
                onClick={() => openDirectAction('login')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                {t.openVaultBtn}
              </button>

              <button
                onClick={() => openDirectAction('register')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 shadow"
              >
                <Plus className="w-4 h-4 text-sky-400" />
                {t.createVaultBtn}
              </button>

              <button
                onClick={() => openDirectAction('admin')}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 shadow"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                {t.adminPortalBtn}
              </button>
            </div>

            <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-t border-slate-800/80 pt-6">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
                <h3 className="text-base sm:text-lg font-black font-mono text-indigo-400">{visitCount}+</h3>
                <p className="text-[10px] text-slate-400 font-medium">{t.statVisits}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
                <h3 className="text-base sm:text-lg font-black font-mono text-emerald-400">100%</h3>
                <p className="text-[10px] text-slate-400 font-medium">{t.statLocal}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
                <h3 className="text-base sm:text-lg font-black font-mono text-sky-400">256-bit</h3>
                <p className="text-[10px] text-slate-400 font-medium">{t.statEncryption}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
                <h3 className="text-base sm:text-lg font-black font-mono text-amber-400">24/7</h3>
                <p className="text-[10px] text-slate-400 font-medium">{t.statProtection}</p>
              </div>
            </div>
          </div>
        )}

        {/* نافذة الأدوات المنبثقة */}
        {!isUnlocked && currentView === 'welcome' && vaultSubView === 'tools' && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`border p-6 rounded-3xl w-full max-w-sm space-y-4 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-400" /> {t.toolsModalTitle}</h3>
                <button onClick={() => setVaultSubView('items')} className="text-slate-400 font-bold p-1">✕</button>
              </div>
              <input
                type="text"
                placeholder={t.toolsPlaceholder}
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
              />
              <button onClick={() => setVaultSubView('items')} className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">{t.closeBtn}</button>
            </div>
          </div>
        )}

        {/* نافذة "عن التطبيق" */}
        {!isUnlocked && currentView === 'welcome' && vaultSubView === 'about' && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`border p-6 rounded-3xl w-full max-w-md space-y-4 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold flex items-center gap-1.5"><Info className="w-4 h-4 text-indigo-400" /> {t.aboutModalTitle}</h3>
                <button onClick={() => setVaultSubView('items')} className="text-slate-400 font-bold p-1">✕</button>
              </div>
              <p className="text-xs leading-relaxed text-slate-300">{t.aboutModalBody}</p>
              <button onClick={() => setVaultSubView('items')} className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">{t.closeBtn}</button>
            </div>
          </div>
        )}

        {/* 2. نموذج المصادقة */}
        {!isUnlocked && currentView === 'auth' && (
          <div className={`w-full max-w-sm border p-5 sm:p-7 rounded-3xl shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-center mb-5">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl border mb-2.5 ${authMode === 'admin' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400'}`}>
                {authMode === 'admin' ? <ShieldAlert className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
              </div>
              <h1 className="text-lg font-bold">
                {authMode === 'login' && t.loginHeading}
                {authMode === 'register' && t.registerHeading}
                {authMode === 'admin' && t.adminHeading}
              </h1>
              <p className="text-[11px] text-slate-400 mt-1">
                {authMode === 'login' && t.loginSub}
                {authMode === 'register' && t.registerSub}
                {authMode === 'admin' && t.adminSub}
              </p>
            </div>

            <form onSubmit={authMode === 'register' ? handleRegister : handleLogin} className="space-y-3" autoComplete="off">
              <div>
                <label className="text-xs block mb-1 font-medium">{authMode === 'admin' ? t.adminIdentifierLabel : t.identifierLabel}</label>
                <input
                  type="text"
                  value={identifier}
                  disabled={authMode === 'admin'}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="off"
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  required
                />
              </div>

              <div>
                <label className="text-xs block mb-1 font-medium">{authMode === 'admin' ? t.adminPasswordLabel : t.passwordLabel}</label>
                <input
                  type="password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  autoComplete="new-password"
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  required
                />
              </div>

              {error && <p className="text-rose-500 text-xs font-semibold">{error}</p>}

              <button
                type="submit"
                className={`w-full py-2.5 text-white font-bold rounded-xl text-xs shadow-lg flex items-center justify-center gap-1.5 ${authMode === 'admin' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
              >
                {authMode === 'login' && <><Unlock className="w-3.5 h-3.5" /> {t.submitLogin}</>}
                {authMode === 'register' && <><Plus className="w-3.5 h-3.5" /> {t.submitRegister}</>}
                {authMode === 'admin' && <><ShieldAlert className="w-3.5 h-3.5" /> {t.submitAdmin}</>}
              </button>

              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setCurrentView('welcome')}
                  className={`w-full py-2 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-700'}`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>{t.backToHome}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3. الخزنة المشفرة للمستخدم */}
        {isUnlocked && !isAdmin && (
          <div className={`w-full border rounded-3xl shadow-2xl flex flex-col md:flex-row min-h-[75vh] md:h-[78vh] overflow-hidden my-auto ${isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-200'}`}>
            
            {/* القائمة الجانبية: عمودية بالكمبيوتر وشريط علوي/أيقونات بالموبايل */}
            <aside className={`w-full md:w-60 border-b md:border-b-0 md:border-l p-3 md:p-4 flex flex-col justify-between shrink-0 ${isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between md:justify-start gap-2 pb-2 md:pb-3 border-b border-slate-800/60">
                  <div className="flex items-center gap-2 truncate">
                    <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xs font-mono font-bold text-indigo-400 truncate">{identifier}</p>
                  </div>
                  {/* زر الخروج بالموبايل بالشريط العلوي */}
                  <button
                    onClick={() => { setIsUnlocked(false); setMasterPassword(''); setIdentifier(''); setCurrentView('welcome'); }}
                    className="md:hidden p-1.5 rounded-lg text-rose-400 border border-rose-500/30 bg-rose-500/10"
                    title={t.logoutBtn}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* أزرار التنقل: تتوزع أفقياً بالموبايل وعمودياً بالكمبيوتر */}
                <div className="grid grid-cols-4 md:grid-cols-1 gap-1.5">
                  <button
                    onClick={() => setVaultSubView('items')}
                    className={`py-2 px-2.5 border rounded-xl flex items-center justify-center md:justify-start gap-2 text-xs font-bold ${vaultSubView === 'items' ? 'bg-indigo-600 text-white border-indigo-500' : isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
                    title={t.vaultItemsBtn}
                  >
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden md:inline">{t.vaultItemsBtn}</span>
                  </button>

                  <button
                    onClick={() => setVaultSubView('audit')}
                    className={`py-2 px-2.5 border rounded-xl flex items-center justify-center md:justify-start gap-2 text-xs font-bold ${vaultSubView === 'audit' ? 'bg-indigo-600 text-white border-indigo-500' : isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
                    title={t.vaultDossierBtn}
                  >
                    <Activity className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden md:inline">{t.vaultDossierBtn}</span>
                  </button>

                  <button
                    onClick={() => setVaultSubView('add')}
                    className={`py-2 px-2.5 border rounded-xl flex items-center justify-center md:justify-start gap-2 text-xs font-bold ${vaultSubView === 'add' ? 'bg-indigo-600 text-white border-indigo-500' : isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
                    title={t.addAccountBtn}
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden md:inline">{t.addAccountBtn}</span>
                  </button>

                  <button
                    onClick={openVaultSettings}
                    className={`py-2 px-2.5 border rounded-xl flex items-center justify-center md:justify-start gap-2 text-xs font-bold ${vaultSubView === 'settings' ? 'bg-indigo-600 text-white border-indigo-500' : isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
                    title={t.manageVaultBtn}
                  >
                    <Settings className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden md:inline">{t.manageVaultBtn}</span>
                  </button>

                  {/* أزرار التصدير والاستيراد تظهر بالكمبيوتر مباشرة */}
                  <button
                    onClick={() => {
                      const storageKey = `passguard_vault_${identifier.trim().toLowerCase()}`;
                      const vaultData = localStorage.getItem(storageKey);
                      if (!vaultData) return;
                      const blob = new Blob([vaultData], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `passguard_backup_${identifier.trim().toLowerCase()}.json`;
                      a.click();
                    }}
                    className={`hidden md:flex w-full py-2 px-2.5 border rounded-xl items-center gap-2 text-xs font-bold ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t.exportBtn}</span>
                  </button>

                  <label
                    className={`hidden md:flex w-full py-2 px-2.5 border rounded-xl cursor-pointer items-center gap-2 text-xs font-bold ${isDark ? 'bg-slate-900 border-slate-800 text-emerald-400' : 'bg-white border-slate-300 text-emerald-600'}`}
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t.importBtn}</span>
                    <input type="file" accept=".json" onChange={handleImportVault} className="hidden" />
                  </label>
                </div>
              </div>

              {/* زر الخروج بالكمبيوتر */}
              <div className="hidden md:block pt-3 border-t border-slate-800/60 mt-3">
                <button
                  onClick={() => { setIsUnlocked(false); setMasterPassword(''); setIdentifier(''); setCurrentView('welcome'); }}
                  className={`w-full py-2 px-3 border rounded-xl flex items-center justify-center gap-2 text-xs font-bold ${isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600'}`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.logoutBtn}</span>
                </button>
              </div>
            </aside>

            {/* الجزء الرئيسي المحتوى */}
            <section className="flex-1 flex flex-col overflow-hidden min-h-[500px]">
              {vaultSubView === 'items' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  
                  {/* شريط البحث */}
                  <div className={`p-3 border-b flex items-center justify-between gap-2 shrink-0 ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <input
                      type="text"
                      placeholder={t.searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full px-3.5 py-2 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                    />
                    {copyStatusMsg && <span className="text-[10px] text-emerald-400 font-bold shrink-0 bg-emerald-500/10 px-2 py-1 rounded-lg">{copyStatusMsg}</span>}
                  </div>

                  {/* شريط المجموعات وأزرار الإجراءات المتجاوبة */}
                  <div className={`px-3 py-2 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs shrink-0 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                      <button
                        onClick={() => setSelectedGroup('ALL_GROUPS')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${selectedGroup === 'ALL_GROUPS' ? 'bg-indigo-600 text-white' : isDark ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-600'}`}
                      >
                        {t.allGroups}
                      </button>
                      {groups.map((g, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedGroup(g)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 ${selectedGroup === g ? 'bg-indigo-600 text-white' : isDark ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-600'}`}
                        >
                          <Folder className="w-3 h-3 text-indigo-400" />
                          <span>{g}</span>
                        </button>
                      ))}
                      <button
                          onClick={() => setShowManageGroupsModal(true)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 ${isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}`}
                        >
                          <FolderPlus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/40">
                      <button onClick={handleSelectAll} className="px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 bg-slate-900 border-slate-700">
                        <CheckSquare className="w-3 h-3" />
                        <span>({selectedAccountIds.length})</span>
                      </button>
                      <button onClick={handleBulkCopy} className="px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 bg-slate-900 border-slate-700">
                        <Copy className="w-3 h-3" />
                      </button>
                      <button onClick={handleBulkCut} className="px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 bg-slate-900 border-slate-700">
                        <Scissors className="w-3 h-3" />
                      </button>
                      <button onClick={handleBulkPaste} className="px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 bg-slate-900 border-slate-700 text-emerald-400">
                        <Clipboard className="w-3 h-3" />
                        <span>({clipboardBuffer.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* قائمة البطاقات */}
                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
                    {vaultItems
                      .filter(item => selectedGroup === 'ALL_GROUPS' || item.group === selectedGroup || (!item.group && selectedGroup === 'ALL_GROUPS'))
                      .filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()) || item.username.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((item) => {
                        const isSelected = selectedAccountIds.includes(item.id);
                        return (
                          <div key={item.id} className={`p-3 border rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 transition-all ${isSelected ? (isDark ? 'bg-indigo-950/40 border-indigo-500/60' : 'bg-indigo-50 border-indigo-300') : (isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200')}`}>
                            <div className="flex items-center gap-2.5 truncate">
                              <button onClick={() => toggleSelectAccount(item.id)} className="text-indigo-400 shrink-0">
                                {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4 text-slate-500" />}
                              </button>
                              <div className="truncate">
                                <h3 className="text-xs font-bold flex items-center gap-1.5 truncate">
                                  <span className="truncate">{item.title}</span>
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono shrink-0">{item.group || t.allGroups}</span>
                                  {item.url && (
                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 shrink-0">
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </h3>
                                <p className="text-[10px] text-slate-400 truncate">{item.username}</p>
                              </div>
                            </div>
                            
                            {/* التحكم بالكلمة والأزرار */}
                            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/40">
                              <span className={`px-2 py-0.5 border text-[10px] rounded-lg font-mono truncate max-w-[110px] sm:max-w-[140px] ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}>
                                {visiblePasswords[item.id] ? item.password : '••••••••••••'}
                              </span>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => togglePasswordVisibility(item.id)}
                                  className="p-1.5 border rounded-lg bg-slate-900 border-slate-800 text-slate-400"
                                  title={t.showHidePass}
                                >
                                  {visiblePasswords[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(item.password, item.id)}
                                  className="p-1.5 border rounded-lg bg-slate-900 border-slate-800 text-slate-300"
                                  title={t.copyBtn}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => { setEditableRecord({...item}); setVaultSubView('details'); }}
                                  className="p-1.5 border rounded-lg bg-slate-900 border-slate-800 text-indigo-400"
                                  title={t.detailsBtn}
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    askConfirm(t.deleteRecordBtn + '?', () => {
                                      const updated = vaultItems.filter(i => i.id !== item.id);
                                      setVaultItems(updated);
                                      const storageKey = `passguard_vault_${identifier.trim().toLowerCase()}`;
                                      encryptData(updated, masterPassword).then(enc => localStorage.setItem(storageKey, JSON.stringify(enc)));
                                    });
                                  }}
                                  className="p-1.5 border rounded-lg bg-slate-900 border-slate-800 text-rose-400"
                                  title={t.deleteRecordBtn}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* إضافة حساب */}
              {vaultSubView === 'add' && (
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-lg mx-auto w-full">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <h3 className="text-sm font-bold">{t.addModalTitle}</h3>
                    <button 
                      type="button" 
                      onClick={() => {
                        const newState = !showGenOptions;
                        setShowGenOptions(newState);
                        if (newState) triggerLiveGeneration(genLength, useSymbols, useNumbers);
                      }} 
                      className="text-[10px] px-2.5 py-1 rounded-lg border flex items-center gap-1 bg-slate-800 border-slate-700 text-indigo-400"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>{t.toggleGenOptions}</span>
                    </button>
                  </div>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newTitle || !newPassword) return;
                    if (!isValidPassword(newPassword)) {
                      triggerNotice(t.passwordComplexityAlert);
                      return;
                    }
                    const newItem = {
                      id: Date.now(),
                      title: newTitle,
                      username: newUsername,
                      password: newPassword,
                      url: newUrl || `https://${newTitle.toLowerCase().replace(/\s+/g, '')}.com`,
                      email: newEmail || '',
                      phone: newPhone || '',
                      lastUpdated: new Date().toISOString(),
                      notes: newNotes || '',
                      group: newGroupSelection || ''
                    };
                    const updatedItems = [...vaultItems, newItem];
                    setVaultItems(updatedItems);
                    const storageKey = `passguard_vault_${identifier.trim().toLowerCase()}`;
                    const encrypted = await encryptData(updatedItems, masterPassword);
                    localStorage.setItem(storageKey, JSON.stringify(encrypted));
                    setNewTitle(''); setNewUsername(''); setNewPassword(''); setNewUrl(''); setNewEmail(''); setNewPhone(''); setNewNotes(''); setNewGroupSelection(''); setShowGenOptions(false);
                    setVaultSubView('items');
                    triggerNotice('تم حفظ الحساب بنجاح');
                  }} className="space-y-2.5 text-xs" autoComplete="off">
                    
                    <input
                      type="text"
                      placeholder={t.siteTitlePlaceholder}
                      value={newTitle}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`}
                      required
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder={t.usernamePlaceholder}
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`}
                      />
                      <input
                        type="text"
                        placeholder={t.siteUrlPlaceholder}
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder={t.emailPlaceholder}
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`}
                      />
                      <input
                        type="tel"
                        placeholder={t.phonePlaceholder}
                        value={newPhone}
                        onChange={(e) => handlePhoneChange(e, setNewPhone)}
                        className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`}
                      />
                    </div>

                    <select
                      value={newGroupSelection || ''}
                      onChange={(e) => setNewGroupSelection(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`}
                    >
                      <option value="">{t.allGroups}</option>
                      {groups.map((g, idx) => (
                        <option key={idx} value={g}>{g}</option>
                      ))}
                    </select>

                    <div className="relative">
                      <input
                        type="password"
                        placeholder={t.passwordPlaceholder}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        className={`w-full px-3 py-2 ps-10 border rounded-xl text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!showGenOptions) setShowGenOptions(true);
                          triggerLiveGeneration(genLength, useSymbols, useNumbers);
                        }}
                        className="absolute start-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {showGenOptions && (
                      <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span>{t.passLength}: {genLength}</span>
                          <input type="range" min="8" max="32" value={genLength} onChange={(e) => setGenLength(Number(e.target.value))} className="accent-indigo-600" />
                        </div>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1"><input type="checkbox" checked={useSymbols} onChange={(e) => setUseSymbols(e.target.checked)} className="accent-indigo-600" /> {t.includeSymbols}</label>
                          <label className="flex items-center gap-1"><input type="checkbox" checked={useNumbers} onChange={(e) => setUseNumbers(e.target.checked)} className="accent-indigo-600" /> {t.includeNumbers}</label>
                        </div>
                      </div>
                    )}

                    <textarea
                      placeholder={t.notesPlaceholder}
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      className={`w-full p-2 border rounded-xl text-xs focus:outline-none h-14 resize-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`}
                    />

                    <div className="flex justify-end gap-2 pt-1">
                      <button type="button" onClick={() => setVaultSubView('items')} className="px-4 py-2 border text-xs rounded-xl">{t.cancelBtn}</button>
                      <button type="submit" className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">{t.saveRecordBtn}</button>
                    </div>
                  </form>
                </div>
              )}

              {/* صفحة تفاصيل الحساب */}
              {vaultSubView === 'details' && editableRecord && (
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-lg mx-auto w-full">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <h3 className="text-sm font-bold flex items-center gap-1.5"><Edit3 className="w-4 h-4 text-indigo-400" /> {t.recordDetailsTitle}</h3>
                  </div>

                  <form onSubmit={handleSaveRecordChanges} className="space-y-2.5 text-xs" autoComplete="off">
                    <div>
                      <label className="block mb-1 text-slate-400">{t.siteTitlePlaceholder}</label>
                      <input
                        type="text"
                        value={editableRecord.title}
                        onChange={(e) => setEditableRecord({...editableRecord, title: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block mb-1 text-slate-400">{t.usernameLabel}</label>
                        <input
                          type="text"
                          value={editableRecord.username}
                          onChange={(e) => setEditableRecord({...editableRecord, username: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`}
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-400">{t.siteUrlPlaceholder}</label>
                        <input
                          type="text"
                          value={editableRecord.url}
                          onChange={(e) => setEditableRecord({...editableRecord, url: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1 text-slate-400">{t.passwordRecordLabel}</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type={visiblePasswords[editableRecord.id] ? "text" : "password"}
                          value={editableRecord.password}
                          onChange={(e) => setEditableRecord({...editableRecord, password: e.target.value})}
                          className={`flex-1 px-3 py-2 border rounded-xl text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`}
                          required
                        />
                        <button type="button" onClick={() => togglePasswordVisibility(editableRecord.id)} className="p-2 border rounded-lg bg-slate-900 border-slate-800">
                          {visiblePasswords[editableRecord.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button type="button" onClick={() => copyToClipboard(editableRecord.password, editableRecord.id)} className="p-2 border rounded-lg bg-slate-900 border-slate-800 text-emerald-400">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1 text-slate-400">{t.notesLabel}</label>
                      <textarea
                        value={editableRecord.notes}
                        onChange={(e) => setEditableRecord({...editableRecord, notes: e.target.value})}
                        className={`w-full p-2 border rounded-xl text-xs focus:outline-none h-16 resize-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setVaultSubView('items')} className="px-4 py-2 border text-xs rounded-xl">{t.cancelBtn}</button>
                      <button type="submit" className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">{t.saveNotesBtn}</button>
                    </div>
                  </form>
                </div>
              )}

              {/* صفحة فحص الأمان */}
              {vaultSubView === 'audit' && (
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-center">
                      <p className="text-[10px] text-slate-400">{t.totalCredentials}</p>
                      <h4 className="text-base font-bold font-mono text-indigo-400">{metrics.total}</h4>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-center">
                      <p className="text-[10px] text-slate-400">{t.vaultHealthScore}</p>
                      <h4 className="text-base font-bold font-mono text-emerald-400">{metrics.score}%</h4>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-center">
                      <p className="text-[10px] text-slate-400">{t.reusedPasswords}</p>
                      <h4 className="text-base font-bold font-mono text-rose-400">{metrics.reusedCount}</h4>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-center">
                      <p className="text-[10px] text-slate-400">{t.weakPasswords}</p>
                      <h4 className="text-base font-bold font-mono text-amber-400">{metrics.weakCount}</h4>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-xs space-y-1.5 leading-relaxed">
                    <h4 className="font-bold flex items-center gap-1.5 text-indigo-400"><Zap className="w-3.5 h-3.5" /> {t.securityRecommendations}</h4>
                    <p>{t.rec1}</p>
                    <p>{t.rec2}</p>
                    <p>{t.rec3}</p>
                  </div>
                </div>
              )}

              {/* صفحة الإعدادات */}
              {vaultSubView === 'settings' && (
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-lg mx-auto w-full">
                  <h3 className="text-sm font-bold border-b border-slate-800 pb-2 mb-3 flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-indigo-400" /> {t.vaultSettingsTitle}
                  </h3>

                  <form onSubmit={handleSaveSettings} className="space-y-3 text-xs" autoComplete="off">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block mb-1 text-slate-400">{t.usernameLabel}</label>
                        <input
                          type="text"
                          value={manageData.identifier}
                          onChange={(e) => setManageData({...manageData, identifier: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-xl text-xs ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'}`}
                          required
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-400">{t.passwordLabel}</label>
                        <input
                          type="text"
                          value={manageData.masterPassword}
                          onChange={(e) => setManageData({...manageData, masterPassword: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono ${isDark ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-slate-50 border-slate-300'}`}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button type="submit" className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">{t.saveSettingsBtn}</button>
                    </div>
                  </form>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* الشريط السفلي */}
      <footer className={`w-full px-4 md:px-8 py-3 border-t z-20 flex flex-col sm:flex-row items-center justify-between text-[11px] shrink-0 ${isDark ? 'bg-slate-950/80 border-slate-800/80 text-slate-500' : 'bg-white border-slate-200 text-slate-500'}`}>
        <span>© 2026 Pass-Guard. All Rights Reserved.</span>
        <div className="flex items-center gap-3 mt-1 sm:mt-0">
          <span className="flex items-center gap-1 font-mono text-indigo-400"><Shield className="w-3 h-3" /> AES-GCM 256-bit</span>
          <span>Zero-Knowledge</span>
        </div>
      </footer>
    </div>
  );
}