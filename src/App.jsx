import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { ShieldCheck, Lock, Copy, Check, Plus, Search, LogOut, Trash2, KeyRound, User, AlertTriangle, ShieldAlert, Users, Globe, Sun, Moon, Key, Unlock, Info, Shield, Zap, Download, Upload, Sliders, Eye, EyeOff, ExternalLink, BarChart3, Activity, ArrowRight, RotateCcw, Laptop, Smartphone, Wifi, Clock, Server, ArrowLeft, Save, CheckSquare, Square, Scissors, Clipboard, FolderPlus, Folder, Edit3, Settings } from 'lucide-react';

const importCryptoKey = async (password, salt) => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
  return window.crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
};

async function encryptData(secretData, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await importCryptoKey(password, salt);
  const enc = new TextEncoder();
  const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(secretData)));
  return { ciphertext: Array.from(new Uint8Array(encrypted)), salt: Array.from(salt), iv: Array.from(iv) };
}

async function decryptData(encryptedObj, password) {
  try {
    const salt = new Uint8Array(encryptedObj.salt);
    const iv = new Uint8Array(encryptedObj.iv);
    const data = new Uint8Array(encryptedObj.ciphertext);
    const key = await importCryptoKey(password, salt);
    const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (e) { return null; }
}

const isValidPassword = (pass) => !!(pass && pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass));


const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();

const normalizeIdentifier = (value) => value.trim().toLowerCase();

const cacheVaultLocally = (identifier, encrypted, meta = {}) => {
  try {
    const cleanId = normalizeIdentifier(identifier);
    localStorage.setItem(`passguard_vault_${cleanId}`, JSON.stringify(encrypted));
    localStorage.setItem(`passguard_meta_${cleanId}`, JSON.stringify({
      isLocked: !!meta.isLocked,
      alert: !!meta.alert,
      identifier: cleanId,
      email: meta.email || '',
      phone: meta.phone || '',
      createdAt: meta.createdAt || new Date().toISOString(),
    }));
  } catch (e) {}
};

const cloudSaveVault = async ({ vaultId, identifier, masterPassword, encryptedData, email = null, phone = null }) => {
  if (!supabaseConfigured) return { error: new Error('Supabase is not configured.') };
  return await supabase.rpc('save_vault', {
    p_vault_id: vaultId,
    p_identifier: identifier,
    p_master_password: masterPassword,
    p_encrypted_data: encryptedData,
    p_email: email,
    p_phone: phone,
  });
};

const generateSecurePassword = (length, includeSymbols, includeNumbers) => {
  const charSets = ["ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"];
  if (includeNumbers) charSets.push("0123456789");
  if (includeSymbols) charSets.push("@#$%&*!-_");
  const allChars = charSets.join("");
  const arr = [];
  charSets.forEach(set => arr.push(set[Math.floor(Math.random() * set.length)]));
  for (let i = arr.length; i < length; i++) arr.push(allChars[Math.floor(Math.random() * allChars.length)]);
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr.join("");
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
  { name: "CNET", url: "https://query.cnet.com" }, { name: "Forbes", url: "https://forbes.com" },
  { name: "Bloomberg", url: "https://bloomberg.com" }, { name: "Wall Street Journal", url: "https://wsj.com" },
  { name: "New York Times", url: "https://nytimes.com" }, { name: "CNN", url: "https://cnn.com" },
  { name: "BBC", url: "https://bbc.com" }, { name: "Fox News", url: "https://foxnews.com" },
  { name: "Al Jazeera", url: "https://aljazeera.net" }, { name: "Skype", url: "https://skype.com" },
  { name: "Tinder", url: "https://tinder.com" }
];

const translations = {
  en: {
    appName: "Pass-Guard", toolsBtn: "Password Auditor", aboutBtn: "About Website", toggleTheme: "Toggle Appearance",
    welcomeTitle: "Welcome to", welcomeDesc: "An AES-GCM 256-bit encrypted password vault with secure cloud sync and remote administrative support.",
    openVaultBtn: "Open Vault (Sign In)", createVaultBtn: "Create New Vault", adminPortalBtn: "Administration Portal",
    statVisits: "Total Visits", statLocal: "Encrypted Vault", statEncryption: "AES-GCM Encryption", statProtection: "Active Protection",
    loginHeading: "Sign In", registerHeading: "Create New Vault", adminHeading: "Administrator Portal",
    loginSub: "Enter credentials to decrypt your vault and access saved records", registerSub: "Create a local encrypted vault secured by a master password", adminSub: "Exclusive global administrative access for system auditing, support, and security alerts",
    identifierLabel: "Username, Email, or Phone", adminIdentifierLabel: "Administrator Identifier", passwordLabel: "Master Password", adminPasswordLabel: "Administrator Secret Key",
    submitLogin: "Decrypt Vault", submitRegister: "Create & Initialize Vault", submitAdmin: "Access Admin Dashboard",
    backToHome: "Return to Home & Choose Another Action", adminPanelTitle: "Advanced Administrative Control Panel", adminBadge: "Root Admin",
    adminPanelSub: "Encrypted system auditing metrics and local storage health monitoring", registeredUsersCount: "Total Registered Users",
    visitsCounter: "Visits Counter", resetVisitsConfirm: "Are you sure you want to reset the visits counter to 0?",
    securityScore: "Overall Security Rating", activeAlerts: "Active Security Alerts", userRecordsTitle: "Registered Vaults & Security Alerts",
    noUsers: "No registered vaults found locally.", accountSuspended: "Security Locked", securityAlertBadge: "Security Warning",
    localCryptoNote: "Cloud-Synced Encrypted Vault", unblockBtn: "Lift Suspension", manageUserBtn: "Manage Account",
    deleteAccountBtn: "Delete Vault", deleteAccountConfirm: "Are you sure you want to permanently delete this vault?",
    vaultTitlePrefix: "Encrypted Password Vault:", vaultDossierBtn: "Vault Security Audit", vaultItemsBtn: "Accounts View",
    manageVaultBtn: "Vault Management", exportBtn: "Export Passwords", importBtn: "Import Passwords", addAccountBtn: "Add New Record",
    logoutBtn: "Sign Out", searchPlaceholder: "Search saved records...", showHidePass: "Toggle Visibility", copyBtn: "Copy",
    detailsBtn: "Record Details & Edit", deleteRecordBtn: "Delete Record", auditModalTitle: "Vault Security Audit & Telemetry",
    auditModalSub: "Credential strength evaluation and connected devices ledger", auditTabMetrics: "Security Audit Metrics",
    auditTabDevices: "Authorized Devices & Sessions", totalCredentials: "Total Stored Records", vaultHealthScore: "Vault Strength Score",
    reusedPasswords: "Reused Passwords", weakPasswords: "Weak Credentials", securityRecommendations: "Vault Hardening Recommendations:",
    rec1: "• Avoid reusing the same password across multiple platforms. A breach on one site compromises the rest.",
    rec2: "• Ensure passwords are at least 16 characters in length, incorporating symbols, numerals, and mixed-case letters.",
    rec3: "• Vault records are encrypted in the browser before being stored. Remote support access is enabled by the trusted administrator model.",
    noDeviceLogs: "No device login records captured yet.", currentSessionBadge: "Active Session",
    aboutModalTitle: "About Pass-Guard: Simple Secure Vault",
    toolsModalTitle: "Password Strength Auditor", toolsPlaceholder: "Type any password to evaluate its resistance...",
    recordDetailsTitle: "Edit Record Details", siteUrlLabel: "Platform URL", usernameLabel: "Username", passwordRecordLabel: "Password",
    emailLabel: "Linked Email", phoneLabel: "Phone Number", groupLabel: "Group Category", lastModifiedLabel: "Last Modified Date:",
    notesLabel: "Notes", saveNotesBtn: "Save Changes", closeBtn: "Close", selectBtn: "Select", cutBtn: "Cut", copyBtnAction: "Copy",
    pasteBtn: "Paste", selectAllBtn: "Select All", manageGroupsBtn: "Manage Groups", manageGroupsTitle: "Manage Groups",
    allGroups: "All", groupPlaceholder: "Group name...", captchaTitle: "Automated Access Verification",
    captchaSub: "5 failed attempts detected. Solve the arithmetic problem to resume.", captchaInput: "Enter Solution",
    captchaSubmit: "Verify & Proceed", cancelBtn: "Cancel", confirmBtn: "Confirm", addModalTitle: "Add New Vault Record",
    siteTitlePlaceholder: "Website Title (e.g., Snapchat)", usernamePlaceholder: "Username", siteUrlPlaceholder: "Platform Address (URL)",
    emailPlaceholder: "Linked Email Address", phonePlaceholder: "Phone Number", notesPlaceholder: "Notes...", passwordPlaceholder: "Password",
    generatePassTitle: "Generate Password", saveRecordBtn: "Store in Vault", copiedFeedback: "Copied to clipboard successfully",
    invalidAdminAlert: "Invalid administrator credentials!", missingFieldsAlert: "Please fill in all mandatory fields.",
    lockedAccountAlert: "Account locked due to repeated failed attempts. Please contact the administrator to restore access.",
    accountNotFoundAlert: "Vault record not found!", maxTriesExceededAlert: "Maximum attempts exceeded. Vault locked for security.",
    incorrectPasswordAlert: "Incorrect master password!", captchaFailedAlert: "Incorrect answer. Please retry.",
    captchaPassedAlert: "Verification successful. You have 3 additional attempts.", reservedUsernameAlert: "This identifier is reserved by system policies.",
    passwordComplexityAlert: "Password must be at least 8 chars, contain an uppercase letter, a number, and a symbol.",
    accountExistsAlert: "A vault with this identifier already exists!", unblockSuccessAlert: "Account suspension lifted successfully.",
    masterPassResetSuccessAlert: "Master password successfully reset and locks lifted.", importSuccessAlert: "Passwords imported successfully!",
    importPasswordMismatchAlert: "Master password does not match the imported file key!", importFormatErrorAlert: "Invalid backup file format!",
    importReadErrorAlert: "Error reading backup file!", vaultActionsTitle: "Vault Actions", passLength: "Length",
    includeSymbols: "Include Symbols", includeNumbers: "Include Numbers", toggleGenOptions: "Live Generator Options",
    vaultSettingsTitle: "Vault Security Management", vaultSettingsSub: "Update master credentials and recovery details",
    adminManageUserTitle: "Manage User Vault Data", adminManageUserSub: "Emergency recovery and record adjustments",
    creationDateLabel: "Creation Date:", saveSettingsBtn: "Save Updates", updateSuccessNotice: "Updates applied successfully!",
    confirmDeleteGroup: "Are you sure you want to delete group '{group}'? Accounts will be moved to '{all}'.",
    groupDeletedNotice: "Group deleted successfully."
  },
  ar: {
    appName: "Pass-Guard", toolsBtn: "فاحص كلمة السر", aboutBtn: "عن الموقع", toggleTheme: "تبديل المظهر",
    welcomeTitle: "مرحباً بك في", welcomeDesc: "خزنة كلمات مرور مشفرة بتقنية AES-GCM 256-bit مع مزامنة سحابية ودعم إداري عن بُعد للخزنات.",
    openVaultBtn: "فتح الخزنة (تسجيل الدخول)", createVaultBtn: "إنشاء خزنة جديدة", adminPortalBtn: "بوابة المشرف العام",
    statVisits: "إجمالي الزيارات", statLocal: "خزنة مشفرة", statEncryption: "AES-GCM تشفير", statProtection: "حماية مستمرة",
    loginHeading: "تسجيل الدخول", registerHeading: "إنشاء خزنة جديدة", adminHeading: "بوابة المشرف العام",
    loginSub: "أدخل بياناتك لفك تشفير الخزنة والوصول إلى حساباتك المحفوظة", registerSub: "أنشئ خزنتك المشفرة محلياً والمحمية بكلمة مرورك الرئيسية", adminSub: "وصول إداري عالمي حصري لتدقيق الخزنات والدعم الفني ومتابعة الإنذارات الأمنية",
    identifierLabel: "اسم المستخدم، البريد، أو رقم الهاتف", adminIdentifierLabel: "معرّف المشرف", passwordLabel: "كلمة المرور الرئيسية", adminPasswordLabel: "المفتاح السري للمشرف",
    submitLogin: "فك تشفير الخزنة", submitRegister: "إنشاء الخزنة وبدء الاستخدام", submitAdmin: "دخول لوحة التحكم",
    backToHome: "العودة للرئيسية واختيار مسار آخر", adminPanelTitle: "لوحة القيادة والتحكم الإداري المتقدم", adminBadge: "مشرف النظام",
    adminPanelSub: "نظام تدقيق العمليات الأمنية ومراقبة سلامة وسائط التخزين المحلية", registeredUsersCount: "إجمالي المستخدمين المسجلين",
    visitsCounter: "عداد الزيارات", resetVisitsConfirm: "هل أنت متأكد من تصفير عداد الزيارات بالكامل إلى 0؟",
    securityScore: "مؤشر الأمان العام", activeAlerts: "التنبيهات الأمنية النشطة", userRecordsTitle: "قائمة الخزنات المسجلة والتنبيهات الأمنية",
    noUsers: "لا توجد أي خزنة مسجلة محلياً.", accountSuspended: "موقوف أمنياً", securityAlertBadge: "إنذار أمني",
    localCryptoNote: "خزنة مشفرة ومتزامنة سحابياً", unblockBtn: "فك الحظر", manageUserBtn: "إدارة الخزنة",
    deleteAccountBtn: "حذف الخزنة", deleteAccountConfirm: "هل أنت متأكد من حذف هذه الخزنة نهائياً من وسيط التخزين؟",
    vaultTitlePrefix: "خزنة كلمات المرور المشفرة:", vaultDossierBtn: "معلومات وأمان الخزنة", vaultItemsBtn: "عرض الحسابات",
    manageVaultBtn: "إدارة الخزنة", exportBtn: "تصدير كلمات المرور", importBtn: "استيراد كلمات المرور", addAccountBtn: "إضافة حساب جديد",
    logoutBtn: "تسجيل الخروج", searchPlaceholder: "بحث في الحسابات المحفوظة...", showHidePass: "إظهار/إخفاء", copyBtn: "نسخ",
    detailsBtn: "تفاصيل وتعديل", deleteRecordBtn: "حذف", auditModalTitle: "الملف الأمني الشامل ومعلومات الخزنة",
    auditModalSub: "تدقيق متانة كلمات المرور وسجل الأجهزة المأذون لها", auditTabMetrics: "مؤشرات الأمان الفنية",
    auditTabDevices: "سجل الأجهزة والجلسات", totalCredentials: "إجمالي الحسابات المحفوظة", vaultHealthScore: "تقييم مناعة الخزنة",
    reusedPasswords: "كلمات مرور مكررة", weakPasswords: "كلمات مرور ضعيفة", securityRecommendations: "التوصيات الأمنية لحصانة الخزنة:",
    rec1: "• تجنب تماماً استخدام نفس كلمة المرور لأكثر من منصة؛ فاختراق منصة واحدة يعرض بقية حساباتك للانكشاف.",
    rec2: "• احرص ألا يقل طول كلمة المرور عن 16 خانة، مع احتوائها على رموز خاصة، وأرقام، وأحرف كبيرة وصغيرة.",
    rec3: "• يتم تشفير سجلات الخزنة داخل المتصفح قبل تخزينها. تم تفعيل دعم المشرف عن بُعد وفق نموذج الثقة الإداري للمشروع.",
    noDeviceLogs: "لا يوجد سجل أجهزة ملتقط حتى الآن.", currentSessionBadge: "الجلسة الحالية",
    aboutModalTitle: "عن Pass-Guard: خزنتك الآمنة بلا تعقيد",
    toolsModalTitle: "فاحص متانة كلمات المرور", toolsPlaceholder: "اكتب أي كلمة مرور لفحص مدى صمودها...",
    recordDetailsTitle: "تعديل بيانات الحساب:", siteUrlLabel: "عنوان المنصة الإلكترونية", usernameLabel: "اسم المستخدم", passwordRecordLabel: "كلمة المرور",
    emailLabel: "البريد الإلكتروني المقترن", phoneLabel: "رقم الهاتف", groupLabel: "المجموعة", lastModifiedLabel: "تاريخ آخر تعديل:",
    notesLabel: "الملاحظات", saveNotesBtn: "حفظ التعديلات", closeBtn: "إغلاق", selectBtn: "تحديد", cutBtn: "قص", copyBtnAction: "نسخ",
    pasteBtn: "لصق", selectAllBtn: "تحديد الكل", manageGroupsBtn: "إدارة المجموعات", manageGroupsTitle: "إدارة مجموعات الحسابات",
    allGroups: "الكل", groupPlaceholder: "اسم المجموعة الجديدة...", captchaTitle: "التحقق من الدخول الآلي",
    captchaSub: "تم رصد 5 محاولات خاطئة. يرجى حل المسألة الحسابية للمتابعة.", captchaInput: "أدخل الناتج",
    captchaSubmit: "تحقق ومتابعة", cancelBtn: "إلغاء", confirmBtn: "تأكيد", addModalTitle: "إضافة حساب جديد إلى الخزنة",
    siteTitlePlaceholder: "عنوان الموقع (مثل: Snapchat)", usernamePlaceholder: "اسم المستخدم", siteUrlPlaceholder: "رابط المنصة (URL)",
    emailPlaceholder: "البريد الإلكتروني المقترن", phonePlaceholder: "رقم الهاتف", notesPlaceholder: "ملاحظات...", passwordPlaceholder: "كلمة المرور",
    generatePassTitle: "توليد كلمة مرور منيعة", saveRecordBtn: "حفظ في الخزنة", copiedFeedback: "تم النسخ إلى الحافظة بنجاح",
    invalidAdminAlert: "بيانات اعتماد المشرف غير صحيحة!", missingFieldsAlert: "يرجى استكمال جميع الحقول الإلزامية.",
    lockedAccountAlert: "الحساب موقوف أمنياً لتكرار المحاولات الفاشلة. يرجى التواصل مع المشرف العام.",
    accountNotFoundAlert: "سجل الخزنة هذا غير موجود!", maxTriesExceededAlert: "تم استنفاد الحد الأقصى للمحاولات. تم تفعيل قفل الأمان وتعليق الخزنة.",
    incorrectPasswordAlert: "كلمة المرور الرئيسية غير صحيحة!", captchaFailedAlert: "الناتج الحسابي غير صحيح. أعد المحاولة.",
    captchaPassedAlert: "تم التحقق بنجاح. مُنحت 3 محاولات إضافية.", reservedUsernameAlert: "اسم المستخدم هذا محجوز لسياسات النظام.",
    passwordComplexityAlert: "كلمة المرور يجب أن لا تقل عن 8 خانات وتحتوي على حرف كبير، رقم، ورمز خاص.",
    accountExistsAlert: "توجد خزنة مسجلة مسبقاً بهذا المعرّف!", unblockSuccessAlert: "تم فك الحظر الأمني عن الحساب بنجاح.",
    masterPassResetSuccessAlert: "تمت إعادة تعيين كلمة المرور الرئيسية وإلغاء القفل بنجاح.", importSuccessAlert: "تم استيراد كلمات المرور بنجاح!",
    importPasswordMismatchAlert: "كلمة المرور الرئيسية الحالية لا تتطابق مع مفتاح تشفير الملف المستورد!", importFormatErrorAlert: "صيغة ملف النسخة الاحتياطية غير صالحة!",
    importReadErrorAlert: "حدث خطأ أثناء قراءة ملف النسخة الاحتياطية!", vaultActionsTitle: "إجراءات الخزنة", passLength: "طول كلمة المرور",
    includeSymbols: "تضمين الرموز الخاصة", includeNumbers: "تضمين الأرقام", toggleGenOptions: "خيارات المولد الحي والتحكم",
    vaultSettingsTitle: "إدارة إعدادات الخزنة الشاملة", vaultSettingsSub: "تحديث بيانات الاعتماد ومعلومات الطوارئ",
    adminManageUserTitle: "إدارة بيانات المستخدم والخزنة", adminManageUserSub: "تعديل معلومات الطوارئ وتحديث بيانات الدخول",
    creationDateLabel: "تاريخ إنشاء الخزنة:", saveSettingsBtn: "تحديث وحفظ التغييرات", updateSuccessNotice: "تم تحديث البيانات بنجاح!",
    confirmDeleteGroup: "هل أنت متأكد من حذف المجموعة '{group}'؟ سيتم نقل حساباتها إلى '{all}'.",
    groupDeletedNotice: "تم حذف المجموعة ونقل حساباتها بنجاح."
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
  const [captchaPassed, setCaptchaPassed] = useState(false);
  const [postCaptchaAttempts, setPostCaptchaAttempts] = useState(0);
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const [userCaptchaInput, setUserCaptchaInput] = useState('');
  const [mathCaptcha, setMathCaptcha] = useState({ num1: 5, num2: 3, answer: 8 });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });
  const [vaultItems, setVaultItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [visitCount, setVisitCount] = useState(0);
  const [currentVaultId, setCurrentVaultId] = useState(null);
  const [currentEncryptedVault, setCurrentEncryptedVault] = useState(null);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
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
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [manageData, setManageData] = useState({ oldId: '', identifier: '', masterPassword: '', oldPass: '', email: '', phone: '', createdAt: '' });
  const [inAppNotice, setInAppNotice] = useState('');

  const triggerNotice = (msg) => { setInAppNotice(msg); setTimeout(() => setInAppNotice(''), 4000); };
  const askConfirm = (message, onConfirm) => setConfirmDialog({ isOpen: true, message, onConfirm });

  useEffect(() => {
    if (clipboardBuffer.length > 0) {
      const timer = setTimeout(() => {
        setClipboardBuffer([]);
        triggerNotice(lang === 'ar' ? 'تم مسح الحافظة المؤقتة تلقائياً لحماية بياناتك.' : 'Clipboard cleared automatically for security.');
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, [clipboardBuffer, lang]);

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d)) return isoString;
      return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return isoString; }
  };

  const handlePhoneChange = (e, setter) => setter(e.target.value.replace(/[^0-9+]/g, ''));

  const parseDeviceInfo = () => {
    const ua = navigator.userAgent;
    let os = lang === 'ar' ? "نظام غير معروف" : "Unknown OS";
    let model = "";
    if (/android/i.test(ua)) {
      os = "Android OS";
      const match = ua.match(/;\s([^;]+)\sBuild\//);
      if (match && match[1]) model = match[1].trim();
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      os = "Apple iOS";
      if (/iphone/i.test(ua)) model = "iPhone";
      else if (/ipad/i.test(ua)) model = "iPad";
    } else if (/win/i.test(ua)) {
      os = "Windows PC";
      if (/windows nt 10.0/i.test(ua)) model = "Windows 10/11";
    } else if (/mac/i.test(ua)) {
      os = "Apple macOS";
      model = "MacBook / iMac";
    } else if (/linux/i.test(ua)) {
      os = "Linux PC";
    }
    let browser = lang === 'ar' ? "متصفح غير معروف" : "Unknown Browser";
    if (ua.indexOf("Chrome") !== -1 && ua.indexOf("Edg") === -1) browser = "Google Chrome";
    else if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) browser = "Apple Safari";
    else if (ua.indexOf("Firefox") !== -1) browser = "Mozilla Firefox";
    else if (ua.indexOf("Edg") !== -1) browser = "Microsoft Edge";
    const screenRes = `${window.screen.width}x${window.screen.height}`;
    const deviceId = `DEV-${Math.abs((model + os + browser + screenRes).split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)).toString(16).toUpperCase()}`;
    return { os: model ? `${model} (${os})` : os, browser, screenRes, deviceId };
  };

  const registerDeviceLogin = async (cleanId, vaultId, loginPassword) => {
    const device = parseDeviceInfo();
    const nowISO = new Date().toISOString();
    let netInfo = { ip: '127.0.0.1', isp: 'Secure Local Network', location: 'Local Host' };
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        netInfo = { ip: data.ip || '127.0.0.1', isp: data.org || data.asn || 'Verified Network', location: `${data.city || ''}، ${data.country_name || ''}` };
      }
    } catch (e) {}

    const localEntry = {
      id: `dev_${Date.now()}`,
      device_id: device.deviceId,
      deviceId: device.deviceId,
      os: device.os,
      browser: device.browser,
      screen_res: device.screenRes,
      screenRes: device.screenRes,
      ip: netInfo.ip,
      isp: netInfo.isp,
      location: netInfo.location,
      last_login: nowISO,
      lastLogin: nowISO,
      is_current: true,
      isCurrent: true
    };

    if (supabaseConfigured && vaultId && loginPassword) {
      try {
        const { data, error } = await supabase.rpc('record_device_log', {
          p_vault_id: vaultId,
          p_master_password: loginPassword,
          p_device_id: device.deviceId,
          p_os: device.os,
          p_browser: device.browser,
          p_screen_res: device.screenRes,
          p_ip: netInfo.ip,
          p_isp: netInfo.isp,
          p_location: netInfo.location,
          p_last_login: nowISO,
        });
        if (!error && Array.isArray(data) && data.length > 0) {
          const formatted = data.map(d => ({
            ...d,
            deviceId: d.device_id || d.deviceId,
            screenRes: d.screen_res || d.screenRes,
            lastLogin: d.last_login || d.lastLogin,
            isCurrent: (d.device_id || d.deviceId) === device.deviceId
          }));
          setVaultDeviceLogs(formatted);
          return;
        }
      } catch (err) {}
    }

    const logKey = `passguard_devices_${cleanId}`;
    let logs = [];
    try {
      const saved = localStorage.getItem(logKey);
      if (saved) logs = JSON.parse(saved);
    } catch (e) {}
    
    logs.forEach(l => { l.is_current = false; l.isCurrent = false; });
    const existingIndex = logs.findIndex(l => (l.device_id || l.deviceId) === device.deviceId);
    if (existingIndex !== -1) {
      logs[existingIndex] = { ...localEntry, is_current: true, isCurrent: true };
    } else {
      logs.unshift(localEntry);
    }
    const updated = logs.slice(0, 15);
    try { localStorage.setItem(logKey, JSON.stringify(updated)); } catch (e) {}
    setVaultDeviceLogs(updated);
  };

  useEffect(() => {
    let cancelled = false;
    const loadVisits = async () => {
      const sessionKey = 'passguard_session_counted';
      const hasCountedSession = sessionStorage.getItem(sessionKey);

      if (supabaseConfigured) {
        try {
          if (!hasCountedSession) {
            const { data: incData, error: incErr } = await supabase.rpc('increment_visit');
            if (!incErr && incData) {
              const countVal = Array.isArray(incData) ? incData[0]?.total_visits : incData?.total_visits;
              sessionStorage.setItem(sessionKey, 'true');
              if (!cancelled && countVal !== undefined && countVal !== null) {
                setVisitCount(Number(countVal));
                return;
              }
            }
          }

          const { data: readData, error: readErr } = await supabase
            .from('site_visits')
            .select('total_visits')
            .eq('id', 1)
            .maybeSingle();

          if (!readErr && readData && !cancelled) {
            setVisitCount(Number(readData.total_visits || 0));
            return;
          }
        } catch (e) {
          console.error('Visits counter fetch failed:', e);
        }
      }

      let stored = parseInt(localStorage.getItem('passguard_total_visits') || '0', 10);
      if (!hasCountedSession) {
        stored += 1;
        localStorage.setItem('passguard_total_visits', stored.toString());
        sessionStorage.setItem(sessionKey, 'true');
      }
      if (!cancelled) setVisitCount(stored);
    };
    loadVisits();
    return () => { cancelled = true; };
  }, []);

  const handleResetVisits = () => {
    askConfirm(t.resetVisitsConfirm, async () => {
      if (supabaseConfigured) {
        const { error: authError } = await supabase.auth.getUser();
        if (authError) { triggerNotice(authError.message); return; }
        const { error } = await supabase.from('site_visits').update({ total_visits: 0 }).eq('id', 1);
        if (error) { triggerNotice(error.message); return; }
      } else {
        localStorage.setItem('passguard_total_visits', '0');
      }
      setVisitCount(0);
      triggerNotice(lang === 'ar' ? 'تم تصفير عداد الزيارات بنجاح.' : 'Visit counter reset successfully.');
    });
  };

  const loadAdminUsersData = async () => {
    setAdminLoading(true);
    if (supabaseConfigured && isAdmin) {
      const { data, error } = await supabase
        .from('vaults')
        .select('id,identifier,email,phone,is_locked,alert,support_master_password,encrypted_data,created_at,updated_at')
        .order('created_at', { ascending: false });
      if (!error) {
        setRegisteredUsers((data || []).map(v => ({
          id: v.id,
          username: v.identifier,
          isLocked: !!v.is_locked,
          alert: !!v.alert,
          masterPassword: v.support_master_password || '',
          email: v.email || '',
          phone: v.phone || '',
          createdAt: v.created_at || 'N/A',
          encryptedData: v.encrypted_data || null,
        })));
      } else {
        triggerNotice(error.message);
      }
    } else if (!supabaseConfigured) {
      const users = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('passguard_vault_')) {
          const username = key.replace('passguard_vault_', '');
          const metaKey = `passguard_meta_${username}`;
          let isLocked = false, alertMsg = false, meta = {};
          try { meta = JSON.parse(localStorage.getItem(metaKey)) || {}; } catch (e) {}
          isLocked = !!meta.isLocked; alertMsg = !!meta.alert;
          users.push({ username, isLocked, alert: alertMsg, masterPassword: '', email: meta.email || '', phone: meta.phone || '', createdAt: meta.createdAt || 'N/A', encryptedData: JSON.parse(localStorage.getItem(key) || 'null') });
        }
      }
      setRegisteredUsers(users);
    }
    setAdminLoading(false);
  };

  useEffect(() => { loadAdminUsersData(); }, [isUnlocked, currentView, isAdmin]);

  const handleTitleChange = (val) => {
    setNewTitle(val);
    if (val.trim().length > 0) setSiteSuggestions(POPULAR_SITES.filter(s => s.name.toLowerCase().includes(val.toLowerCase())));
    else setSiteSuggestions([]);
  };

  const selectSuggestion = (site) => { setNewTitle(site.name); setNewUrl(site.url); setSiteSuggestions([]); };

  const triggerLiveGeneration = (length, symbols, numbers) => {
    const pass = generateSecurePassword(length, symbols, numbers);
    setNewPassword(pass);
    if (editableRecord) setEditableRecord(prev => ({ ...prev, password: pass }));
  };

  useEffect(() => { if (showGenOptions) triggerLiveGeneration(genLength, useSymbols, useNumbers); }, [genLength, useSymbols, useNumbers, showGenOptions]);

  const canvasRef = useRef(null);
  const themeRef = useRef(theme);
  useEffect(() => { themeRef.current = theme; }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    let mouse = { x: width / 2, y: height / 2 };
    const handleMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    window.addEventListener('mousemove', handleMouseMove);
    const particles = [];
    const particleCount = Math.floor((width * height) / 10000);
    for (let i = 0; i < particleCount; i++) particles.push({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, radius: Math.random() * 3 + 1.5 });
    const draw = () => {
      const ct = themeRef.current;
      ctx.fillStyle = ct === 'dark' ? '#030712' : '#f8fafc';
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = ct === 'dark' ? 'rgba(99, 102, 241, 0.8)' : 'rgba(79, 70, 229, 0.7)';
        ctx.shadowColor = ct === 'dark' ? '#6366f1' : '#4f46e5';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        const dx = mouse.x - p.x, dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = ct === 'dark' ? `rgba(99, 102, 241, ${1.1 - dist / 150})` : `rgba(79, 70, 229, ${1.1 - dist / 150})`;
          ctx.lineWidth = 1;
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
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (authMode === 'admin') {
      if (!supabaseConfigured) { 
        setError(lang === 'ar' ? 'Supabase غير متصل، تأكد من إعداد المفاتيح.' : 'Configure Supabase first.'); 
        return; 
      }
      const targetEmail = (ADMIN_EMAIL && ADMIN_EMAIL.trim()) || 'thaeraladom@gmail.com';

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email: targetEmail, 
        password: masterPassword 
      });

      if (authError) { 
        console.error('Supabase Auth Error:', authError);
        setError(authError.message === 'Invalid login credentials' ? t.invalidAdminAlert : authError.message); 
        return; 
      }

      setAdminPassword(masterPassword);
      setIsAdmin(true); 
      setIsUnlocked(true); 
      setAdminSubView('dashboard'); 
      setError('');
      await loadAdminUsersData();
      return;
    }
    if (!identifier.trim() || !masterPassword.trim()) { setError(t.missingFieldsAlert); return; }
    const cleanId = normalizeIdentifier(identifier);

    const triggerFailedAttempt = async () => {
      if (captchaPassed) {
        const nextPost = postCaptchaAttempts + 1;
        setPostCaptchaAttempts(nextPost);
        if (nextPost >= 3) {
          if (supabaseConfigured) {
            try {
              await supabase.rpc('lock_vault_security_alert', { p_identifier: cleanId });
            } catch (err) {
              console.error('Failed to trigger lock alert:', err);
            }
          }
          const metaKey = `passguard_meta_${cleanId}`;
          let m = { isLocked: true, alert: true };
          try { m = { ...JSON.parse(localStorage.getItem(metaKey) || '{}'), isLocked: true, alert: true }; } catch (e) {}
          localStorage.setItem(metaKey, JSON.stringify(m));
          setError(t.maxTriesExceededAlert);
        } else {
          setError(lang === 'ar' ? `كلمة المرور غير صحيحة! (المحاولات المتبقية: ${3 - nextPost})` : `Incorrect password! (${3 - nextPost} attempts remaining)`);
        }
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        if (nextAttempts >= 5) {
          const n1 = Math.floor(Math.random() * 10) + 1;
          const n2 = Math.floor(Math.random() * 10) + 1;
          setMathCaptcha({ num1: n1, num2: n2, answer: n1 + n2 });
          setUserCaptchaInput('');
          setShowCaptchaModal(true);
          setError('');
        } else {
          setError(lang === 'ar' ? `كلمة المرور غير صحيحة! (${nextAttempts}/5)` : `Incorrect password! (${nextAttempts}/5)`);
        }
      }
    };

    if (supabaseConfigured) {
      const { data, error: rpcError } = await supabase.rpc('login_vault', {
        p_identifier: cleanId,
        p_master_password: masterPassword,
      });
      const row = Array.isArray(data) ? data[0] : data;
      if (rpcError) {
        if (rpcError.message.includes('locked')) {
          setError(t.lockedAccountAlert);
          return;
        }
        await triggerFailedAttempt();
        return;
      }
      if (row?.is_locked) { setError(t.lockedAccountAlert); return; }
      if (row?.encrypted_data) {
        const decrypted = await decryptData(row.encrypted_data, masterPassword);
        if (decrypted) {
          setVaultItems(decrypted);
          setCurrentVaultId(row.id);
          setCurrentEncryptedVault(row.encrypted_data);
          let customGroups = ['شخصي', 'عمل'];
          decrypted.forEach(item => { if (item.group && !customGroups.includes(item.group)) customGroups.push(item.group); });
          setGroups(customGroups); setIsAdmin(false); setIsUnlocked(true); setVaultSubView('items'); setError('');
          setFailedAttempts(0); setCaptchaPassed(false); setPostCaptchaAttempts(0);
          cacheVaultLocally(cleanId, row.encrypted_data, row);
          await registerDeviceLogin(cleanId, row.id, masterPassword);
          return;
        } else {
          await triggerFailedAttempt();
          return;
        }
      }

      try {
        const legacyEncrypted = JSON.parse(localStorage.getItem(`passguard_vault_${cleanId}`) || 'null');
        const legacyMeta = JSON.parse(localStorage.getItem(`passguard_meta_${cleanId}`) || '{}');
        const legacyDecrypted = legacyEncrypted ? await decryptData(legacyEncrypted, masterPassword) : null;
        if (legacyDecrypted) {
          const { data: migrated, error: migrateError } = await supabase.rpc('register_vault', {
            p_identifier: cleanId, p_master_password: masterPassword, p_email: legacyMeta.email || '', p_phone: legacyMeta.phone || '', p_encrypted_data: legacyEncrypted
          });
          if (!migrateError) {
            const migratedRow = Array.isArray(migrated) ? migrated[0] : migrated;
            setVaultItems(legacyDecrypted);
            setCurrentVaultId(migratedRow?.id || null);
            setCurrentEncryptedVault(legacyEncrypted);
            let customGroups = ['شخصي', 'عمل'];
            legacyDecrypted.forEach(item => { if (item.group && !customGroups.includes(item.group)) customGroups.push(item.group); });
            setGroups(customGroups); setIsAdmin(false); setIsUnlocked(true); setVaultSubView('items'); setError('');
            setFailedAttempts(0); setCaptchaPassed(false); setPostCaptchaAttempts(0);
            await registerDeviceLogin(cleanId, migratedRow?.id, masterPassword);
            triggerNotice(lang === 'ar' ? 'تمت مزامنة خزنتك المحلية القديمة إلى الخادم بنجاح.' : 'Your legacy local vault was successfully migrated to the cloud.');
            return;
          }
        }
      } catch (migrationError) {}

      await triggerFailedAttempt();
      return;
    }

    const metaKey = `passguard_meta_${cleanId}`;
    let metaData = { isLocked: false, alert: false };
    try { const savedMeta = localStorage.getItem(metaKey); if (savedMeta) metaData = JSON.parse(savedMeta); } catch (e) {}
    if (metaData.isLocked) { setError(t.lockedAccountAlert); return; }
    const storageKey = `passguard_vault_${cleanId}`;
    const savedVault = localStorage.getItem(storageKey);
    if (!savedVault) { setError(t.accountNotFoundAlert); return; }
    const encryptedObj = JSON.parse(savedVault);
    const decrypted = await decryptData(encryptedObj, masterPassword);
    if (decrypted) {
      setVaultItems(decrypted); setCurrentVaultId(null); setCurrentEncryptedVault(encryptedObj);
      let customGroups = ['شخصي', 'عمل'];
      decrypted.forEach(item => { if (item.group && !customGroups.includes(item.group)) customGroups.push(item.group); });
      setGroups(customGroups); setIsAdmin(false); setIsUnlocked(true); setVaultSubView('items'); setError('');
      setFailedAttempts(0); setCaptchaPassed(false); setPostCaptchaAttempts(0);
      registerDeviceLogin(cleanId, null, null);
    } else {
      await triggerFailedAttempt();
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !masterPassword.trim()) { setError(t.missingFieldsAlert); return; }
    if (normalizeIdentifier(identifier) === 'admin') { setError(t.reservedUsernameAlert); return; }
    if (!isValidPassword(masterPassword)) { setError(t.passwordComplexityAlert); return; }
    const cleanId = normalizeIdentifier(identifier);
    const initialItems = [];
    const encrypted = await encryptData(initialItems, masterPassword);

    if (supabaseConfigured) {
      const { data, error: rpcError } = await supabase.rpc('register_vault', {
        p_identifier: cleanId,
        p_master_password: masterPassword,
        p_email: '',
        p_phone: '',
        p_encrypted_data: encrypted,
      });
      if (rpcError) { setError(rpcError.message); return; }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.id) { setError(t.accountExistsAlert); return; }
      setCurrentVaultId(row.id); setCurrentEncryptedVault(encrypted);
      cacheVaultLocally(cleanId, encrypted, row);
      setGroups(['شخصي', 'عمل']); setVaultItems(initialItems);
      setIsAdmin(false); setIsUnlocked(true); setVaultSubView('items'); setError('');
      await registerDeviceLogin(cleanId, row.id, masterPassword);
      return;
    }

    const storageKey = `passguard_vault_${cleanId}`;
    if (localStorage.getItem(storageKey)) { setError(t.accountExistsAlert); return; }
    localStorage.setItem(storageKey, JSON.stringify(encrypted));
    localStorage.setItem(`passguard_meta_${cleanId}`, JSON.stringify({ isLocked: false, alert: false, identifier: cleanId, email: '', phone: '', createdAt: new Date().toISOString() }));
    setCurrentVaultId(null); setCurrentEncryptedVault(encrypted);
    setGroups(['شخصي', 'عمل']); setVaultItems(initialItems);
    setIsAdmin(false); setIsUnlocked(true); setVaultSubView('items'); setError('');
    registerDeviceLogin(cleanId, null, null);
  };

  const openDirectAction = (mode) => {
    setAuthMode(mode);
    setIdentifier(mode === 'admin' ? 'admin' : '');
    setMasterPassword(''); setError('');
    setCurrentView('auth');
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id); setCopyStatusMsg(t.copiedFeedback);
      setTimeout(() => { setCopiedId(null); setCopyStatusMsg(''); }, 3000);
    } catch (err) {}
  };

  const togglePasswordVisibility = (id) => setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));

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
            if (supabaseConfigured && currentVaultId) {
              const { error: saveError } = await cloudSaveVault({ vaultId: currentVaultId, identifier: normalizeIdentifier(identifier), masterPassword, encryptedData: importedData });
              if (saveError) { triggerNotice(saveError.message); return; }
            } else {
              localStorage.setItem(`passguard_vault_${identifier.trim().toLowerCase()}`, JSON.stringify(importedData));
            }
            setCurrentEncryptedVault(importedData);
            cacheVaultLocally(identifier, importedData);
            let customGroups = ['شخصي', 'عمل'];
            decrypted.forEach(item => { if (item.group && !customGroups.includes(item.group)) customGroups.push(item.group); });
            setGroups(customGroups); setVaultItems(decrypted);
            triggerNotice(t.importSuccessAlert);
          } else triggerNotice(t.importPasswordMismatchAlert);
        } else triggerNotice(t.importFormatErrorAlert);
      } catch (err) { triggerNotice(t.importReadErrorAlert); }
    };
    reader.readAsText(file);
  };

  const handleSaveRecordChanges = async (e) => {
    e.preventDefault();
    if (!isValidPassword(editableRecord.password)) { triggerNotice(t.passwordComplexityAlert); return; }
    const updatedRecord = { ...editableRecord, lastUpdated: new Date().toISOString() };
    const updatedItems = vaultItems.map(item => item.id === editableRecord.id ? updatedRecord : item);
    setVaultItems(updatedItems); setEditableRecord(updatedRecord);
    const encrypted = await encryptData(updatedItems, masterPassword);
    if (supabaseConfigured && currentVaultId) {
      const { error: saveError } = await cloudSaveVault({ vaultId: currentVaultId, identifier: normalizeIdentifier(identifier), masterPassword, encryptedData: encrypted });
      if (saveError) { triggerNotice(saveError.message); return; }
    } else {
      localStorage.setItem(`passguard_vault_${identifier.trim().toLowerCase()}`, JSON.stringify(encrypted));
    }
    setCurrentEncryptedVault(encrypted);
    cacheVaultLocally(identifier, encrypted);
    triggerNotice(t.updateSuccessNotice);
  };

  const submitNewGroup = (e) => {
    e.preventDefault();
    if (newGroupNameInput && newGroupNameInput.trim()) {
      const trimmed = newGroupNameInput.trim();
      if (!groups.includes(trimmed)) {
        setGroups([...groups, trimmed]);
        triggerNotice(lang === 'ar' ? `تم إنشاء المجموعة "${trimmed}" بنجاح.` : `Group "${trimmed}" created successfully.`);
      }
      setNewGroupNameInput('');
    }
  };

  const saveRenamedGroup = async (oldName) => {
    const trimmed = editingGroupNewName.trim();
    if (!trimmed || trimmed === oldName || groups.includes(trimmed)) { setEditingGroupOldName(null); return; }
    setGroups(groups.map(g => g === oldName ? trimmed : g));
    const updatedItems = vaultItems.map(item => item.group === oldName ? { ...item, group: trimmed } : item);
    setVaultItems(updatedItems);
    if (selectedGroup === oldName) setSelectedGroup(trimmed);
    const encrypted = await encryptData(updatedItems, masterPassword);
    if (supabaseConfigured && currentVaultId) { const { error: saveError } = await cloudSaveVault({ vaultId: currentVaultId, identifier: normalizeIdentifier(identifier), masterPassword, encryptedData: encrypted }); if (saveError) { triggerNotice(saveError.message); return; } }
    else localStorage.setItem(`passguard_vault_${identifier.trim().toLowerCase()}`, JSON.stringify(encrypted));
    setCurrentEncryptedVault(encrypted); cacheVaultLocally(identifier, encrypted);
    setEditingGroupOldName(null); triggerNotice(t.updateSuccessNotice);
  };

  const deleteGroup = (groupName) => {
    askConfirm(t.confirmDeleteGroup.replace('{group}', groupName).replace('{all}', t.allGroups), async () => {
      setGroups(groups.filter(g => g !== groupName));
      const updatedItems = vaultItems.map(item => item.group === groupName ? { ...item, group: '' } : item);
      setVaultItems(updatedItems);
      if (selectedGroup === groupName) setSelectedGroup('ALL_GROUPS');
      const encrypted = await encryptData(updatedItems, masterPassword);
      if (supabaseConfigured && currentVaultId) { const { error: saveError } = await cloudSaveVault({ vaultId: currentVaultId, identifier: normalizeIdentifier(identifier), masterPassword, encryptedData: encrypted }); if (saveError) { triggerNotice(saveError.message); return; } }
      else localStorage.setItem(`passguard_vault_${identifier.trim().toLowerCase()}`, JSON.stringify(encrypted));
      setCurrentEncryptedVault(encrypted); cacheVaultLocally(identifier, encrypted);
      triggerNotice(t.groupDeletedNotice);
    });
  };

  const toggleSelectAccount = (id) => setSelectedAccountIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleSelectAll = () => {
    const filtered = selectedGroup === 'ALL_GROUPS' ? vaultItems : vaultItems.filter(i => i.group === selectedGroup);
    if (filtered.length > 0 && selectedAccountIds.length === filtered.length) setSelectedAccountIds([]);
    else setSelectedAccountIds(filtered.map(i => i.id));
  };

  const handleBulkCopy = () => {
    if (selectedAccountIds.length === 0) { triggerNotice(lang === 'ar' ? 'يرجى تحديد حساب واحد على الأقل أولاً.' : 'Please select at least one account.'); return; }
    const itemsToCopy = vaultItems.filter(i => selectedAccountIds.includes(i.id));
    setClipboardBuffer(itemsToCopy);
    triggerNotice(lang === 'ar' ? `تم نسخ ${itemsToCopy.length} حساب إلى الحافظة المؤقتة.` : `Copied ${itemsToCopy.length} accounts to temporary clipboard.`);
  };

  const handleBulkCut = () => {
    if (selectedAccountIds.length === 0) { triggerNotice(lang === 'ar' ? 'يرجى تحديد حساب واحد على الأقل أولاً.' : 'Please select at least one account.'); return; }
    const itemsToCut = vaultItems.filter(i => selectedAccountIds.includes(i.id));
    setClipboardBuffer(itemsToCut);
    const remaining = vaultItems.filter(i => !selectedAccountIds.includes(i.id));
    setVaultItems(remaining); setSelectedAccountIds([]);
    const doSave = async () => {
      const enc = await encryptData(remaining, masterPassword);
      if (supabaseConfigured && currentVaultId) { const { error: saveError } = await cloudSaveVault({ vaultId: currentVaultId, identifier: normalizeIdentifier(identifier), masterPassword, encryptedData: enc }); if (saveError) { triggerNotice(saveError.message); return; } }
      else localStorage.setItem(`passguard_vault_${identifier.trim().toLowerCase()}`, JSON.stringify(enc));
      setCurrentEncryptedVault(enc); cacheVaultLocally(identifier, enc);
    };
    doSave();
    triggerNotice(lang === 'ar' ? `تم قص ${itemsToCut.length} حساب.` : `Cut ${itemsToCut.length} accounts.`);
  };

  const handleBulkPaste = async () => {
    if (clipboardBuffer.length === 0) { triggerNotice(lang === 'ar' ? 'الحافظة فارغة حالياً.' : 'Clipboard buffer is empty.'); return; }
    const pastedItems = clipboardBuffer.map(i => ({ ...i, id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random(), title: i.title, group: selectedGroup === 'ALL_GROUPS' ? '' : selectedGroup }));
    const updated = [...vaultItems, ...pastedItems];
    setVaultItems(updated);
    const encrypted = await encryptData(updated, masterPassword);
    if (supabaseConfigured && currentVaultId) { const { error: saveError } = await cloudSaveVault({ vaultId: currentVaultId, identifier: normalizeIdentifier(identifier), masterPassword, encryptedData: encrypted }); if (saveError) { triggerNotice(saveError.message); return; } }
    else localStorage.setItem(`passguard_vault_${identifier.trim().toLowerCase()}`, JSON.stringify(encrypted));
    setCurrentEncryptedVault(encrypted); cacheVaultLocally(identifier, encrypted);
    triggerNotice(lang === 'ar' ? `تم لصق ${pastedItems.length} حساب بنجاح.` : `Pasted ${pastedItems.length} accounts successfully.`);
  };

  const calculateVaultMetrics = () => {
    const total = vaultItems.length;
    if (total === 0) return { score: 100, weakCount: 0, reusedCount: 0, strongCount: 0, total: 0 };
    let weakCount = 0, strongCount = 0;
    const passFreq = {};
    vaultItems.forEach(item => {
      const p = item.password || '';
      passFreq[p] = (passFreq[p] || 0) + 1;
      if (p.length < 8 || !/[0-9]/.test(p) || !/[@#$%&*!-_]/.test(p)) weakCount++; else strongCount++;
    });
    let reusedCount = 0;
    Object.values(passFreq).forEach(count => { if (count > 1) reusedCount += count; });
    let score = Math.round(100 - (weakCount * 15 + reusedCount * 20) / (total || 1));
    if (score < 20) score = 20;
    return { score, weakCount, reusedCount, strongCount, total };
  };

  const openVaultSettings = () => {
    const cleanId = normalizeIdentifier(identifier);
    let meta = {};
    try { meta = JSON.parse(localStorage.getItem(`passguard_meta_${cleanId}`) || '{}'); } catch (e) {}
    setManageData({ oldId: cleanId, identifier: meta.identifier || cleanId, masterPassword, oldPass: masterPassword, email: meta.email || '', phone: meta.phone || '', createdAt: meta.createdAt || new Date().toISOString(), vaultId: currentVaultId });
    setVaultSubView('settings');
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!manageData.identifier || !manageData.masterPassword) { triggerNotice(t.missingFieldsAlert); return; }
    if (!isValidPassword(manageData.masterPassword)) { triggerNotice(t.passwordComplexityAlert); return; }
    const newIdClean = normalizeIdentifier(manageData.identifier);
    const encrypted = await encryptData(vaultItems, manageData.masterPassword);

    if (supabaseConfigured && currentVaultId) {
      const { data, error: rpcError } = await supabase.rpc('update_vault_profile', {
        p_vault_id: currentVaultId,
        p_old_identifier: normalizeIdentifier(manageData.oldId),
        p_old_master_password: manageData.oldPass,
        p_new_identifier: newIdClean,
        p_new_master_password: manageData.masterPassword,
        p_email: manageData.email || '',
        p_phone: manageData.phone || '',
        p_encrypted_data: encrypted,
      });
      if (rpcError) { triggerNotice(rpcError.message); return; }
      const row = Array.isArray(data) ? data[0] : data;
      setCurrentVaultId(row?.id || currentVaultId);
    } else {
      const oldStorageKey = `passguard_vault_${manageData.oldId}`;
      const oldMetaKey = `passguard_meta_${manageData.oldId}`;
      if (manageData.oldId !== newIdClean && localStorage.getItem(`passguard_vault_${newIdClean}`)) { triggerNotice(t.accountExistsAlert); return; }
      if (manageData.oldId !== newIdClean) { localStorage.removeItem(oldStorageKey); localStorage.removeItem(oldMetaKey); }
      localStorage.setItem(`passguard_vault_${newIdClean}`, JSON.stringify(encrypted));
      localStorage.setItem(`passguard_meta_${newIdClean}`, JSON.stringify({ isLocked: false, alert: false, identifier: newIdClean, email: manageData.email || '', phone: manageData.phone || '', createdAt: manageData.createdAt || new Date().toISOString() }));
    }

    setCurrentEncryptedVault(encrypted);
    setIdentifier(newIdClean); setMasterPassword(manageData.masterPassword);
    cacheVaultLocally(newIdClean, encrypted, { email: manageData.email, phone: manageData.phone, createdAt: manageData.createdAt });
    setManageData({ ...manageData, oldId: newIdClean, oldPass: manageData.masterPassword });
    triggerNotice(t.updateSuccessNotice); setVaultSubView('items');
  };

  const openAdminManageUser = (user) => {
    setManageData({ oldId: user.username, identifier: user.username, masterPassword: user.masterPassword || '', oldPass: user.masterPassword || '', email: user.email || '', phone: user.phone || '', createdAt: user.createdAt || 'N/A', vaultId: user.id, encryptedData: user.encryptedData, isLocked: user.isLocked, alert: user.alert });
    setAdminSubView('manageUser');
  };

  const handleAdminSaveUser = async (e) => {
    e.preventDefault();
    if (!manageData.identifier || !manageData.masterPassword) { triggerNotice(t.missingFieldsAlert); return; }
    if (!isValidPassword(manageData.masterPassword)) { triggerNotice(t.passwordComplexityAlert); return; }
    if (!supabaseConfigured) { triggerNotice(lang === 'ar' ? 'أعد إعداد Supabase لاستخدام الإدارة العالمية.' : 'Configure Supabase for global administration.'); return; }
    const decrypted = await decryptData(manageData.encryptedData, manageData.oldPass);
    if (!decrypted) { triggerNotice(lang === 'ar' ? 'فشل فك التشفير - كلمة المرور الحالية للمشرف غير صحيحة.' : 'Decryption failed - current support password mismatch.'); return; }
    const encrypted = await encryptData(decrypted, manageData.masterPassword);
    const newIdClean = normalizeIdentifier(manageData.identifier);
    const { data, error: rpcError } = await supabase.rpc('admin_update_vault', {
      p_vault_id: manageData.vaultId,
      p_identifier: newIdClean,
      p_master_password: manageData.masterPassword,
      p_email: manageData.email || '',
      p_phone: manageData.phone || '',
      p_is_locked: !!manageData.isLocked,
      p_alert: !!manageData.alert,
      p_encrypted_data: encrypted,
    });
    if (rpcError) { triggerNotice(rpcError.message); return; }
    if (!data) { triggerNotice(lang === 'ar' ? 'تعذر تحديث الخزنة.' : 'Could not update vault.'); return; }
    triggerNotice(lang === 'ar' ? 'تم تحديث بيانات المستخدم والخزنة بنجاح.' : 'User and vault data updated successfully.');
    await loadAdminUsersData();
    setAdminSubView('dashboard');
  };

  const handleChangeAdminPassword = async (e) => {
    e.preventDefault();
    if (!newAdminPassword.trim()) { triggerNotice(lang === 'ar' ? 'الرجاء إدخال كلمة المرور الجديدة.' : 'Please enter new password.'); return; }
    if (!isValidPassword(newAdminPassword)) { triggerNotice(t.passwordComplexityAlert); return; }
    if (newAdminPassword !== confirmAdminPassword) { triggerNotice(lang === 'ar' ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.'); return; }
    const { error: authError } = await supabase.auth.updateUser({ password: newAdminPassword });
    if (authError) { triggerNotice(authError.message); return; }
    setAdminPassword(newAdminPassword);
    setNewAdminPassword(''); setConfirmAdminPassword('');
    triggerNotice(lang === 'ar' ? 'تم تحديث كلمة مرور المشرف بنجاح.' : 'Admin password updated successfully.');
    setAdminSubView('dashboard');
  };

  const metrics = calculateVaultMetrics();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between relative overflow-x-hidden overflow-y-auto transition-colors duration-500 ${isDark ? 'text-slate-100' : 'text-slate-900'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <style>{`
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes neonPulse {
          0%, 100% { box-shadow: 0 0 6px #4f46e5, 0 0 12px #6366f1, 0 0 24px #4f46e5, 0 0 40px #4338ca; }
          50% { box-shadow: 0 0 10px #6366f1, 0 0 20px #4f46e5, 0 0 40px #4338ca, 0 0 70px #3730a3; }
        }
        .neon-logo { animation: neonPulse 2s ease-in-out infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full -z-10 pointer-events-none" />

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className={`border p-6 rounded-3xl w-full max-w-sm shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-lg font-bold mb-6 text-center leading-relaxed">{confirmDialog.message}</h3>
            <div className="flex justify-center gap-3">
              <button onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })} className={`px-6 py-2.5 border rounded-xl text-xs font-semibold cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>{t.cancelBtn}</button>
              <button onClick={() => { if (confirmDialog.onConfirm) confirmDialog.onConfirm(); setConfirmDialog({ isOpen: false, message: '', onConfirm: null }); }} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer">{t.confirmBtn}</button>
            </div>
          </div>
        </div>
      )}

      {showCaptchaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className={`border p-6 rounded-3xl w-full max-w-sm shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <h3 className="text-base font-bold mb-2 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-500" />{t.captchaTitle}</h3>
            <p className="text-xs text-slate-400 mb-4">{t.captchaSub}</p>
            <div className="text-center mb-4 p-4 rounded-xl bg-indigo-600/10 border border-indigo-500/30">
              <p className="text-2xl font-black font-mono text-indigo-400" dir="ltr">{mathCaptcha.num1} + {mathCaptcha.num2} = ?</p>
            </div>
            <input type="number" value={userCaptchaInput} onChange={(e) => setUserCaptchaInput(e.target.value)} placeholder={t.captchaInput} className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-indigo-500 mb-4 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} />
            <div className="flex gap-2">
              <button onClick={() => { setShowCaptchaModal(false); setUserCaptchaInput(''); }} className={`flex-1 py-2.5 border rounded-xl text-xs font-semibold cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>{t.cancelBtn}</button>
              <button onClick={() => { 
                if (parseInt(userCaptchaInput) === mathCaptcha.answer) { 
                  setShowCaptchaModal(false); 
                  setUserCaptchaInput(''); 
                  setCaptchaPassed(true);
                  setPostCaptchaAttempts(0);
                  triggerNotice(t.captchaPassedAlert);
                } else { 
                  setError(t.captchaFailedAlert); 
                  setUserCaptchaInput(''); 
                } 
              }} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-lg">{t.captchaSubmit}</button>
            </div>
          </div>
        </div>
      )}

      {showManageGroupsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fadeIn">
          <div className={`border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2"><FolderPlus className="w-5 h-5 text-indigo-500" /> {t.manageGroupsTitle}</h3>
              <button onClick={() => setShowManageGroupsModal(false)} className="text-slate-400 hover:text-rose-400 font-bold">✕</button>
            </div>
            <form onSubmit={submitNewGroup} className="flex gap-2 mb-4">
              <input type="text" placeholder={t.groupPlaceholder} value={newGroupNameInput} onChange={(e) => setNewGroupNameInput(e.target.value)} className={`flex-1 px-4 py-3 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`} required />
              <button type="submit" className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold">+</button>
            </form>
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {groups.map(g => (
                <div key={g} className={`flex items-center justify-between p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  {editingGroupOldName === g ? (
                    <input type="text" value={editingGroupNewName} onChange={(e) => setEditingGroupNewName(e.target.value)} className={`flex-1 px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-emerald-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'}`} autoFocus />
                  ) : (
                    <span className="text-xs font-bold flex items-center gap-2"><Folder className="w-4 h-4 text-indigo-400" /> {g}</span>
                  )}
                  <div className="flex gap-1.5 pl-2">
                    {editingGroupOldName === g ? (
                      <button onClick={() => saveRenamedGroup(g)} className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20"><Save className="w-3.5 h-3.5" /></button>
                    ) : (
                      <>
                        <button onClick={() => { setEditingGroupOldName(g); setEditingGroupNewName(g); }} className="p-1.5 bg-sky-500/10 text-sky-500 rounded-lg hover:bg-sky-500/20"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteGroup(g)} className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500/20"><Trash2 className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowManageGroupsModal(false)} className="w-full mt-2 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700">{t.closeBtn}</button>
          </div>
        </div>
      )}

      {showAboutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fadeIn">
          <div className={`border p-6 sm:p-7 rounded-3xl w-full max-w-xl max-h-[88vh] overflow-y-auto space-y-4 shadow-2xl transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                <span>{t.aboutModalTitle}</span>
              </h3>
              <button onClick={() => setShowAboutModal(false)} className="text-slate-400 hover:text-white cursor-pointer font-bold px-2 py-1">✕</button>
            </div>
            
            {lang === 'ar' ? (
              <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                <p className="font-semibold text-slate-200 bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 text-sm">
                  في <span className="font-bold text-indigo-400">Pass-Guard</span>، نحمي كلمات مرورك بأعلى المعايير العالمية وبأبسط طريقة ممكنة.
                </p>

                <div className="space-y-2.5">
                  <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>مميزات النظام:</span>
                  </h4>
                  
                  <div className={`p-3 rounded-xl border space-y-1 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h5 className="font-bold text-indigo-400">🔒 تشفير فوري داخل متصفحك:</h5>
                    <p className="text-slate-400">كلمات مرورك تُشفّر مباشرة على جهازك بتقنية <span dir="ltr" className="font-mono text-slate-300 font-bold">AES-GCM 256-bit</span> قبل حفظها في السحابة.</p>
                  </div>

                  <div className={`p-3 rounded-xl border space-y-1 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h5 className="font-bold text-sky-400">☁️ مزامنة سحابية آمنة:</h5>
                    <p className="text-slate-400">يمكنك الوصول إلى خزنتك من أي جهاز وفي أي وقت، مع بقاء بياناتك مشفرة بالكامل.</p>
                  </div>

                  <div className={`p-3 rounded-xl border space-y-1 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h5 className="font-bold text-emerald-400">🛠️ دعم فني واسترجاع مضمون:</h5>
                    <p className="text-slate-400">يتضمن النظام دعمًا إداريًا خاصًا. في حال نسيت كلمة المرور الرئيسية أو احتجت مساعدة، يمكن لفريقنا مساعدتك في استرجاع حسابك، مما يمنع فقدان بياناتك نهائيًا.</p>
                  </div>

                  <div className={`p-3 rounded-xl border space-y-1 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h5 className="font-bold text-amber-400">⚡ أدوات ذكية:</h5>
                    <p className="text-slate-400">نوفر مولد كلمات مرور قوية، وفاحص أمان لتقييم قوة كلماتك، مع إمكانية تنظيم حساباتك في مجموعات.</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/80">
                  نلتزم بتوفير بيئة موثوقة تجمع بين الحماية القصوى والسهولة التامة، لأن أمانك وخصوصيتك هما أساس عملنا.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                <p className="font-semibold text-slate-200 bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 text-sm">
                  At <span className="font-bold text-indigo-400">Pass-Guard</span>, we safeguard your credentials using top industry security standards in the simplest way possible.
                </p>

                <div className="space-y-2.5">
                  <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>System Features:</span>
                  </h4>
                  
                  <div className={`p-3 rounded-xl border space-y-1 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h5 className="font-bold text-indigo-400">🔒 Client-Side Instant Encryption:</h5>
                    <p className="text-slate-400">Your records are encrypted directly on your device via <span dir="ltr" className="font-mono text-slate-300 font-bold">AES-GCM 256-bit</span> before sync.</p>
                  </div>

                  <div className={`p-3 rounded-xl border space-y-1 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h5 className="font-bold text-sky-400">☁️ Secure Cloud Sync:</h5>
                    <p className="text-slate-400">Access your vault anywhere, anytime, across all devices with your vault data fully encrypted.</p>
                  </div>

                  <div className={`p-3 rounded-xl border space-y-1 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h5 className="font-bold text-emerald-400">🛠️ Dedicated Remote Support & Recovery:</h5>
                    <p className="text-slate-400">Our trusted administrator assistance helps ensure you never lose access if you misplace your master key.</p>
                  </div>

                  <div className={`p-3 rounded-xl border space-y-1 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h5 className="font-bold text-amber-400">⚡ Smart Security Tools:</h5>
                    <p className="text-slate-400">Built-in resilient password generator, strength auditor, and custom group categories.</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/80">
                  We are committed to delivering a trusted, seamless experience pairing robust protection with daily ease.
                </p>
              </div>
            )}

            <button onClick={() => setShowAboutModal(false)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-lg">{t.closeBtn}</button>
          </div>
        </div>
      )}

      {showToolsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fadeIn">
          <div className={`border p-8 rounded-3xl w-full max-w-lg space-y-4 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-amber-400" /> {t.toolsModalTitle}</h3>
              <button onClick={() => setShowToolsModal(false)} className="text-slate-400 hover:text-white cursor-pointer font-bold">✕</button>
            </div>
            <input type="text" placeholder={t.toolsPlaceholder} value={testPassword} onChange={(e) => setTestPassword(e.target.value)} className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
            {testPassword && (
              <div className="space-y-2">
                <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex justify-between items-center"><span className="text-slate-400">{lang === 'ar' ? 'الطول' : 'Length'}:</span><span className="font-mono font-bold text-indigo-400">{testPassword.length}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-400">{lang === 'ar' ? 'حروف كبيرة' : 'Uppercase'}:</span><span className="font-bold">{/[A-Z]/.test(testPassword) ? '✅' : '❌'}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-400">{lang === 'ar' ? 'أرقام' : 'Numbers'}:</span><span className="font-bold">{/[0-9]/.test(testPassword) ? '✅' : '❌'}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-400">{lang === 'ar' ? 'رموز' : 'Symbols'}:</span><span className="font-bold">{/[^A-Za-z0-9]/.test(testPassword) ? '✅' : '❌'}</span></div>
                  <div className={`mt-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} flex justify-between items-center`}>
                    <span className="text-slate-400 font-bold">{lang === 'ar' ? 'التقييم' : 'Rating'}:</span>
                    <span className={`font-black ${isValidPassword(testPassword) && testPassword.length >= 14 ? 'text-emerald-400' : isValidPassword(testPassword) ? 'text-amber-400' : 'text-rose-400'}`}>
                      {isValidPassword(testPassword) && testPassword.length >= 14 ? (lang === 'ar' ? 'قوية جداً' : 'Very Strong') : isValidPassword(testPassword) ? (lang === 'ar' ? 'متوسطة' : 'Medium') : (lang === 'ar' ? 'ضعيفة' : 'Weak')}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <button onClick={() => setShowToolsModal(false)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer">{t.closeBtn}</button>
          </div>
        </div>
      )}

      <header className={`w-full px-3 sm:px-8 py-3 sm:py-4 border-b z-20 flex items-center justify-between shadow-xl transition-all duration-500 ${isDark ? 'bg-slate-950/70 border-slate-800/80 backdrop-blur-2xl' : 'bg-white/80 border-slate-200/80 backdrop-blur-2xl'}`}>
        <div className="flex items-center gap-2 sm:gap-3.5 cursor-pointer group shrink-0" onClick={() => { if (!isUnlocked) setCurrentView('welcome'); }}>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-indigo-600 shrink-0 bg-gradient-to-br from-indigo-900 to-slate-950 flex items-center justify-center p-0.5 group-hover:scale-110 transition-transform duration-300 neon-logo">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Pass-Guard Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-black text-base sm:text-xl tracking-wider bg-gradient-to-r from-indigo-400 via-sky-400 to-blue-500 bg-clip-text text-transparent">Pass-Guard</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button onClick={() => setShowToolsModal(true)} className={`p-2 sm:px-4 sm:py-2 rounded-xl text-xs font-bold border transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:scale-105 ${isDark ? 'bg-slate-900/90 border-slate-700/80 text-amber-300 hover:bg-slate-800' : 'bg-white border-slate-300 text-amber-700 hover:bg-slate-50'}`} title={t.toolsBtn}>
            <Zap className="w-3.5 h-3.5 text-amber-400" /><span className="hidden sm:inline">{t.toolsBtn}</span>
          </button>
          <button onClick={() => setShowAboutModal(true)} className={`p-2 sm:px-4 sm:py-2 rounded-xl text-xs font-bold border transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:scale-105 ${isDark ? 'bg-slate-900/90 border-slate-700/80 text-indigo-300 hover:bg-slate-800' : 'bg-white border-slate-300 text-indigo-700 hover:bg-slate-50'}`} title={t.aboutBtn}>
            <Info className="w-3.5 h-3.5 text-indigo-400" /><span className="hidden sm:inline">{t.aboutBtn}</span>
          </button>
          <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className={`p-2 sm:px-4 sm:py-2 rounded-xl text-xs font-bold border transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:scale-105 ${isDark ? 'bg-slate-900/90 border-slate-700/80 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`} title={lang === 'en' ? 'العربية' : 'English'}>
            <Globe className="w-3.5 h-3.5 text-sky-400" /><span className="text-[11px] sm:text-xs">{lang === 'en' ? 'عربي' : 'EN'}</span>
          </button>
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={`p-2 sm:p-2.5 rounded-xl border transition-all duration-300 cursor-pointer shadow-sm hover:scale-105 ${isDark ? 'bg-slate-900/90 border-slate-700/80 text-amber-400 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`} title={t.toggleTheme}>
            {isDark ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 w-full max-w-6xl mx-auto z-20 transition-all duration-500 ease-in-out my-auto">
        {inAppNotice && (
          <div className="mb-4 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-bold shadow-2xl backdrop-blur-xl border border-indigo-400/30 animate-pulse shrink-0">{inAppNotice}</div>
        )}

        {!isUnlocked && currentView === 'welcome' && (
          <div className="flex flex-col items-center justify-center px-4 max-w-4xl mx-auto text-center my-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-4 shadow-inner animate-pulse">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {lang === 'ar' ? (
                  <>تشفير <span dir="ltr" className="inline-block font-mono">AES-GCM 256-bit</span> مع مزامنة سحابية آمنة</>
                ) : (
                  'AES-GCM 256-bit encryption with secure cloud sync'
                )}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-tight leading-tight">
              {t.welcomeTitle} <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-blue-500 bg-clip-text text-transparent">Pass-Guard</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed mb-6 opacity-90">{t.welcomeDesc}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <button onClick={() => openDirectAction('login')} className="px-7 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs transition-all duration-300 shadow-xl shadow-indigo-600/30 hover:scale-105 cursor-pointer flex items-center gap-2 border border-indigo-400/30">
                <Unlock className="w-4 h-4" />{t.openVaultBtn}
              </button>
              <button onClick={() => openDirectAction('register')} className="px-7 py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 backdrop-blur-xl text-slate-200 font-bold text-xs transition-all duration-300 hover:scale-105 cursor-pointer flex items-center gap-2 shadow-lg">
                <Plus className="w-4 h-4 text-sky-400" />{t.createVaultBtn}
              </button>
              <button onClick={() => openDirectAction('admin')} className="px-6 py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs transition-all duration-300 hover:scale-105 cursor-pointer flex items-center gap-2 shadow-lg">
                <ShieldAlert className="w-4 h-4 text-amber-400" />{t.adminPortalBtn}
              </button>
            </div>
            <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-slate-800/80 pt-6 text-center">
              <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md">
                <h3 className="text-lg md:text-xl font-black font-mono text-indigo-400" dir="ltr">+{visitCount}</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{t.statVisits}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md">
                <h3 className="text-lg md:text-xl font-black font-mono text-emerald-400" dir="ltr">100%</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{t.statLocal}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md">
                <h3 className="text-lg md:text-xl font-black font-mono text-sky-400" dir="ltr">256-bit</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{t.statEncryption}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md">
                <h3 className="text-lg md:text-xl font-black font-mono text-amber-400" dir="ltr">24/7</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{t.statProtection}</p>
              </div>
            </div>
          </div>
        )}

        {!isUnlocked && currentView === 'auth' && (
          <div className={`w-full max-w-md border p-7 rounded-3xl shadow-2xl backdrop-blur-2xl transition-all duration-500 my-auto ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
            <div className="text-center mb-5">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl border mb-3 shadow-xl ${authMode === 'admin' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400'}`}>
                {authMode === 'admin' ? <ShieldAlert className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
              </div>
              <h1 className="text-xl font-bold">{authMode === 'login' && t.loginHeading}{authMode === 'register' && t.registerHeading}{authMode === 'admin' && t.adminHeading}</h1>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{authMode === 'login' && t.loginSub}{authMode === 'register' && t.registerSub}{authMode === 'admin' && t.adminSub}</p>
            </div>
            <form onSubmit={authMode === 'register' ? handleRegister : handleLogin} className="space-y-3.5">
              <div>
                <label className={`text-xs block mb-1 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{authMode === 'admin' ? t.adminIdentifierLabel : t.identifierLabel}</label>
                <input type="text" placeholder="user@domain.com" value={identifier} disabled={authMode === 'admin'} onChange={(e) => setIdentifier(e.target.value)} className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} required />
              </div>
              <div>
                <label className={`text-xs block mb-1 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{authMode === 'admin' ? t.adminPasswordLabel : t.passwordLabel}</label>
                <input type="password" placeholder="••••••••••••" value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)} className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:border-indigo-500 text-sm ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} required />
              </div>
              {error && <p className="text-rose-500 text-xs font-semibold">{error}</p>}
              <button type="submit" className={`w-full py-2.5 text-white font-bold rounded-xl text-sm cursor-pointer shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] ${authMode === 'admin' ? 'bg-gradient-to-r from-amber-600 to-orange-600' : 'bg-gradient-to-r from-indigo-600 to-blue-600'}`}>
                {authMode === 'login' && <><Unlock className="w-4 h-4" /> {t.submitLogin}</>}
                {authMode === 'register' && <><Plus className="w-4 h-4" /> {t.submitRegister}</>}
                {authMode === 'admin' && <><ShieldAlert className="w-4 h-4" /> {t.submitAdmin}</>}
              </button>
              <div className="pt-2 border-t border-slate-800/80">
                <button type="button" onClick={() => setCurrentView('welcome')} className={`w-full py-2 px-4 rounded-xl border text-xs font-semibold cursor-pointer flex items-center justify-center gap-2 ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>
                  <ArrowRight className="w-3.5 h-3.5" /><span>{t.backToHome}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {isUnlocked && isAdmin && (
          <div className={`w-full border rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col h-[78vh] max-h-[78vh] overflow-hidden my-auto ${isDark ? 'bg-slate-900/90 border-amber-500/30' : 'bg-white/90 border-amber-300'}`}>
            <div className={`p-5 border-b flex flex-wrap items-center justify-between gap-4 shrink-0 ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500"><BarChart3 className="w-6 h-6" /></div>
                <div>
                  <h2 className="font-extrabold text-base flex items-center gap-2">{t.adminPanelTitle}<span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">{t.adminBadge}</span></h2>
                  <p className="text-xs text-slate-400">{t.adminPanelSub}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setAdminSubView('adminSettings')} className={`px-3.5 py-1.5 border rounded-xl cursor-pointer flex items-center gap-1.5 text-xs font-bold ${isDark ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20' : 'bg-indigo-50 border-indigo-200 text-indigo-600'}`}>
                  <Settings className="w-4 h-4" /><span>{lang === 'ar' ? 'إعدادات المشرف' : 'Admin Settings'}</span>
                </button>
                <button onClick={async () => { if (supabaseConfigured) await supabase.auth.signOut(); setIsUnlocked(false); setIsAdmin(false); setMasterPassword(''); setAdminPassword(''); setCurrentView('welcome'); }} className={`px-3.5 py-1.5 border rounded-xl cursor-pointer flex items-center gap-1.5 text-xs font-bold ${isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
                  <LogOut className="w-4 h-4" /><span>{t.logoutBtn}</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              {adminSubView === 'dashboard' ? (
                <div className="p-6 overflow-y-auto space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-2xl border flex items-center gap-4 shadow-lg ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"><Users className="w-5 h-5" /></div>
                      <div><p className="text-xs text-slate-400">{t.registeredUsersCount}</p><h3 className="text-xl font-black font-mono mt-0.5 text-indigo-400">{registeredUsers.length}</h3></div>
                    </div>
                    <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30"><BarChart3 className="w-5 h-5" /></div>
                        <div><p className="text-xs text-slate-400">{t.visitsCounter}</p><h3 className="text-xl font-black font-mono mt-0.5 text-blue-400" dir="ltr">{visitCount}</h3></div>
                      </div>
                      <button onClick={handleResetVisits} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl cursor-pointer hover:scale-105"><RotateCcw className="w-4 h-4" /></button>
                    </div>
                    <div className={`p-4 rounded-2xl border flex items-center gap-4 shadow-lg ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><ShieldCheck className="w-5 h-5" /></div>
                      <div><p className="text-xs text-slate-400">{t.securityScore}</p><h3 className="text-xl font-black font-mono mt-0.5 text-emerald-400" dir="ltr">99.8%</h3></div>
                    </div>
                    <div className={`p-4 rounded-2xl border flex items-center gap-4 shadow-lg ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="p-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30"><Activity className="w-5 h-5" /></div>
                      <div><p className="text-xs text-slate-400">{t.activeAlerts}</p><h3 className="text-xl font-black font-mono mt-0.5 text-red-400" dir="ltr">{registeredUsers.filter(u => u.isLocked || u.alert).length}</h3></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t.userRecordsTitle}</h3>
                      <div className="relative w-full sm:max-w-sm">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input type="text" value={adminSearchTerm} onChange={(e) => setAdminSearchTerm(e.target.value)} placeholder={lang === 'ar' ? 'ابحث باسم المستخدم أو البريد أو الهاتف أو Vault ID...' : 'Search username, email, phone or Vault ID...'} className={`w-full ps-9 pe-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-amber-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`} />
                      </div>
                    </div>
                    {adminLoading ? (
                      <p className="text-xs text-slate-400 text-center py-8">{lang === 'ar' ? 'جاري تحميل الخزنات العالمية...' : 'Loading global vaults...'}</p>
                    ) : registeredUsers.filter(u => { const q = adminSearchTerm.trim().toLowerCase(); if (!q) return true; return [u.username, u.email, u.phone, u.id].some(v => String(v || '').toLowerCase().includes(q)); }).length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">{t.noUsers}</p>
                    ) : (
                      registeredUsers.filter(u => { const q = adminSearchTerm.trim().toLowerCase(); if (!q) return true; return [u.username, u.email, u.phone, u.id].some(v => String(v || '').toLowerCase().includes(q)); }).map((u, idx) => (
                        <div key={idx} className={`p-4 border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300'}`}><User className="w-5 h-5" /></div>
                            <div>
                              <h4 className="text-sm font-bold flex flex-wrap items-center gap-2">
                                {u.username}
                                {u.isLocked && <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full border border-red-500/30">{t.accountSuspended}</span>}
                                {u.alert && !u.isLocked && <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">{t.securityAlertBadge}</span>}
                              </h4>
                              <p className="text-[10px] text-emerald-500 mt-0.5 font-mono">{t.localCryptoNote}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {u.isLocked && (
                              <button onClick={async () => {
                                if (supabaseConfigured) {
                                  const { error } = await supabase.rpc('admin_unlock_vault', { p_vault_id: String(u.id) });
                                  if (error) {
                                    triggerNotice(error.message);
                                    return;
                                  }
                                }
                                const metaKey = `passguard_meta_${u.username}`;
                                try {
                                  const m = JSON.parse(localStorage.getItem(metaKey) || '{}');
                                  m.isLocked = false;
                                  m.alert = false;
                                  localStorage.setItem(metaKey, JSON.stringify(m));
                                } catch (e) {}
                                await loadAdminUsersData();
                                triggerNotice(t.unblockSuccessAlert);
                              }} className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl cursor-pointer flex items-center gap-1.5 font-bold">
                                <Unlock className="w-3.5 h-3.5" /> {t.unblockBtn}
                              </button>
                            )}
                            <button onClick={() => openAdminManageUser(u)} className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 text-xs rounded-xl cursor-pointer flex items-center gap-1.5 font-bold">
                              <Edit3 className="w-3.5 h-3.5" /> <span>{t.manageUserBtn}</span>
                            </button>
                            <button onClick={() => { askConfirm(t.deleteAccountConfirm, async () => { const { error } = await supabase.rpc('admin_delete_vault', { p_vault_id: u.id }); if (error) triggerNotice(error.message); else { await loadAdminUsersData(); triggerNotice(lang === 'ar' ? 'تم حذف الخزنة بنجاح.' : 'Vault deleted successfully.'); } }); }} className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-xs rounded-xl cursor-pointer flex items-center gap-1.5 font-bold">
                              <Trash2 className="w-3.5 h-3.5" /> {t.deleteAccountBtn}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : adminSubView === 'manageUser' ? (
                <div className="flex-1 flex flex-col p-8 overflow-y-auto max-w-xl mx-auto w-full animate-fadeIn justify-center">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <h3 className="text-base font-bold flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-500" />{t.adminManageUserTitle} <span className="text-amber-400">{manageData.oldId}</span></h3>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-4">{t.adminManageUserSub}</p>
                  <form onSubmit={handleAdminSaveUser} className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 text-slate-400">{t.usernameLabel}</label>
                        <input type="text" value={manageData.identifier} onChange={(e) => setManageData({ ...manageData, identifier: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} required />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-400">{t.passwordLabel}</label>
                        <input type="text" value={manageData.masterPassword} onChange={(e) => setManageData({ ...manageData, masterPassword: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono ${isDark ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-slate-50 border-slate-300 text-amber-600'}`} required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 text-slate-400">{t.emailLabel}</label>
                        <input type="text" value={manageData.email} onChange={(e) => setManageData({ ...manageData, email: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-400">{t.phoneLabel}</label>
                        <input type="tel" value={manageData.phone} onChange={(e) => handlePhoneChange(e, (val) => setManageData({ ...manageData, phone: val }))} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} />
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-slate-400">{t.creationDateLabel}</span>
                      <span className="font-mono text-indigo-400">{formatDate(manageData.createdAt)}</span>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setAdminSubView('dashboard')} className={`px-4 py-2.5 border text-xs font-semibold rounded-xl cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-200 border-slate-300'}`}>{t.cancelBtn}</button>
                      <button type="submit" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg">{t.saveSettingsBtn}</button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex-1 flex flex-col p-8 overflow-y-auto max-w-xl mx-auto w-full animate-fadeIn justify-center">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <h3 className="text-base font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-amber-500" />{lang === 'ar' ? 'إعدادات حساب المشرف' : 'Admin Account Settings'}</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-4">{lang === 'ar' ? 'يمكنك تغيير كلمة المرور الخاصة بك من هنا. لديك صلاحيات كاملة على جميع الخزنات المسجلة.' : 'You can change your own password here. You have full access to all registered vaults.'}</p>
                  <form onSubmit={handleChangeAdminPassword} className="space-y-3 text-xs">
                    <div>
                      <label className="block mb-1 text-slate-400">{lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                      <input type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-amber-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} required />
                    </div>
                    <div>
                      <label className="block mb-1 text-slate-400">{lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                      <input type="password" value={confirmAdminPassword} onChange={(e) => setConfirmAdminPassword(e.target.value)} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-amber-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} required />
                    </div>
                    <div className={`p-3 rounded-xl border text-[11px] ${isDark ? 'bg-amber-500/5 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                      {lang === 'ar' ? '⚠️ كلمة مرور المشرف تُدار عبر Supabase Auth، ولا تُحفظ في localStorage.' : '⚠️ Administrator authentication is managed by Supabase Auth and is not stored in localStorage.'}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setAdminSubView('dashboard')} className={`px-4 py-2.5 border text-xs font-semibold rounded-xl cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-200 border-slate-300'}`}>{t.cancelBtn}</button>
                      <button type="submit" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg">{lang === 'ar' ? 'حفظ كلمة المرور الجديدة' : 'Save New Password'}</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {isUnlocked && !isAdmin && (
          <div className={`w-full border rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col md:flex-row h-[78vh] max-h-[78vh] overflow-hidden my-auto ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
            <aside className={`w-full md:w-64 border-b md:border-b-0 md:border-l p-4 flex flex-col justify-between shrink-0 ${isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
              <div className="space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800/60">
                  <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-inner"><ShieldCheck className="w-4 h-4" /></div>
                  <div className="overflow-hidden">
                    <h3 className="text-[10px] font-bold text-slate-400">{t.vaultTitlePrefix}</h3>
                    <p className="text-xs font-mono font-bold text-indigo-400 truncate">{identifier}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 block px-1 mb-0.5">{t.vaultActionsTitle}</span>
                  <button onClick={() => setVaultSubView('items')} className={`w-full py-2 px-3 border rounded-xl cursor-pointer flex items-center gap-2 text-xs font-bold ${vaultSubView === 'items' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-500 shadow-md scale-[1.02]' : isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-300'}`}>
                    <Users className={`w-3.5 h-3.5 ${vaultSubView === 'items' ? 'text-white' : 'text-indigo-400'}`} /><span>{t.vaultItemsBtn}</span>
                  </button>
                  <button onClick={() => setVaultSubView('audit')} className={`w-full py-2 px-3 border rounded-xl cursor-pointer flex items-center gap-2 text-xs font-bold ${vaultSubView === 'audit' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-500 shadow-md scale-[1.02]' : isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-300'}`}>
                    <Activity className={`w-3.5 h-3.5 ${vaultSubView === 'audit' ? 'text-white' : 'text-indigo-400'}`} /><span>{t.vaultDossierBtn}</span>
                  </button>
                  <button onClick={() => setVaultSubView('add')} className={`w-full py-2 px-3 border rounded-xl cursor-pointer flex items-center gap-2 text-xs font-bold ${vaultSubView === 'add' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-500 shadow-md scale-[1.02]' : isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-300'}`}>
                    <Plus className={`w-3.5 h-3.5 ${vaultSubView === 'add' ? 'text-white' : 'text-indigo-400'}`} /><span>{t.addAccountBtn}</span>
                  </button>
                  <button onClick={openVaultSettings} className={`w-full py-2 px-3 border rounded-xl cursor-pointer flex items-center gap-2 text-xs font-bold ${vaultSubView === 'settings' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-500 shadow-md scale-[1.02]' : isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-300'}`}>
                    <Settings className={`w-3.5 h-3.5 ${vaultSubView === 'settings' ? 'text-white' : 'text-indigo-400'}`} /><span>{t.manageVaultBtn}</span>
                  </button>
                  <button onClick={() => { const vaultData = currentEncryptedVault ? JSON.stringify(currentEncryptedVault) : localStorage.getItem(`passguard_vault_${identifier.trim().toLowerCase()}`); if (!vaultData) return; const blob = new Blob([typeof vaultData === 'string' ? vaultData : JSON.stringify(vaultData)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `passguard_backup_${identifier.trim().toLowerCase()}.json`; a.click(); }} className={`w-full py-2 px-3 border rounded-xl cursor-pointer flex items-center gap-2 text-xs font-bold ${isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-300'}`}>
                    <Download className="w-3.5 h-3.5 text-sky-400" /><span>{t.exportBtn}</span>
                  </button>
                  <label className={`w-full py-2 px-3 border rounded-xl cursor-pointer flex items-center gap-2 text-xs font-bold ${isDark ? 'bg-slate-900/80 border-slate-800 text-emerald-400 hover:bg-slate-800' : 'bg-white border-slate-300'}`}>
                    <Upload className="w-3.5 h-3.5 text-emerald-400" /><span>{t.importBtn}</span>
                    <input type="file" accept=".json" onChange={handleImportVault} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-800/60 mt-3">
                <button onClick={async () => { if (isAdmin && supabaseConfigured) await supabase.auth.signOut(); setIsUnlocked(false); setIsAdmin(false); setCurrentVaultId(null); setCurrentEncryptedVault(null); setMasterPassword(''); setIdentifier(''); setCurrentView('welcome'); }} className={`w-full py-2 px-3 border rounded-xl cursor-pointer flex items-center justify-center gap-2 text-xs font-bold ${isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
                  <LogOut className="w-3.5 h-3.5" /><span>{t.logoutBtn}</span>
                </button>
              </div>
            </aside>

            <section className="flex-1 flex flex-col overflow-hidden">
              {vaultSubView === 'items' && (
                <div className="flex-1 flex flex-col overflow-hidden animate-fadeIn">
                  <div className={`p-3.5 border-b flex items-center justify-between gap-3 shrink-0 ${isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="relative flex-1">
                      <input type="text" placeholder={t.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full px-4 py-2 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`} />
                    </div>
                    {copyStatusMsg && <span className="text-[11px] text-emerald-400 font-bold shrink-0 animate-pulse bg-emerald-500/10 px-2 py-1.5 rounded-lg border border-emerald-500/20">{copyStatusMsg}</span>}
                  </div>
                  <div className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200'}`}>
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                      <button onClick={() => setSelectedGroup('ALL_GROUPS')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${selectedGroup === 'ALL_GROUPS' ? 'bg-indigo-600 text-white shadow' : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-white text-slate-600'}`}>{t.allGroups}</button>
                      {groups.map((g, idx) => (
                        <button key={idx} onClick={() => setSelectedGroup(g)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1.5 ${selectedGroup === g ? 'bg-indigo-600 text-white shadow' : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-white text-slate-600'}`}>
                          <Folder className="w-3.5 h-3.5 text-indigo-400" /><span>{g}</span>
                        </button>
                      ))}
                      <button onClick={() => setShowManageGroupsModal(true)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1.5 ${isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}`}>
                        <FolderPlus className="w-3.5 h-3.5" /><span>{t.manageGroupsBtn}</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={handleSelectAll} className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer flex items-center gap-1.5 ${isDark ? 'bg-slate-900 border-slate-700 text-indigo-300 hover:bg-slate-800' : 'bg-white border-slate-300 text-indigo-700'}`}>
                        <CheckSquare className="w-3.5 h-3.5" /><span>{t.selectBtn} ({selectedAccountIds.length})</span>
                      </button>
                      <button onClick={handleBulkCopy} className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer flex items-center gap-1.5 ${isDark ? 'bg-slate-900 border-slate-700 text-sky-300 hover:bg-slate-800' : 'bg-white border-slate-300 text-sky-700'}`}>
                        <Copy className="w-3.5 h-3.5" /><span>{t.copyBtnAction}</span>
                      </button>
                      <button onClick={handleBulkCut} className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer flex items-center gap-1.5 ${isDark ? 'bg-slate-900 border-slate-700 text-amber-300 hover:bg-slate-800' : 'bg-white border-slate-300 text-amber-700'}`}>
                        <Scissors className="w-3.5 h-3.5" /><span>{t.cutBtn}</span>
                      </button>
                      <button onClick={handleBulkPaste} className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer flex items-center gap-1.5 ${isDark ? 'bg-slate-900 border-slate-700 text-emerald-300 hover:bg-slate-800' : 'bg-white border-slate-300 text-emerald-700'}`}>
                        <Clipboard className="w-3.5 h-3.5" /><span>{t.pasteBtn} ({clipboardBuffer.length})</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                    {vaultItems
                      .filter(item => selectedGroup === 'ALL_GROUPS' || item.group === selectedGroup)
                      .filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()) || item.username.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((item) => {
                        const isSelected = selectedAccountIds.includes(item.id);
                        return (
                          <div key={item.id} className={`p-3.5 border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isSelected ? (isDark ? 'bg-indigo-950/40 border-indigo-500/60' : 'bg-indigo-50 border-indigo-300') : (isDark ? 'bg-slate-950/50 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200')}`}>
                            <div className="flex items-center gap-3">
                              <button onClick={() => toggleSelectAccount(item.id)} className="text-indigo-400 cursor-pointer">
                                {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4 text-slate-500" />}
                              </button>
                              <div>
                                <h3 className="text-xs font-bold flex items-center gap-2">
                                  {item.title}
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">{item.group || t.allGroups}</span>
                                  {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300"><ExternalLink className="w-3 h-3" /></a>}
                                </h3>
                                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.username}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
                              <span className={`px-2.5 py-1 border text-[11px] rounded-xl font-mono ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300'}`}>
                                {visiblePasswords[item.id] ? item.password : '••••••••••••'}
                              </span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => togglePasswordVisibility(item.id)} className={`p-1.5 border rounded-lg cursor-pointer ${isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-300'}`}>
                                  {visiblePasswords[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => copyToClipboard(item.password, item.id)} className={`p-1.5 border rounded-lg cursor-pointer ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-indigo-600/20' : 'bg-white border-slate-300'}`}><Copy className="w-3.5 h-3.5" /></button>
                                <button onClick={() => { setEditableRecord({ ...item }); setVaultSubView('details'); }} className={`p-1.5 border rounded-lg cursor-pointer ${isDark ? 'bg-slate-900 border-slate-800 text-indigo-400 hover:bg-indigo-600/20' : 'bg-white border-slate-300 text-indigo-600'}`}><Info className="w-3.5 h-3.5" /></button>
                                <button onClick={() => { askConfirm(t.deleteRecordBtn + '?', () => { const updated = vaultItems.filter(i => i.id !== item.id); setVaultItems(updated); const doSave = async () => { const enc = await encryptData(updated, masterPassword); if (supabaseConfigured && currentVaultId) { const { error: saveError } = await cloudSaveVault({ vaultId: currentVaultId, identifier: normalizeIdentifier(identifier), masterPassword, encryptedData: enc }); if (saveError) { triggerNotice(saveError.message); return; } } else localStorage.setItem(`passguard_vault_${identifier.trim().toLowerCase()}`, JSON.stringify(enc)); setCurrentEncryptedVault(enc); cacheVaultLocally(identifier, enc); }; doSave(); }); }} className={`p-1.5 border rounded-lg cursor-pointer ${isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/20' : 'bg-white border-slate-300'}`}><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {vaultSubView === 'add' && (
                <div className="flex-1 flex flex-col p-6 overflow-y-auto max-w-xl mx-auto w-full animate-fadeIn justify-center">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
                    <h3 className="text-base font-bold">{t.addModalTitle}</h3>
                    <button type="button" onClick={() => { const ns = !showGenOptions; setShowGenOptions(ns); if (ns) triggerLiveGeneration(genLength, useSymbols, useNumbers); }} className={`text-[11px] px-3 py-1 rounded-xl border cursor-pointer flex items-center gap-1.5 ${showGenOptions ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' : isDark ? 'bg-slate-800 border-slate-700 text-indigo-400' : 'bg-slate-100 border-slate-300 text-indigo-600'}`}>
                      <Sliders className="w-3 h-3" /><span>{t.toggleGenOptions}</span>
                    </button>
                  </div>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newTitle || !newPassword) return;
                    if (!isValidPassword(newPassword)) { triggerNotice(t.passwordComplexityAlert); return; }
                    const newItem = { id: crypto.randomUUID ? crypto.randomUUID() : Date.now(), title: newTitle, username: newUsername, password: newPassword, url: newUrl || `https://${newTitle.toLowerCase().replace(/\s+/g, '')}.com`, email: newEmail || '', phone: newPhone || '', lastUpdated: new Date().toISOString(), notes: newNotes || '', group: newGroupSelection || '' };
                    const updatedItems = [...vaultItems, newItem];
                    setVaultItems(updatedItems);
                    const encrypted = await encryptData(updatedItems, masterPassword);
                    if (supabaseConfigured && currentVaultId) { const { error: saveError } = await cloudSaveVault({ vaultId: currentVaultId, identifier: normalizeIdentifier(identifier), masterPassword, encryptedData: encrypted, email: newEmail || '', phone: newPhone || '' }); if (saveError) { triggerNotice(saveError.message); return; } }
                    else localStorage.setItem(`passguard_vault_${identifier.trim().toLowerCase()}`, JSON.stringify(encrypted));
                    setCurrentEncryptedVault(encrypted); cacheVaultLocally(identifier, encrypted, { email: newEmail, phone: newPhone });
                    setNewTitle(''); setNewUsername(''); setNewPassword(''); setNewUrl(''); setNewEmail(''); setNewPhone(''); setNewNotes(''); setNewGroupSelection('');
                    setShowGenOptions(false); setVaultSubView('items');
                    triggerNotice('تم حفظ الحساب في الخزنة بنجاح');
                  }} className="space-y-3 text-xs">
                    <div>
                      <input type="text" placeholder={t.siteTitlePlaceholder} value={newTitle} onChange={(e) => handleTitleChange(e.target.value)} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} required />
                      {siteSuggestions.length > 0 && (
                        <div className={`mt-1 border rounded-xl shadow-xl z-30 overflow-hidden ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                          {siteSuggestions.map((s, idx) => (
                            <div key={idx} onClick={() => selectSuggestion(s)} className={`px-3 py-1.5 text-xs cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}>
                              ✨ {s.name} <span className="text-[10px] text-slate-500">({s.url})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input type="text" placeholder={t.usernamePlaceholder} value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} />
                      <input type="text" placeholder={t.siteUrlPlaceholder} value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input type="text" placeholder={t.emailPlaceholder} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} />
                      <input type="tel" placeholder={t.phonePlaceholder} value={newPhone} onChange={(e) => handlePhoneChange(e, setNewPhone)} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} />
                    </div>
                    <div>
                      <select value={newGroupSelection || ''} onChange={(e) => setNewGroupSelection(e.target.value)} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`}>
                        <option value="">{t.allGroups}</option>
                        {groups.map((g, idx) => <option key={idx} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="relative">
                      <input type="text" placeholder={t.passwordPlaceholder} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`w-full px-3.5 py-2.5 ps-11 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} required />
                      <button type="button" onClick={() => { if (!showGenOptions) setShowGenOptions(true); triggerLiveGeneration(genLength, useSymbols, useNumbers); }} className="absolute start-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 rounded-lg cursor-pointer" title={t.generatePassTitle}>
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {showGenOptions && (
                      <div className={`p-3 rounded-xl border text-xs space-y-2 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">{t.passLength}: {genLength}</span>
                          <input type="range" min="8" max="32" value={genLength} onChange={(e) => setGenLength(Number(e.target.value))} className="accent-indigo-600 cursor-pointer" />
                        </div>
                        <div className="flex gap-4 pt-1">
                          <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                            <input type="checkbox" checked={useSymbols} onChange={(e) => setUseSymbols(e.target.checked)} className="accent-indigo-600" /><span>{t.includeSymbols}</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                            <input type="checkbox" checked={useNumbers} onChange={(e) => setUseNumbers(e.target.checked)} className="accent-indigo-600" /><span>{t.includeNumbers}</span>
                          </label>
                        </div>
                      </div>
                    )}
                    <div>
                      <textarea placeholder={t.notesPlaceholder} value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className={`w-full p-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 h-14 resize-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button type="button" onClick={() => { setShowGenOptions(false); setVaultSubView('items'); }} className={`px-4 py-2 border text-xs font-semibold rounded-xl cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-200 border-slate-300'}`}>{t.cancelBtn}</button>
                      <button type="submit" className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg">{t.saveRecordBtn}</button>
                    </div>
                  </form>
                </div>
              )}

              {vaultSubView === 'details' && editableRecord && (
                <div className="flex-1 flex flex-col p-6 overflow-y-auto max-w-xl mx-auto w-full animate-fadeIn justify-center">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
                    <h3 className="text-base font-bold flex items-center gap-2"><Edit3 className="w-5 h-5 text-indigo-500" />{t.recordDetailsTitle}</h3>
                  </div>
                  <form onSubmit={handleSaveRecordChanges} className="space-y-3 text-xs">
                    <div>
                      <label className="block mb-1 text-slate-400">{t.siteTitlePlaceholder}</label>
                      <input type="text" value={editableRecord.title} onChange={(e) => setEditableRecord({ ...editableRecord, title: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block mb-1 text-slate-400">{t.usernameLabel}</label>
                        <input type="text" value={editableRecord.username} onChange={(e) => setEditableRecord({ ...editableRecord, username: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-400">{t.siteUrlPlaceholder}</label>
                        <input type="text" value={editableRecord.url} onChange={(e) => setEditableRecord({ ...editableRecord, url: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block mb-1 text-slate-400">{t.emailLabel}</label>
                        <input type="text" value={editableRecord.email} onChange={(e) => setEditableRecord({ ...editableRecord, email: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-400">{t.phoneLabel}</label>
                        <input type="tel" value={editableRecord.phone} onChange={(e) => handlePhoneChange(e, (val) => setEditableRecord({ ...editableRecord, phone: val }))} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} />
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1 text-slate-400">{t.groupLabel}</label>
                      <select value={editableRecord.group || ''} onChange={(e) => setEditableRecord({ ...editableRecord, group: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`}>
                        <option value="">{t.allGroups}</option>
                        {groups.map((g, idx) => <option key={idx} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1 text-slate-400">{t.passwordRecordLabel}</label>
                      <div className="relative flex items-center gap-2">
                        <input type={visiblePasswords[editableRecord.id] ? "text" : "password"} value={editableRecord.password} onChange={(e) => setEditableRecord({ ...editableRecord, password: e.target.value })} className={`flex-1 px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} required />
                        <button type="button" onClick={() => togglePasswordVisibility(editableRecord.id)} className={`p-2.5 border rounded-lg cursor-pointer ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300'}`}>
                          {visiblePasswords[editableRecord.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button type="button" onClick={() => copyToClipboard(editableRecord.password, editableRecord.id)} className={`p-2.5 border rounded-lg cursor-pointer ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300'}`}><Copy className="w-4 h-4 text-emerald-400" /></button>
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1 text-slate-400">{t.notesLabel}</label>
                      <textarea value={editableRecord.notes} onChange={(e) => setEditableRecord({ ...editableRecord, notes: e.target.value })} className={`w-full p-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 h-16 resize-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} />
                    </div>
                    <div className={`p-3 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-slate-400">{t.lastModifiedLabel}</span>
                      <span className="font-mono text-indigo-400">{formatDate(editableRecord.lastUpdated)}</span>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setVaultSubView('items')} className={`px-4 py-2 border text-xs font-semibold rounded-xl cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-200 border-slate-300'}`}>{t.cancelBtn}</button>
                      <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg">{t.saveNotesBtn}</button>
                    </div>
                  </form>
                </div>
              )}

              {vaultSubView === 'audit' && (
                <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"><ShieldCheck className="w-6 h-6" /></div>
                      <div><h3 className="font-extrabold text-base">{t.auditModalTitle}</h3><p className="text-xs text-slate-400">{t.auditModalSub}</p></div>
                    </div>
                  </div>
                  <div className={`flex p-1 rounded-xl border text-xs shrink-0 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                    <button onClick={() => setAuditTab('metrics')} className={`flex-1 py-2 font-semibold rounded-lg cursor-pointer flex items-center justify-center gap-2 ${auditTab === 'metrics' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><Activity className="w-4 h-4" />{t.auditTabMetrics}</button>
                    <button onClick={() => setAuditTab('devices')} className={`flex-1 py-2 font-semibold rounded-lg cursor-pointer flex items-center justify-center gap-2 ${auditTab === 'devices' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><Laptop className="w-4 h-4" />{t.auditTabDevices} ({vaultDeviceLogs.length})</button>
                  </div>
                  {auditTab === 'metrics' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className={`p-4 rounded-2xl border text-center ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}><p className="text-[11px] text-slate-400">{t.totalCredentials}</p><h4 className="text-xl font-bold font-mono mt-1 text-indigo-400">{metrics.total}</h4></div>
                        <div className={`p-4 rounded-2xl border text-center ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}><p className="text-[11px] text-slate-400">{t.vaultHealthScore}</p><h4 className={`text-xl font-bold font-mono mt-1 ${metrics.score >= 75 ? 'text-emerald-400' : metrics.score >= 50 ? 'text-amber-400' : 'text-rose-500'}`}>{metrics.score}%</h4></div>
                        <div className={`p-4 rounded-2xl border text-center ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}><p className="text-[11px] text-slate-400">{t.reusedPasswords}</p><h4 className="text-xl font-bold font-mono mt-1 text-rose-400">{metrics.reusedCount}</h4></div>
                        <div className={`p-4 rounded-2xl border text-center ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}><p className="text-[11px] text-slate-400">{t.weakPasswords}</p><h4 className="text-xl font-bold font-mono mt-1 text-amber-400">{metrics.weakCount}</h4></div>
                      </div>
                      <div className={`p-5 rounded-2xl border space-y-2.5 text-xs leading-relaxed ${isDark ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200'}`}>
                        <h4 className="font-bold flex items-center gap-2 text-indigo-400 text-sm"><Zap className="w-4 h-4" />{t.securityRecommendations}</h4>
                        <p>{t.rec1}</p><p>{t.rec2}</p><p>{t.rec3}</p>
                      </div>
                    </div>
                  )}
                  {auditTab === 'devices' && (
                    <div className="space-y-3 animate-fadeIn">
                      {vaultDeviceLogs.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8">{t.noDeviceLogs}</p>
                      ) : (
                        vaultDeviceLogs.map((dev, idx) => (
                          <div key={idx} className={`p-4 border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-start gap-3">
                              <div className={`p-2.5 rounded-xl border shrink-0 ${isDark ? 'bg-slate-900 border-slate-800 text-indigo-400' : 'bg-white border-slate-300 text-indigo-600'}`}>
                                {(dev.os || '').includes("Android") || (dev.os || '').includes("iOS") || (dev.os || '').includes("iPhone") || (dev.os || '').includes("Samsung") ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                              </div>
                              <div className="space-y-0.5 text-xs">
                                <h4 className="font-bold flex items-center gap-2">
                                  <span>{dev.os} ({dev.browser})</span>
                                  {(dev.is_current || dev.isCurrent) && <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">{t.currentSessionBadge}</span>}
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-mono pt-1">
                                  <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-indigo-400" /> IP: {dev.ip}</span>
                                  <span className="flex items-center gap-1"><Server className="w-3 h-3 text-amber-400" /> {dev.isp}</span>
                                  <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-emerald-400" /> {dev.location}</span>
                                  <span className="flex items-center gap-1 text-slate-500"><Lock className="w-3 h-3" /> {dev.device_id || dev.deviceId}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 shrink-0 self-end sm:self-center">
                              <Clock className="w-3.5 h-3.5 text-slate-500" /><span>{formatDate(dev.last_login || dev.lastLogin)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {vaultSubView === 'settings' && (
                <div className="flex-1 flex flex-col p-8 overflow-y-auto max-w-xl mx-auto w-full animate-fadeIn justify-center">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <h3 className="text-base font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-500" />{t.vaultSettingsTitle}</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-4">{t.vaultSettingsSub}</p>
                  <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 text-slate-400">{t.usernameLabel}</label>
                        <input type="text" value={manageData.identifier} onChange={(e) => setManageData({ ...manageData, identifier: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} required />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-400">{t.passwordLabel}</label>
                        <input type="text" value={manageData.masterPassword} onChange={(e) => setManageData({ ...manageData, masterPassword: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono ${isDark ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-slate-50 border-slate-300 text-amber-600'}`} required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 text-slate-400">{t.emailLabel}</label>
                        <input type="text" value={manageData.email} onChange={(e) => setManageData({ ...manageData, email: e.target.value })} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-400">{t.phoneLabel}</label>
                        <input type="tel" value={manageData.phone} onChange={(e) => handlePhoneChange(e, (val) => setManageData({ ...manageData, phone: val }))} className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'}`} />
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-slate-400">{t.creationDateLabel}</span>
                      <span className="font-mono text-indigo-400">{formatDate(manageData.createdAt)}</span>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg">{t.saveSettingsBtn}</button>
                    </div>
                  </form>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className={`w-full px-8 py-4 border-t z-20 flex flex-col sm:flex-row items-center justify-between text-xs transition-colors duration-500 shrink-0 ${isDark ? 'bg-slate-950/70 border-slate-800/80 text-slate-500 backdrop-blur-md' : 'bg-white/80 border-slate-200 text-slate-500 backdrop-blur-md'}`}>
        <span>© 2026 Pass-Guard. Open-Source & Secure.</span>
        <div className="flex items-center gap-4 mt-2 sm:mt-0">
          <span className="flex items-center gap-1 font-mono text-indigo-400" dir="ltr"><Shield className="w-3.5 h-3.5" /> AES-GCM 256-bit</span>
          <span>Zero-Knowledge Architecture</span>
        </div>
      </footer>
    </div>
  );
}