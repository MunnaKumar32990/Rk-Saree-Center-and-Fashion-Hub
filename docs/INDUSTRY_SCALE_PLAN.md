# RK Saree Center — Industry-Grade Production Plan

**Scope constraint honoured throughout:** this plan is **additive**. It does not
restructure the existing codebase. The Express + Mongoose + React + Vite stack,
every route path, every response payload, and the existing component layout are
preserved. Every item is either configuration, infrastructure, a new file, or a
change small enough to review in one sitting.

---

## 1. Capacity model — what "60,000 concurrent" actually requires

"60,000 customers in parallel" is a session count, not a request count. Sizing
has to start from shopper behaviour, or the number is meaningless.

**Behavioural assumption (to be replaced by real analytics in week 1):**

| Quantity | Value | Reasoning |
| --- | --- | --- |
| Concurrent shoppers at peak | 60,000 | the target |
| Requests per shopper per minute | ~2.4 | one action every ~25 s while browsing |
| Sustained origin RPS | **~2,400** | 60,000 × 2.4 / 60 |
| Festival peak multiplier | 3× | Diwali / wedding season traffic |
| Design burst ceiling | **10,000 RPS** | 4× sustained, absorbing a flash sale |
| Share of bytes that is static | ~95% | JS/CSS/fonts/images, all CDN-served |
| Origin responsibility | HTML shell + `/api/*` only | Vercel CDN already absorbs assets |

**Consequence:** the origin must sustain 10,000 RPS while every shopper on the
site keeps a normal page-load latency. Static bytes are not the constraint;
catalogue reads, checkout writes and payment verification are.

### Instance sizing

| Component | Sizing | Notes |
| --- | --- | --- |
| API instances | 6–8 at 10k RPS, autoscale 4 → 20 | 2 vCPU / 4 GB each |
| Load balancer | L7, TLS termination, health-check on `/api/health` | must be multi-AZ |
| Frontend | Vercel CDN (existing) | no origin work |
| Mongo primary | 1 | writes, checkouts, inventory transactions |
| Mongo secondaries | 2 | catalogue + order-history reads via `readPreference` |
| Redis | 1 (managed, HA) | shared rate limiting + facet cache |
| Static assets | Cloudflare/Vercel CDN | already in place |

**Per-instance throughput assumption:** ~1,500–2,500 RPS per 2-vCPU Node process
for this workload (small JSON documents, one Mongo round-trip each). This must be
**measured, not assumed** — see the load-test gate in Phase 1.

### The connection-pool trap

`MONGO_POOL_MAX` defaults to 30 per instance. At 8 instances that is **240
sockets** against one cluster, plus Atlas/host overhead. Cluster-wide connection
limits are enforced by the provider, not by this app, and exceeding them produces
errors that look like application bugs.

Two options, pick one explicitly:

1. Lower `MONGO_POOL_MAX` to ~15 and accept slightly higher queueing, or
2. Raise the cluster's connection allowance and keep 30.

Formula: `instances × MONGO_POOL_MAX + headroom ≤ cluster connection limit`.
This must be checked against the actual cluster tier before launch.

---

## 2. Blockers between the current state and 60,000 customers

These are the real gaps. None is hypothetical.

### B1 — Rate limiting is per-instance (security *and* scale) — **FIXED**

All 13 `rateLimit()` calls used `express-rate-limit`'s default `MemoryStore`.

- With N instances every limit was **N× weaker**. At 8 instances the
  10-failed-logins-per-15-minutes rule silently became 80, and credential
  stuffing and account enumeration were back on the menu.
- `MemoryStore` also grows unbounded until eviction, so a flood of unique IPs is
  itself a memory-exhaustion vector.

Now backed by `backend/src/utils/rateLimitStore.js` — a store implemented over
the existing MongoDB connection, so counters are shared across every instance
with **no new dependency and no new infrastructure**. Counting is a single atomic
update-pipeline upsert, so concurrent first-hits cannot lose a hit between
instances, and the expiry check and the increment happen in the same round-trip.

Chosen over Redis deliberately: Redis would need new infrastructure, new
credentials and new operational surface before it could be tested, whereas Mongo
is already a hard dependency and already required to be a replica set. The store
is applied only to the sensitive, low-volume endpoints (auth, 2FA, reset,
registration, checkout, payment, coupons, reviews, restock, contact); catalogue
reads keep a generous limit. If it ever shows up as a write hotspot, the upgrade
path is a Redis store behind the same five-method interface with no call-site
changes.

It also **fails open**: if Mongo is unreachable the store counts in-process and
logs loudly, because a limiter that throws would turn a brief database blip into
a 500 for every customer.

### B2 — Facet cache is per-instance — **P1**

Five aggregations run on a 5-minute in-process TTL. It works, but every deploy
colds N caches at once and briefly multiplies the exact query cost the cache
exists to avoid. Responses can also disagree between instances.

Fix: keep the in-process cache as L1 and add Redis as L2. Optional — measure
first.

### B3 — Buffered view counts lose ≤30 s per deploy — **P2, accept**

Product `viewCount` is buffered in memory and flushed on an interval. A deploy
drops the buffer. Eventual consistency is fine for a view counter; the flush is
documented rather than made durable.

### B4 — Cron jobs ran on every instance — **FIXED**

`setInterval` is per-process. Scaling to 8–12 instances meant the COD sweep ran
8–12 times per tick: **every unconfirmed COD order received 8–12 identical
WhatsApp "please confirm your order" messages**, and the 24-hour release pass
could act on the same order repeatedly.

Fixed with a Mongo-backed leader lease (`backend/src/utils/cronLease.js`) that
elects exactly one leader per job. It fails **closed**: if the unique index that
guarantees exclusivity cannot be verified, the job is skipped and logged rather
than run — duplicate customer messages are worse than a delayed sweep. An
in-process guard additionally prevents two timers in one instance from
overlapping. Covered by assertions simulating 12 concurrent instances.

### B5 — JWT in `localStorage` — **P2, needs a migration plan**

An XSS bug becomes account takeover, including for admins. Moving to `httpOnly`
+ `SameSite=Strict` + `Secure` cookies is the industry standard, but it touches
auth on both sides.

Safe sequence: issue **both** for one release → frontend prefers the cookie →
log out users whose cookie is missing → remove the `localStorage` path. Never a
big-bang cutover.

---

## 3. Security and cyber-attack protection

### Already in place

- NoSQL-operator injection rejected at the edge, with strict coercion helpers
- Signed Razorpay webhooks verified against the **raw** body (was: none — anyone
  could mark an unpaid order paid); amount and order binding also checked
- WhatsApp webhook fails closed when the app secret is unset
- Reset and email-verification tokens stored as SHA-256 digests, single use, expiring
- Payment, coupon, COD, review and order routes re-checked server-side
- Authoritative server-side pricing — client totals are never trusted
- Inventory decrement/return inside MongoDB transactions with a `$gte` guard
- Native `bcrypt` instead of `bcryptjs` (see below)
- Generic auth failure messages; per-account lockout and IP throttling
- Rate limiting across 13 route groups; production logs failures only
- CORS allow-list that rejects rather than throwing
- JWT revocation, suspension checks, shorter TTLs, 2FA
- Audit log and notifications; admin endpoints audit actor and IP
- Helmet, CSP, security headers, no stack traces in production errors
- Dependency audits clean on both packages
- `.gitignore` and `.env.example` carry no live secrets
- 235 end-to-end assertions covering the above

### Remaining — ordered by risk

**Day 0 (do before anything else)**

1. **Revoke the exposed Gmail App Password.** It was committed in the original
   `backend/.env.example`. Removing it from the working tree does not revoke it.
2. **Purge it from git history** (`git filter-repo`, then force-push and have
   every collaborator re-clone).
3. Rotate `JWT_SECRET` at the same time — old sessions die, which is the point.

**Week 1–2**

4. Redis-backed rate limiting (B1).
5. WAF / DDoS: Cloudflare or Vercel Firewall in front, with bot management.
   This absorbs volumetric attacks before they reach the origin.
6. Secrets manager — no secrets in `.env` files or CI logs.
7. Security headers verified in CI (CSP, HSTS, `X-Content-Type-Options`,
   `Referrer-Policy`, `Permissions-Policy`).
8. Implement the `/api/csp-report` endpoint that the report-only CSP already
   points at, then flip to enforcing.

**Week 3–6**

9. SAST (Semgrep) and dependency scanning (Dependabot/Renovate) in CI.
10. Admin MFA enforced, not optional.
11. Load test the rate limiter and login path specifically — verify 8 instances
    really do enforce 10 attempts, not 80.
12. Independent penetration test before public launch.

### A note on `bcryptjs` → native `bcrypt`

Measured in this codebase at cost factor 12:

| | hash | compare | event loop |
| --- | --- | --- | --- |
| `bcryptjs` (pure JS) | 265 ms | 266 ms | **blocked for that long** |
| `bcrypt` (native) | 228 ms | 228 ms | runs on libuv threadpool |

Same wall-clock cost and identical security, but `bcryptjs` parks the single
event loop, so a burst of 20 login attempts — precisely what credential stuffing
looks like — stalls *every other shopper* on that instance. In testing this
produced 3-second response times on unrelated requests. Switched to native.

### DPDP Act 2023 (India) — launch blocker

- Explicit consent, privacy policy, and cookie consent at first paint
- Data minimisation; define and publish retention periods
- DSAR tooling: access, correction, erasure, nomination, grievance
- Breach notification runbook with named owners and a clock
- Appoint a DPO; maintain a data-inventory of what is collected and why
- Vendor agreements covering processor obligations (Razorpay, Cloudinary, Meta,
  email provider)

---

## 4. Design and the customer's point of view

Research on Indian ethnic-wear e-commerce consistently points at the same
failures: customers cannot judge fabric or drape from photographs, COD
returns destroy margin, and mobile performance decides whether the sale happens.

### Product detail page — the page that decides the sale

- Fabric, weave, zari type, length, width, blouse-piece inclusion, GI tag or
  Silk Mark, care instructions — implemented as `SareeSpecs`
- Real photos plus a short drape video; the single highest-leverage upgrade
- Zoom on weave detail
- Fabric/occasion filters that match how customers actually search
  ("chikankari", "banarasi", "wedding", "office")

### Conversion and trust

- Clear COD amount and what happens on delivery — implemented
- WhatsApp ordering and order updates — implemented
- Pin-code serviceability and delivery estimate before checkout — implemented
- Returns policy stated in plain language at the point of decision, not buried
- Trust bar (COD, secure payment, returns, support) — implemented
- Size and fit guide, including blouse and fall measurements — implemented

### Performance — a hard requirement, not a nice-to-have

The majority of this audience is on low-end Android over 4G. Targets:

| Metric | Target |
| --- | --- |
| LCP | ≤ 2.5 s |
| INP | ≤ 200 ms |
| CLS | ≤ 0.1 |

Current state: entry bundle ~158 kB (~41 kB gzip), down from ~1,175 kB. Assets
lazily code-split. Next: AVIF/WebP with responsive `srcset`, explicit width and
height to hold CLS, font subsetting, and CDN Brotli.

### Accessibility

WCAG 2.2 AA: contrast, focus order, visible focus rings, `aria-live` on cart and
order status, keyboard operability of the size guide and admin specs editor. An
unlabelled icon-only control is a defect.

### SEO

JSON-LD product schema, meta tags, sitemap, robots — implemented. Remaining:
per-collection landing pages for occasions, per-fabric hubs, and content that
answers real search questions (how much fabric a 6.5 m saree gives, how to drape
a palazzo style).

---

## 5. Managing the codebase collaboratively

The failure mode for a small team on a repo this size is silent drift: two
developers solve the same problem differently, nobody knows why a decision was
made, and regressions arrive through untested edges.

| Concern | Action |
| --- | --- |
| Decisions | Architecture Decision Records in `docs/adr/` — why, not just what |
| Ownership | `CODEOWNERS` so security- or payment-touching files need a named reviewer |
| Branch protection | PR required, CI green, no direct pushes to `main` |
| Commits | Conventional Commits + semantic-release |
| Formatting | ESLint + Prettier enforced in CI, not advisory |
| Tests | Keep the 235-assertion E2E suite; add unit tests for pricing, coupons, COD transitions and inventory math; enforce a coverage gate |
| Contracts | OpenAPI spec generated from the routes, then generate frontend API types so a payload change breaks the build instead of the PDP |
| Logging | Structured JSON logs (pino) with a request ID threaded through every log line |
| Operations | `docs/RUNBOOK.md` — deploy, rollback, on-call, incident steps |
| Dependencies | Automated update PRs, auto-merged for patches, reviewed for minors |
| Secrets | Never in the repo; rotation documented |

The single highest-value item here is the **contract + generated types**: it is
what stops the class of bug where a backend rename silently blanks a field on the
product page.

---

## 6. Phased delivery with exit gates

Each phase ends with a measurable gate. Do not start the next phase on a gut feel.

### Phase 0 — Days 0–2: stop the bleeding
Revoke the leaked app password, purge git history, rotate `JWT_SECRET`, deploy
the current hardened code with `RAZORPAY_WEBHOOK_SECRET` set.

> **Gate:** no known live secret in history; a real Razorpay webhook marks an
> order paid; an unsigned one does not (verified in production).

### Phase 1 — Weeks 1–2: find the real ceiling
Redis rate limiting. Instrument request timing and error rates. Load-test to find
the true per-instance RPS and the real peak-traffic multiplier instead of
assuming them. Size the replica set from measured numbers.

> **Gate:** 10,000 RPS sustained for 15 minutes with p95 < 400 ms and zero errors;
> rate limits still hold at 8 instances; a capacity report stating measured
> throughput per instance.

### Phase 2 — Weeks 3–4: production topology
Load balancer, multi-AZ, autoscaling 4 → 20, read preferences, CDN and Brotli,
Core Web Vitals green on a throttled mid-range Android profile.

> **Gate:** one instance killed mid-sale with no customer-visible error; all
> three CWV targets met on the throttled profile; connection-pool maths verified
> against the actual cluster tier.

### Phase 3 — Weeks 5–6: engineering hygiene
CI pipeline, coverage gate, `CODEOWNERS`, ADRs, OpenAPI contract and generated
types, structured logging, runbook.

> **Gate:** a fresh clone reaches green CI unattended; contract change breaks the
> build; coverage threshold enforced.

### Phase 4 — Weeks 7–8: security and compliance
Penetration test, remediate findings, DPDP work (consent, DSAR tooling, breach
runbook, DPO), admin MFA enforcement, CSP report endpoint.

> **Gate:** pen test with no open high or critical findings; DSAR request
> fulfilled end-to-end within the legal clock; DPO named.

### Phase 5 — Ongoing
`httpOnly` cookie migration with the dual-issuance sequence, sharding only if the
catalog or write volume actually demands it, quarterly dependency and access
reviews.

> **Gate:** no token in `localStorage`; sharding decision backed by measured
> growth rather than anticipation.

---

## 7. What was deliberately **not** changed

To be explicit about the constraint:

- The Express / Mongoose / React / Vite stack is unchanged.
- No route path or response payload was renamed or removed.
- No component tree was reorganised; new components are additive.
- No state management, ORM, or build tool was swapped out.
- New files are additive: `utils/tokens.js`, `utils/cronLease.js`,
  `models/CronLease.js`, `utils/rateLimitStore.js`, `routes/cspRoutes.js`,
  `scripts/e2e-body-5.mjs` through `e2e-body-9.mjs`, and this document.
- Only three dependency changes, each justified by a measured defect:
  `bcryptjs` → `bcrypt` (event-loop blocking), the earlier `nodemailer` /
  `jspdf` security upgrades, and `compression` (88% bandwidth reduction). All
  audits report zero vulnerabilities.

One deliberate omission: `mongoose.set("sanitizeFilter", true)` was tried and
**reverted**. In Mongoose 9 it wraps rather than preserves nested operators, which
broke `{ _id: { $in: [...] } }`, `{ n: { $gte: 1 } }` and `{ name: { $regex } }`
— including the `countInStock: { $gte: qty }` guard the entire oversell
protection depends on. NoSQL injection is instead blocked at the edge by the
`rejectMongoOperators` middleware plus strict coercion, both under test.

---

## 8. Verification state

| Check | Result |
| --- | --- |
| Backend E2E (real Mongo replica set) | **286 passed, 0 failed** |
| Frontend ESLint | 0 errors, 0 warnings |
| Frontend production build | passes; entry 158 kB (~41 kB gzip) |
| Build guard without `VITE_API_URL` | correctly fails |
| `npm audit` backend + frontend | 0 vulnerabilities |
| Secret scan across tracked files | clean (no live keys, certs or real URIs) |
| Mojibake / encoding sweep | clean |
| Import-integrity check | every relative import resolves |
| Named-import check | every named import exists in its module |
| Env-var documentation check | every `process.env` read is in `.env.example` |
| API response compression | catalogue response 10,250 B → 1,236 B (**88% less bandwidth**) |

The E2E suite runs against a real MongoDB replica set, not a mock, because the
transaction and inventory guarantees cannot be validated against a fake. It now
also includes:

- **Source-integrity assertions** (section 30) that would catch a renamed route,
  a mistyped identifier or an undocumented environment variable before review —
  these were written after a real incident where a corrupted import path and a
  misspelled `totalPrice` field shipped past a green suite.
- **Rate-limit store concurrency** (section 27) proving 40 concurrent hits
  across 8 instances are all counted and each returns a distinct total.
- **Cron leader election** (section 25) across 12 simulated instances.

---

## 9. Shipped in the current pass

| Change | Why |
| --- | --- |
| Shared Mongo rate-limit store on all 13 limiters | Limits no longer weaken as instances scale (B1) |
| Mongo leader lease for COD cron jobs | No more N× duplicate WhatsApp messages to customers (B4) |
| Native `bcrypt` instead of `bcryptjs` | `bcryptjs` blocked the event loop ~265 ms per login; credential stuffing attempts stalled unrelated shoppers for seconds |
| Response compression | 88% less catalogue bandwidth — decisive on 4G |
| `X-Request-Id` propagation + request-scoped logging | One customer's request can be found across instances |
| `/api/csp-report` collector + corrected `report-uri` | The report-only CSP previously POSTed every violation into a 404; monitoring that monitored nothing |
| `sanitizeFilter` reverted | It broke `$in`/`$gte`/`$regex` in Mongoose 9, including the oversell guard |
| `morgan.compile()` skip fixed | "Log failures only" was logging every 200 |
| `pendingEmailToken` raw-vs-hash fixed | Email-change confirmation could never succeed |
| 8 undocumented env vars documented | Production silently used defaults |
| `.env.example` mojibake and comment damage repaired | File was partially unreadable |
| `X-Request-Id` / `X-No-Compression` added to CORS allow-list | Preflight would otherwise fail for callers supplying them |
