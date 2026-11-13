# SENZ TikTok Shop Connector

Read-only seller order integration for SENZ STUDIO v2.9.190. Uses official TikTok Shop seller authorization and API 202309. No scraping, chat access, fulfillment writes, or order-status changes.

## Deployment

Node 24, no npm dependencies. `npm test`, then `npm start`. Dockerfile included. Persistent `/data` volume is required; it stores AES-256-GCM encrypted authorization and the most recent seven days of order lines. A successful complete sync replaces the cache. Disconnect deletes local server tokens/cache; revoke authorization separately in TikTok Seller Center.

Live portal: https://senz-tiktok-production.up.railway.app

Redirect URL to register **exactly** in Partner Center:

`https://senz-tiktok-production.up.railway.app/tiktok/callback`

Railway project: https://railway.com/project/e5d400df-27d3-4487-822d-b2ede45cc8d8
Service: `senz-tiktok`, production. Settings → Variables:

| Variable | Value |
|---|---|
| TIKTOK_APP_KEY | Your seller app App Key |
| TIKTOK_APP_SECRET | Your App Secret; server only, never commit or paste into chat |
| TIKTOK_AUTH_URL | Full seller authorization link copied from your app in Partner Center, for the shop's market |
| TIKTOK_SHOP_ID | Your own allowed Shop ID; other shops are rejected |
| CONNECTOR_TOKEN | Already generated. Copy into SENZ TikTok Orders; held in memory only |
| ENCRYPTION_KEY | Already generated 32-byte hex key; keep stable, do not rotate without migrating encrypted data |
| PUBLIC_URL | https://senz-tiktok-production.up.railway.app |
| DATA_DIR | /data |
| PORT | 3000 |

Complete TikTok seller developer onboarding and enable/approve required seller authorization and Orders read scopes. Actual availability and review depend on app and market. Register the redirect above, add the four `TIKTOK_*` variables in Railway, deploy those variable changes, then in Studio open **TikTok Orders**, enter Connector Token, click **Semak sambungan**, **Connect TikTok Shop**, and open the displayed official authorization link. Return to Studio after authorization. Sync retrieves the last seven days; optional polling is every two minutes while enabled and the app window remains alive. No webhook configured.

## Preparing names

Set exact seller SKU → installed font family + final ink width in inches + color. Read order variant and buyer message as references. Enter custom name explicitly and review it. Chat messages and personalization fields that TikTok does not provide are not guessed. Click **Masukkan nama disemak ke canvas**; only items with names and mappings are included. Unpaid/cancelled orders are excluded. The existing Auto Arrange tool can then arrange the imported names. Imported line IDs prevent duplicate imports within the same project; other projects can intentionally import them again.

Portal fallback exports reviewed JSON; the desktop integration uses the same review UI and imports directly. Mappings are stored locally; names are held only in the tab/window memory until placed on canvas. Do not close before importing. Server stores no recipient address/phone/email.

## Security and limits

One trusted owner/shop per deployment. Connector Token grants access to order data and authorization; treat it as a password. OAuth state is single-use, expires after ten minutes and is stored hashed. Tokens are encrypted at rest. Secret-bearing request URLs and TikTok responses are not logged. The callback rejects unconfigured/invalid state and unauthorized shops. Business API errors show only numeric codes in server logs. Sync is serialized and limited to once per minute; retry on a later interval after 429/errors. Desktop import limits 500 names per batch and validates installed fonts, size, color and quantity. No automatic production/printing.

Tests use synthetic fixtures, never customer data. Live token exchange and real order retrieval cannot be verified until the app credentials, scopes and seller consent are supplied.

Primary references:
- https://partner.tiktokshop.com/docv2/page/create-your-app
- https://partner.tiktokshop.com/docv2/page/common-parameters
- https://partner.tiktokshop.com/docv2/page/6507ead7b99d5302be949ba9
- https://github.com/tiktok/ttspc-server-sample/blob/main/src/utils/sign.ts
