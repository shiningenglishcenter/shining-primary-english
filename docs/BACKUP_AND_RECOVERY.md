# Backup & Recovery (draft — finalised in Milestone 8)

| Layer | Mechanism | Frequency | Retention | Cost |
|---|---|---|---|---|
| Database | Supabase Pro daily backups | daily | 7 days | included |
| Database (off-site) | GitHub Action: `pg_dump` (schema+data, custom format) encrypted with `age`, stored as a private artifact / owner's Google Drive | weekly (Sunday 02:00 ICT) | 8 weeks | free |
| Schema | migrations in Git | every change | forever | free |
| Storage files | weekly sync of `reports` bucket to the off-site location; learning media originals kept by the centre | weekly | 8 weeks | free |

Targets: RPO ≤ 24 h (daily backup), RTO ≤ 4 h. Point-in-time recovery ($100/month) is **not** enabled.

## Restore procedure
1. Supabase dashboard → Database → Backups → choose the day → Restore (project is unavailable during restore).
2. If the project itself is lost: create a new project, `supabase db push` the migrations, `pg_restore
   --data-only` the latest off-site dump, re-upload storage files, update Vercel env vars, redeploy.
3. Verify: `/api/health`, log in as each role, compare row counts with the dump manifest.
4. Record the incident in `PROJECT_STATUS.md`.

A restore drill on the dev project is part of Milestone 8 acceptance.
