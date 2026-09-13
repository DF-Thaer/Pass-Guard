# 🛡️ Pass-Guard | Secure Zero-Knowledge Password Vault

A local, client-side encrypted password manager built with **React**, **Vite**, and the **Web Crypto API**. Designed with a strict **Zero-Knowledge Architecture**, ensuring your master credentials and vault data never leave your browser unencrypted.

🔗 **Live Demo**: [https://df-thaer.github.io/Pass-Guard/](https://df-thaer.github.io/Pass-Guard/)

---

## ✨ Key Features

- **Zero-Knowledge Cryptography**: All encryption and decryption routines run locally in-memory using military-grade `AES-GCM 256-bit` and `PBKDF2` (100,000 iterations).
- **Interactive Security Auditor**: Real-time evaluation of password entropy, strength scores, and reused credential detection.
- **Categorization & Management**: Custom group tagging, multi-account actions (bulk copy, cut, paste), and search indexing.
- **Telemetry & Session Auditing**: Tracks authorized login environments, network telemetry, and detected devices.
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

## 🛠️ Local Development

Clone and run the application locally:

```bash
# Clone repository
git clone [https://github.com/DF-Thaer/Pass-Guard.git](https://github.com/DF-Thaer/Pass-Guard.git)

# Navigate to directory
cd Pass-Guard

# Install dependencies
npm install --legacy-peer-deps

# Start dev server
npm run dev