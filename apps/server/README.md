# Bolt Sort server

Login with a one-time code (phone or email), player accounts, subscriptions, house ads with click
tracking, and the admin panel. Node + Express + SQLite; one small process.

| Address                             | What                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `/admin`                            | Admin panel: dashboard, users, subscriptions, ads, ad settings               |
| `/api/auth/otp`, `/api/auth/verify` | Send and check a login code                                                  |
| `/api/me`                           | The player's account and subscription (`DELETE` removes the account)         |
| `/api/ads?game=bolt\|wit`           | Ads for the app (empty for subscribers)                                      |
| `/r/<ad id>`                        | Counts a click, then redirects to the advertiser's page                      |
| `/delete-account`                   | Public page to delete an account (link it in Google Play's Data safety form) |

## Run locally

1. Create `apps/server/.env` with at least:

   ```
   ADMIN_EMAIL=you@example.com
   ADMIN_PASSWORD=choose-a-long-password
   ```

2. In one terminal start the server: `npm run server` (it prints `Admin panel: http://localhost:3200/admin`).
3. In a second terminal start the game: `npm run dev`.
4. Open **http://localhost:3200/admin** (or http://localhost:5173/admin, which forwards to it) and
   log in with the email and password from step 1.

Login codes are printed in the server terminal (`[dev OTP] +91…: 123456`) until an SMS/email
provider is set. To make the game use the local server for login and ads, put
`VITE_API_URL=http://localhost:3200` in `packages/game/.env` and restart `npm run dev`.

## Put it on your VPS

1. A sub-domain, e.g. `api.yourdomain.com`, pointing at the VPS.
2. On the VPS (Node 22+): clone the repo, then `npm ci`.
3. `cp apps/server/.env.example apps/server/.env` and fill it in (secret, admin login, SMS, SMTP).
4. `pm2 start apps/server/deploy/ecosystem.config.cjs && pm2 save`
5. nginx: copy `deploy/nginx-boltsort.conf`, change the domain, enable it, then
   `certbot --nginx -d api.yourdomain.com` for https.
6. Build the app against it: put `VITE_API_URL=https://api.yourdomain.com` in `packages/game/.env`,
   then `npm run android` / `npm run ios`.

Back up `apps/server/data/` (database and ad images) every day.

## Phone login in India

SMS OTPs to Indian numbers must use a DLT-registered sender and template (TRAI rules). MSG91 (or
any Indian SMS provider) helps you register; put the template id in `MSG91_TEMPLATE_ID`. Email login
works with any SMTP service and needs no registration.

## Subscriptions

Today the admin gives or extends subscriptions by hand (for example after a UPI payment), from
**Users → Open → Give or extend**. Players with an active subscription see no ads. In-app payment
through Google Play / App Store billing is the next step; it will add rows with `source = google_play`.
