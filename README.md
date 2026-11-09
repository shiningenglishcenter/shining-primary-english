# SHINING PRIMARY ENGLISH

Learning-management platform for SHINING English Center: Cambridge Starters/Movers/Flyers and Global
Success (grades 1–5) content, online tests with server-side grading, teacher feedback, student progress and
parent reports shareable on Zalo.

**Status:** Milestone 0 complete (architecture + database layer, tested). See `PROJECT_STATUS.md`.

## Repository layout
| Path | What |
|---|---|
| `supabase/migrations/` | Database schema, RLS policies, grading/report functions (source of truth) |
| `supabase/tests/` | 140 permission/grading/report assertions + local Supabase shim |
| `scripts/test-db.sh` | Runs migrations + tests on a throwaway PostgreSQL 15/16 server |
| `ARCHITECTURE.md` · `DATABASE_SCHEMA.md` · `SECURITY.md` · `COST_ESTIMATE.md` · `IMPLEMENTATION_PLAN.md` | Design docs |
| `docs/BACKUP_AND_RECOVERY.md` | Backup policy and restore procedure |
| *(Milestone 1)* `src/` | Next.js application |

## Run the database tests
Requires PostgreSQL 15+ server binaries (no Docker needed):
```bash
scripts/test-db.sh        # exits non-zero on any failure
```
With the Supabase CLI instead: `supabase start && supabase db reset` applies the same migrations.

## Environment variables (Milestone 1)
| Name | Where | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key) | browser + server | no (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` (secret key) | **server only** (Vercel env, never `NEXT_PUBLIC_`) | **yes** |
| `APP_BASE_URL` | server | no |

Never commit `.env*` files.

## Deployment (summary — full guide in Milestone 8)
1. GitHub repository (private) · 2. Supabase project (Pro, Singapore region) · 3. Auth settings: disable
sign-up, configure password policy · 4. `supabase link && supabase db push` · 5. Vercel project linked to
GitHub, env vars set per environment · 6. Custom domain · 7. Deploy preview → verify → **owner approval** →
promote to production.
