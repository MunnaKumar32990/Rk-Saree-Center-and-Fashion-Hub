# 🛍️ RK Saree Center & Fashion Hub

A storefront for **RK Saree Center** — sarees, kurtis and ethnic wear, with Cash
on Delivery, built for tier-2/3 India where most shoppers are on budget Android
phones over 4G and pay by cash on delivery.

🌐 **Live:** https://rk-saree-center-and-fashion-hub.vercel.app

---

## ⚠️ ACTION REQUIRED BEFORE YOU DEPLOY

**A live Gmail App Password was committed to `backend/.env.example` in the
history of this repository.** It has been removed from the working tree, but it
is still retrievable from git history and must be treated as compromised.

1. **Revoke it now** — Google Account → Security → 2-Step Verification → App
   passwords → delete the old one and generate a new one.
2. Rotate any database password that was ever shared the same way.
3. Purge it from git history (`git filter-repo --replace-text` or BFG) if the
   repository has been public.
4. Add a secret scanner (gitleaks / trufflehog) to CI so this cannot recur.

The server now **refuses to boot** if `JWT_SECRET` or `EMAIL_PASS` is still a
known example value, so this class of mistake fails loudly instead of silently.

---

## What's new in v2

The previous version had a working-looking UI over an exploitable backend. This
release closes the security and money-integrity holes, then attacks the actual
reasons customers don't buy.

### Security & money integrity

| Fixed | Impact |
|---|---|
| Live credential committed to git | Full mailbox compromise → account takeover |
| NoSQL operator injection on password reset | **Any account taken over in 2 HTTP requests** |
| NoSQL operator injection on 2FA verify | **Any admin account taken over, no password needed** |
| Second payment endpoint accepted a client-chosen amount | **A ₹1 payment could mark a ₹50,000 order paid** |
| Stock was never decremented | A product with 1 unit sold unlimited copies |
| Paid orders were self-cancellable | **Pay ₹5,000, cancel, keep the money. Repeatable.** |
| Stock never restored on cancel/return | Returns permanently destroyed inventory |
| Return-request endpoint had no ownership check | Any logged-in user could read any order's return data |
| Password change didn't revoke tokens | A stolen token survived indefinitely |
| Coupon validated against one source, charged against another | Shown "you save ₹400", charged full price |
| `qty` accepted negatives and fractions | Negative line totals, corrupted revenue stats |
| Rate limits ineffective behind a proxy | No real protection; but the global limit *did* break the site |
| Order state machine bypassed on 4 of 5 paths | Cancelled orders could be resurrected to Delivered |
| Cart destroyed on any 401 | Expired token mid-checkout emptied the basket |

### Customer-facing

- **Real back-in-stock alerts** — the old form collected an email and then did
  nothing. Now queued and emailed the moment you replenish stock.
- **Saree specification sheet** — fabric, weave, zari type, exact length and
  width, blouse-piece length, fall/pico, GI tag, Silk Mark, HSN code. This is the
  single biggest differentiator available: marketplaces publish almost none of
  it, and every field answered prevents a return.
- **PIN-code-first checkout** with live serviceability lookup that auto-fills
  city and state. Entering the PIN first measurably reduces address errors.
- **Real shipping options** — Express was advertised in ShippingInfo.jsx but
  never existed in code. It is now selectable and actually charged.
- **A committed delivery window** instead of "ships in 2-5 days", plus the exact
  cash amount to keep ready for COD.
- **COD badge on every product page**, plus a COD-confirmation handshake (see
  below) and a one-tap "order on WhatsApp" path.
- **Gift notes, gift wrap and delivery instructions** — the database fields and
  the admin screen already existed; the form simply never collected them.
- **Saved addresses** so a repeat order isn't a full retype.
- **Rebuilt size guide** with a height→length tool and a blouse-fabric table,
  because a saree has no S/M/L — length and width *are* the fit.
- **Returns policy written to be read**, stating the non-returnable cases
  *before* the customer pays.
- **Reviews with verified-purchase badges, star histogram and fit feedback** —
  40-53% of apparel returns are sizing, and "runs small / true to size" from a
  real buyer is what prevents the next one.
- **PWA** — installable, offline-capable shell. Install is nudged only after
  real engagement, never on first visit.
- **Checkout JSON-LD** including the saree attributes, so product pages can
  qualify for rich results on the long-tail searches this category gets.

### Operations

- **Cash-on-Delivery confirmation** — the highest-impact single change for
  profitability. COD RTO in ethnic wear runs 30-45% (and ~58% in the festive
  quarter) at ₹180-500 of dead logistics cost each. Confirming the order with the
  customer on WhatsApp within minutes is the best-documented intervention
  (reported RTO 18-25% → 12-17%). Falls back to email when WhatsApp isn't
  configured; the state machine runs either way.
- **COD health dashboard** — placement, confirmation rate and RTO, with a
  threshold warning. Above ~30% RTO the category is structurally loss-making.
- **Audit log** — every privileged action that moves money or grants privilege.
- **In-app notifications** for every order and return event.
- **Order status and refund emails** (previously none existed, despite the
  shipping page promising them).
- **Transaction-backed inventory** — stock, order creation and coupon redemption
  commit or roll back together.
- **Health endpoint** that reports database liveness, so a platform can detect a
  dead Mongo connection.
- **Real refunds** — cancelling a paid order now issues an actual Razorpay
  refund and records the id.

---

## Stack

**Backend** — Node 20+, Express 5, Mongoose 9, Razorpay, Cloudinary, Nodemailer
**Frontend** — React 19, Vite 7, Tailwind, React Router 7

---

## Getting started

### Prerequisites

- Node.js 20 or newer
- MongoDB — **a replica set**, because stock and coupon operations run in
  multi-document transactions. Atlas is already a replica set. For local work:

  ```bash
  mongod --dbpath ./data --replSet rs0
  # then, once:
  mongosh --eval "rs.initiate()"
  ```

  Set `MONGO_TRANSACTIONS=false` if you must run a standalone `mongod` in
  development; the code degrades gracefully, but you lose atomicity.

### Backend

```bash
cd backend
cp .env.example .env      # then fill it in — see the comments in that file
npm install
npm run dev
```

Generates `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

`VITE_API_URL` is **required for a production build** — Vite inlines env vars at
build time, and a missing value previously shipped a bundle pointing at
`localhost` with no error. The build now fails loudly instead.

```bash
VITE_API_URL=https://api.your-domain.com/api npm run build
```

---

## Verifying it works

```bash
cd backend
npm run test:setup   # one-off: turn the local mongod into a replica set
npm test             # 188 end-to-end assertions against real HTTP + real Mongo
```

The suite asserts the security and money properties directly — that operator
injection is rejected, that eight concurrent orders for three units create
exactly three, that cancelling twice doesn't double-restock, that a coupon's
advertised discount equals the charged discount, and that a customer can't read
anyone else's order.

Frontend:

```bash
cd frontend
npm run lint         # must be clean
npm run build
```

---

## Environment

Full documentation is in `backend/.env.example`. The variables that matter most:

| Variable | Why |
|---|---|
| `MONGO_URI` | Required |
| `JWT_SECRET` | Required, ≥32 chars, must not be an example value |
| `FRONTEND_URL` | Comma-separated CORS allowlist — include every real origin |
| `PUBLIC_URL` | Used for the sitemap, canonical links and email links |
| `RAZORPAY_KEY_ID` / `SECRET` | Only COD without these |
| `EMAIL_USER` / `EMAIL_PASS` | A Gmail **App Password**; order emails silently don't send without it |
| `BUSINESS_PHONE` / `BUSINESS_WHATSAPP` | The real numbers — the footer used to display one number and dial another |
| `COD_CONFIRM_ENABLED` + `WHATSAPP_*` | Turns on COD confirmation. Highest-ROI setting in this file |
| `PINCODE_LOOKUP_ENABLED` | Set `false` to disable the third-party PIN lookup |

---

## Notes on the two data sources that must stay in sync

- **Money** — `backend/src/config/pricing.js` is authoritative.
  `frontend/src/utils/pricing.js` mirrors it for display only; the server
  recomputes every price from the database before persisting an order, so a
  tampered client cannot change what is charged.
- **Saree specifications** — a saree cannot be saved without a stated length,
  enforced in both the Mongoose schema and the admin form. This is deliberate:
  an unspecified length generates "too short for my height" returns.

---

## Contact

**RK Saree Center**
📧 rksareecenter32@gmail.com
📱 +91 97087 56854

---

*Operated exclusively by RK Saree Center for our own business.*
