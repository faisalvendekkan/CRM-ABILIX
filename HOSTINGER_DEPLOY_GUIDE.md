# 🚀 Hostinger Node.js Deployment Guide - Abilix CRM

This guide walks you through deploying **Abilix CRM** on **Hostinger Business Hosting**, **Cloud Hosting**, or **VPS Hosting** using the Hostinger Managed Node.js panel.

---

## 📋 Prerequisites
1. A Hostinger account with a **Business** or **Cloud** plan (which natively supports Node.js and MySQL databases).
2. A registered custom domain connected to your Hostinger plan.

---

## 🛠️ Step 1: Create a MySQL Database on Hostinger
Since SQLite files can sometimes be locked or wiped during managed container restarts, **Abilix CRM** is designed to connect dynamically to Hostinger's free native MySQL database in production:

1. Log in to your **Hostinger hPanel**.
2. Navigate to **Databases** -> **MySQL Databases**.
3. Create a new MySQL database:
   - **Database Name**: e.g., `u123456789_abilix`
   - **MySQL User**: e.g., `u123456789_faisal`
   - **Password**: *Create a strong password and save it.*
4. Click **Create**. Copy the **Database Name**, **Username**, **Host** (usually `localhost`), and **Password** details.

---

## 🌐 Step 2: Setup Node.js Application on Hostinger Panel
1. In hPanel, search for **Node.js** under the **Advanced** section or search bar.
2. Click **Create Application**.
3. Configure the Application fields:
   - **Domain**: Choose your domain (e.g., `yourdomain.com`).
   - **App Directory**: Set to your app folder (e.g., `/public_html` or `/abilix-crm`).
   - **App Version**: Select **Node.js 18.x** or **20.x**.
   - **Application Entry Point**: Set this to **`server.js`** (our Express server entrypoint).
   - **Passenger Friendly Error Pages**: Set to **Disabled** (for security).
4. Click **Create**.

---

## ⚙️ Step 3: Configure Hostinger Environment Variables
To securely connect **Abilix CRM** to your newly created MySQL database and JWT sessions, you must configure **Environment Variables** in Hostinger's Node.js dashboard:

1. Scroll down to the **Environment Variables** section in your Hostinger Node.js App Dashboard.
2. Add the following variables (one by one):

| Variable Key | Suggested Value / Description |
| :--- | :--- |
| **`PORT`** | Set to the port Hostinger specifies (or leave empty, Hostinger binds dynamically). |
| **`JWT_SECRET`** | Type a secure random string (e.g., `abilix_custom_security_key_2026`). |
| **`DB_HOST`** | Set to `localhost` (Hostinger's default internal DB host). |
| **`DB_USER`** | Paste your MySQL **Username** (e.g., `u123456789_faisal`). |
| **`DB_PASSWORD`** | Paste your MySQL **Database Password**. |
| **`DB_NAME`** | Paste your MySQL **Database Name** (e.g., `u123456789_abilix`). |
| **`DB_PORT`** | Set to `3306` (standard MySQL port). |

3. Click **Save** to apply the configuration.

---

## 📦 Step 4: Upload and Deploy the Code
Hostinger supports two simple, root-free deployment methods:

### Method A: Git Deployment (Recommended)
1. Commit the `abilix-crm` directory files to a private repository on **GitHub** (do NOT commit `.env` or `database.db` files).
2. Go to Hostinger **Git** dashboard under **Advanced**.
3. Paste the repository URL, connect your account, and set the branch to `main`.
4. Click **Deploy**. Hostinger will clone the code and automatically trigger `npm install` in the background.

### Method B: ZIP File Upload
1. Compress the contents of the `abilix-crm` folder into a ZIP file (exclude `node_modules`, `.env`, and `database.db` to keep the file small).
2. Go to Hostinger **File Manager**.
3. Upload the ZIP file directly into your application directory.
4. Extract the ZIP file in place.
5. In your **Hostinger Node.js dashboard**, scroll to the bottom and click **Run npm install**. This will download the compile-safe, pure JS packages in seconds.

---

## 🎉 Step 5: Start the App!
1. Once installation is complete, click **Start / Restart Application** in your Hostinger Node.js App Dashboard.
2. Open your domain (e.g., `https://yourdomain.com`) in your browser.
3. Solve the visual distorter **CAPTCHA**, sign in with your Faisal credentials, and enjoy your fully secure full-stack **Abilix CRM**!

---

## 🛡️ Security & Backup Recommendation
* **Daily Backups**: Ensure **Daily Backups** is enabled on your Hostinger hPanel dashboard under **Files** -> **Backups**.
* **SSL Certificate**: Hostinger provides unlimited free SSL. Under **Security** -> **SSL**, make sure your domain's SSL status is **Active** so that all password hashes and JWT tokens are transmitted over encrypted HTTPS connections.
