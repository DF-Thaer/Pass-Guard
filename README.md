# 🛡️ Pass-Guard | Secure Zero-Knowledge Password Vault

A local, client-side encrypted password manager built with **React**, **Vite**, and the **Web Crypto API**. Designed with a strict **Zero-Knowledge Architecture**, ensuring your master credentials and vault data never leave your browser unencrypted.

🔗 **Live Demo**: [https://df-thaer.github.io/Pass-Guard/](https://df-thaer.github.io/Pass-Guard/)

---

## ✨ Key Features

- **Zero-Knowledge Cryptography**: All encryption and decryption routines run locally in-memory using military-grade `AES-GCM 256-bit` and `PBKDF2` (100,000 iterations).
- **Interactive Security Auditor**: Real-time evaluation of password entropy, strength scores, and reused credential detection.
- **Categorization & Management**: Custom groups persist inside each encrypted vault, alongside multi-account actions (bulk copy, cut, paste) and search indexing.
- **Optimized Note Images**: JPEG, PNG, and BMP attachments are resized to at most 1920px and converted to WebP in the browser before encrypted storage. Per-note attachments remain limited to 5 MB; original images are limited to 20 MB for safe processing. PDFs, GIFs, and SVGs are preserved without conversion.
- **Telemetry & Session Auditing**: Tracks authorized login environments, network telemetry, and detected devices.
- **Revocable Cloud Sessions**: Revoke active vault sessions remotely; revoked sessions stop cloud writes.
- **Passkeys**: Optional WebAuthn second factor using device biometrics, PIN, or a security key.
- **Configurable Two-Factor Authentication**: Vault owners can disable TOTP after confirming a current code, and admins can disable it for a managed vault. Admins can also remove their own Supabase Auth MFA after code verification.
- **Encrypted Backup & Restore**: Full JSON import/export encrypted against your unique derived master key.
- **Automated CI/CD**: Seamless GitHub Pages builds powered by GitHub Actions.

---

## 🚀 Tech Stack

- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Cryptography**: Web Crypto API (Native Browser Standards)
- **Hosting**: GitHub Pages

---


## Secure Sessions And Passkeys

Cloud sessions and Passkeys require the Supabase setup below. Local-only vaults continue to work without these services, but cannot be revoked remotely.

1. Run `supabase/SECURE_SESSIONS_AND_PASSKEYS.sql` in the Supabase SQL editor after `SECURE_RECOVERY_MIGRATION.sql`.
2. Deploy the Edge Function from `supabase/functions/passkeys`.
3. Set these Edge Function secrets:

```text
PASSKEY_RP_ID=df-thaer.github.io
PASSKEY_ORIGINS=https://df-thaer.github.io,https://your-custom-domain.example
```

For local development use `PASSKEY_RP_ID=localhost` and include the exact local origin, such as `http://localhost:5173`, in `PASSKEY_ORIGINS`. The RP ID is the domain only, without `https://` or a path.

The Edge Function uses `@simplewebauthn/server` through Deno's npm compatibility. Keep `SUPABASE_SERVICE_ROLE_KEY` available only as an Edge Function secret; never place it in Vite environment variables.

## Announcements And Alternate Sign-In

After both migrations above, run `supabase/PASSGUARD_FEATURES_MIGRATION.sql` in the Supabase SQL editor. This enables admin-managed site/user announcements, retired username protection after a rename, and sign-in to the same vault with its current username, linked email, or linked phone number. It also enables theme-adaptive vault logos, which are stored inside the encrypted vault data. Re-run this migration to apply later updates to these features, then deploy the matching frontend. If you use Passkeys, redeploy the updated `supabase/functions/passkeys` Edge Function as well.
