# Cost Estimate

Prices checked 9 Nov 2026 on the vendors' official pages; exchange rate: Vietcombank USD sell rate
≈ 25,780 VND (5 Nov 2026). Vendor prices exclude taxes; Vietnamese banks usually add a foreign-card fee
(~1–3 %). Re-check before subscribing. **Nothing has been purchased or enabled.**

## Monthly fixed costs

| Service | Plan | USD | ≈ VND | What it provides | Needed for MVP? |
|---|---|---|---|---|---|
| Supabase | Pro, 1 project, Micro compute | $25 (incl. $10 compute credit that covers Micro) | 645,000 | Postgres, Auth, Storage, daily backups (7-day retention), no pausing | **Yes** — Free projects pause and have no backups |
| Vercel | Pro, 1 deploying seat | $20 (incl. $20 usage credit) | 516,000 | Commercial hosting (Hobby forbids commercial use), 1 TB CDN transfer, 1M CDN requests | **Yes** |
| GitHub | Free | $0 | 0 | Private repo, Actions minutes for CI | Yes |
| Dev/preview database | Supabase Free (separate org) | $0 | 0 | Non-production testing | Yes |
| **Total** | | **$45** | **≈ 1,160,000** (≈ 1.2–1.3 M with card fee/tax) | | within the 1.5 M target |

Headroom ≈ 300,000 VND/month for overages or a domain.

## Variable costs and assumptions (200 students)

| Resource | Included | Assumption | Expected use | Overage price |
|---|---|---|---|---|
| Supabase database disk | 8 GB | ~2 MB/student/year of results | < 1 GB for years | $0.125/GB |
| Supabase file storage | 100 GB | images & audio ~2 GB; 100 story videos × 40 MB (720p, ~5 min) = 4 GB; reports 200 × 12 × 300 KB ≈ 0.7 GB/year | ~7 GB year 1 | $0.0213/GB |
| Supabase egress | 250 GB (+250 GB cached) | **video is the driver**: 200 students × 15 views/month × 40 MB = 120 GB | 100–150 GB | $0.09/GB (cached $0.03/GB) |
| Supabase MAU | 100,000 | ~250 accounts | negligible | — |
| Vercel CDN transfer | 1 TB | app pages & JS only (media comes from Supabase) | < 20 GB | covered by credit |
| Vercel functions | from $20 credit | server rendering for ~250 users | a few $ | billed after credit |

## Overage risks & controls
1. **Video bandwidth.** Doubling video use (e.g. 400 students) approaches the 250 GB egress quota.
   Controls: compress to 720p H.264; keep Supabase **Spend Cap ON** (default on Pro — usage beyond quota is
   restricted rather than billed); monitor in the usage dashboard monthly.
   Economical alternative if needed later: move videos to a stream host — the `media_assets.provider` column
   already supports it. YouTube (unlisted) is free but shows YouTube branding/recommendations; a paid stream
   host costs a few dollars/month at this scale. Requires owner approval before switching.
2. **Vercel on-demand usage** after the $20 credit: set a spend-management limit (e.g. $10) with alerts.
3. **Extra Vercel seats** cost $20 each — only the developer needs a deploying seat; staff don't need one.
4. **Supabase add-ons not needed for MVP**: point-in-time recovery ($100/month for 7 days), larger compute,
   custom domain for Supabase, extra projects ($10/month each). Not enabled.

## Optional, not included
- Domain: Vercel Pro includes one free first-year domain on selected TLDs (.app, .online, .site, …).
  A `.vn` / `.edu.vn` domain is bought separately from a Vietnamese registrar.
- Error monitoring (e.g. Sentry free tier) — free tier is enough; adding it still needs owner approval.

## Scaling outlook
| Students | Likely monthly cost |
|---|---|
| ≤ 300 | $45 (≈ 1.2 M VND) |
| 300–800 | $45–60: some egress overage or a stream host for video |
| 800+ | consider Supabase Small compute (+~$5/month net of credit) |
