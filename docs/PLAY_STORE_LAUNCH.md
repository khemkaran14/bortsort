# Nutwise – launching on Google Play, step by step

This guide is for **version 1.0.0**, built **offline**: no login and no ads, everything plays on the
phone. This is the quickest, safest first launch: the Data safety answers are simply "no data
collected". Login, subscriptions and ads come in an update once the server is live (Part G).

Everything the store needs is ready in `docs/store/`: icon, feature graphic, 8 screenshots, listing
text (`listing.md`) and the privacy policy (`privacy-policy.html`).

---

## Part A – Create the app in Play Console (the screen you are on)

1. **App name:** `Nutwise`
2. **Package name:** `com.divyrs.nutwise`, then click **Check availability**.
   - It must be exactly this: the app code uses this id. It can never be changed after you create the app.
   - If Google says it is taken, stop and tell Claude; the code must be changed to the new id.
3. **Default language:** English (United States) – en-US.
4. **App or game:** **Game**.
5. **Free or paid:** **Free**. (A free app can never become paid later; in-app purchases are still allowed.)
6. **Declarations:** tick
   - Developer Program Policies,
   - Play App Signing terms (if shown),
   - US export laws.
7. Click **Create app**. You land on the app's **Dashboard**.

---

## Part B – Build the release file (.aab) on your Mac

You need **Android Studio** (latest) installed. It includes the Java (JDK) it needs.

1. Open Terminal in the `bortsort` folder and get the latest code:
   ```bash
   git pull
   ```
   ```bash
   npm install
   ```
2. **Offline build:** open `packages/game/.env` (if it exists) and make sure `VITE_API_URL=` is
   **empty** (or delete the file). Release builds ignore any non-https address anyway.
3. Build and open the Android project:
   ```bash
   npm run android
   ```
   Android Studio opens `apps/mobile/android`. Wait until "Gradle sync" finishes (bottom bar).
4. **Test it on your phone first:** connect your Android phone by USB (Developer options → USB
   debugging on), pick it in the device list, press the green ▶ Run button. Play a few levels and puzzles.
5. **Create the upload key and the signed bundle:** menu **Build → Generate Signed App Bundle or APK…**
   1. Choose **Android App Bundle** → Next.
   2. Under _Key store path_ click **Create new…**
      - Key store path: a folder **outside the project**, e.g. `~/keys/nutwise-upload.jks`
      - Password: a strong password (write it down)
      - Alias: `upload`; key password: (you can reuse the same password)
      - Validity (years): **25** or more
      - Certificate: your name, organisation "Divyrs Systems", city, state, country code `IN`
      - OK
   3. Tick **Remember passwords** only if this is your own computer → Next.
   4. Build variant: **release** → **Create**.
   5. When done, click **locate**. The file is `apps/mobile/android/app/release/app-release.aab`.
6. **Back up the key:** copy `nutwise-upload.jks` and its passwords to two safe places (e.g. a
   password manager + a private USB drive). Never put it in GitHub. Google keeps the _app signing_ key
   (Part E); this _upload_ key can be reset through Google support if lost, but that takes days.

> Next updates: raise `versionCode` (1 → 2 → 3 …) and `versionName` (1.0.1 …) in
> `apps/mobile/android/app/build.gradle`, then repeat step 5 with the same key.

---

## Part C – Store settings and policy pages (Dashboard → "Set up your app")

Do each task in the list; each has its own **Save** button.

### C1. App access

- Select **All functionality in my app is available without any access restrictions** → Save.

### C2. Ads

- **No, my app does not contain ads** (true for 1.0.0) → Save.

### C3. Content rating

1. **Start questionnaire**. Email: your support email. Category: **Game**.
2. Answer:
   - Violence: **No** to all
   - Fear / horror: **No**
   - Sexuality / nudity: **No**
   - Language (bad words): **No**
   - Controlled substances (drugs, alcohol, tobacco): **No**
   - Crude humour: **No**
   - Gambling / simulated gambling: **No** (coins are earned in the game and cannot be bought or cashed out)
   - Users can interact or exchange content with each other: **No**
   - Shares the user's current location: **No**
   - Allows users to purchase digital goods: **No** (for 1.0.0)
   - Unrestricted internet access / web browser: **No**
   - "Is this a game or app that shows… AI generated content": **No**
3. **Save → Next → Submit**. Expected rating: **Everyone / 3+ / PEGI 3**.

### C4. Target audience and content

1. Target age groups: tick **13–15**, **16–17**, **18 and over**.
   - Why not under 13: picking children's ages puts the app under Google's _Families_ policy, which
     restricts ads and logins you plan to add. You can add younger ages later.
2. "Could your store listing unintentionally appeal to children?" → **No** (listing text and graphics
   don't target children).
3. Save.

### C5. News app → **No**. Save.

### C6. COVID-19 contact tracing / status apps → **My app is not…**. Save.

### C7. Government apps → **No**. Save.

### C8. Financial features → **My app doesn't provide any financial features**. Save.

### C9. Health → **My app does not have any health features**. Save.

### C10. Data safety (1.0.0 offline build)

1. "Does your app collect or share any of the required user data types?" → **No**.
   (Progress and settings stay on the phone; reminders are created on the phone.)
2. Next → Save. The summary shows "No data collected / No data shared".
   - If the form also asks about account creation: **My app does not allow users to create an account**.

### C11. Advertising ID

- "Does your app use advertising ID?" → **No**.
  (Facebook login is switched off in `capacitor.config.json`, so the AD_ID permission is not in the app.)

### C12. Privacy policy

1. Put `docs/store/privacy-policy.html` on any public web address first:
   - easiest: upload it to your existing website (e.g. `https://yourdomain/nutwise/privacy.html`), or
   - create a free Google Site, paste the text, publish; or
   - later, the Nutwise server serves it at `https://<server>/privacy`.
2. Before uploading, replace **YOUR-SUPPORT-EMAIL** (and `[your server address]`) in the file.
3. Play Console → App content → **Privacy policy** → paste the URL → Save.

---

## Part D – Store listing (Grow users → Store presence → Main store listing)

1. **App name:** Nutwise
2. **Short description** and **Full description:** copy from `docs/store/listing.md`.
3. **App icon:** upload `docs/store/icon-512.png`.
4. **Feature graphic:** upload `docs/store/feature-graphic-1024x500.png`.
5. **Phone screenshots:** upload all 8 `docs/store/phone-*.png` (in number order).
6. Tablet screenshots: optional (you can upload the same phone ones under 7-inch and 10-inch, or skip).
7. Save.
8. **Translations (optional, recommended):** Main store listing → **Manage translations → Add your
   own translation → Hindi (hi-IN)** → paste the Hindi texts from `listing.md` → Save.
9. **Store settings** (Grow users → Store presence → Store settings):
   - App category: **Game**, **Puzzle**
   - Tags: Puzzle, Brain games, Logic, Casual, Offline (choose from Google's list)
   - Contact details: email (required, shown publicly), website (optional), phone (optional)
   - Save.

---

## Part E – Test release (internal testing, on your own phone)

1. Left menu → **Test and release → Testing → Internal testing** → **Create new release**.
2. **App signing:** accept **Google Play App Signing** (recommended, default).
3. **App bundles:** upload `app-release.aab` from Part B.
4. Release name: `1.0.0 (1)`. Release notes (en-US): `First release of Nutwise.`
5. **Next → Save → Start rollout to Internal testing**.
6. **Testers** tab → **Create email list** → add your own Gmail (the one on your phone) → Save.
7. Copy the **"Join on the web"** link, open it on your phone, accept, install from Play Store. Play it.
8. Fix any warnings Play Console shows on the release page before going further.

---

## Part F – Closed test (needed for new personal developer accounts) and production

Google requires personal developer accounts created after November 2023 to run a **closed test with at
least 12 testers who stay opted in for 14 days in a row** before you can apply for production.
Organisation accounts can skip to step 6.

1. **Test and release → Testing → Closed testing → Create track** (or use the default "Alpha").
2. **Countries/regions:** add India (and others you want).
3. **Testers:** create an email list with **at least 12–15 people** (friends, family, colleagues –
   their Gmail addresses). Add a feedback email or URL.
4. **Create new release** → **Add from library** → pick the 1.0.0 bundle → release notes → **Next →
   Start rollout to Closed testing**. Wait for Google's review (usually hours to a few days).
5. Send testers the opt-in link. They must **join and install**, and stay joined for **14 days**.
   Ask them to open the app on several days and send feedback. Fix issues and upload new versions to
   the same track if needed (raise versionCode each time).
6. After 14 days: Dashboard → **Apply for production access**. Answer the questions about your test
   (how you recruited testers, what feedback you got, what you changed). Google reviews it (about 7 days).
7. When approved: **Test and release → Production → Create new release** → add the bundle (or
   **Promote release** from closed testing) → **Countries/regions: India** first (as in the plan) →
   release notes → **Next → Save → Send for review / Start rollout to Production**.
8. Google reviews the release (from a few hours up to ~7 days). You get an email when it is live.
9. One week later, add more countries: Production → Countries/regions → Add countries.

---

## Part G – Later: turning on login, subscriptions and ads (version 1.1)

1. Put the server online with https (`apps/server/README.md`), with SMS (MSG91 + DLT template) and SMTP.
2. Set `VITE_API_URL=https://<your server>` (and the Google client ids) in `packages/game/.env`.
3. In Google Cloud, add the **App signing key SHA-1** from Play Console → Test and release → Setup →
   App integrity to your Android OAuth client (for Google login).
4. Raise `versionCode` to 2, `versionName` to `1.1.0`, build the bundle again (Part B, step 5).
5. **Update these Play Console answers before releasing 1.1:**
   - **Ads:** Yes, my app contains ads.
   - **Data safety:** Yes, collects data:
     - Personal info → **Email address** and **Name** (only with Google login), and **Phone number**:
       collected, not shared, optional, purpose **Account management** and **App functionality**.
     - App activity → **Other user-generated content / In-app actions** (progress summary):
       collected, not shared, purpose **App functionality**.
     - Data is **encrypted in transit**: Yes. Users can **request deletion**: Yes.
     - **Account deletion URL:** `https://<your server>/delete-account`.
   - **Content rating:** retake the questionnaire (Ads: Yes). Rating stays Everyone.
   - **App access:** still "all functionality available without restrictions" (login is optional).
   - **Privacy policy:** already covers accounts and ads.
6. Upload to closed or production track as before.

---

## Quick checklist

- [ ] App created with package `com.divyrs.nutwise`
- [ ] Signed `app-release.aab` built; upload key backed up
- [ ] App access, Ads, Content rating, Target audience, News, Government, Financial, Health, Data safety, Advertising ID
- [ ] Privacy policy online (email filled in) and linked
- [ ] Store listing (texts, icon, feature graphic, screenshots), category, contact email
- [ ] Internal test installed on your phone
- [ ] Closed test: 12+ testers for 14 days
- [ ] Production access approved → production release (India) → more countries after a week
