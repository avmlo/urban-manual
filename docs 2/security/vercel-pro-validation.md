# Vercel Pro Validation Evidence

Use this log to capture before/after validation for each Vercel project whenever the Pro plan or security controls change.

## Evidence Template

| Date | Project / Environment | Evidence | Notes |
|------|----------------------|----------|-------|
| 2024-05-10 | `urban-manual` / Production | `evidence/vercel/pro-plan-after-2024-05-10.png` | Confirmed Pro badge + WAF enabled |
| 2024-05-10 | `urban-manual` / Staging | `evidence/vercel/pro-plan-after-2024-05-10-staging.png` | Same config mirrored |

> Replace sample rows with real data as evidence is gathered.

## Before / After Capture Steps

1. **Before Upgrade**
   - Screenshot current plan page (`Settings → General → Plan`) and save as `evidence/vercel/pro-plan-before-<DATE>.png`.
   - Export billing summary via `vercel teams billing` CLI and store raw output in `evidence/vercel/billing-before-<DATE>.txt`.

2. **After Switching to Pro**
   - Screenshot plan page showing **Pro** badge (`pro-plan-after`).
   - Take screenshot of WAF dashboard showing managed rules enabled.
   - Run `vercel waf rules ls --scope urban-manual` and store output as `evidence/vercel/waf-rules-<DATE>.txt`.
   - Run `vercel logs urban-manual --since 1h` and confirm retention notice indicates 30 days; store as `evidence/vercel/log-retention-<DATE>.txt`.
   - Capture analytics anomaly settings (Settings → Analytics) screenshot `analytics-pro-<DATE>.png`.

3. **Firewall/IP Blocks**
   - Export JSON using `vercel api PATCH /v2/projects/:id/production/protection` (documented via CLI) and save to `evidence/vercel/firewall-rules-<DATE>.json`.

4. **Log Drain Test**
   - Use `curl -X POST https://logs.security.urbanmanual.com/v1/vercel/test` with new token; save response.

5. **Alert Webhook Test**
   - Trigger "Send test alert" in Vercel Alerts UI and capture screenshot/CLI output.

## Deferred / Follow-on Actions

- **Cloudflare**: Add equivalent WAF/firewall evidence once Pro upgrade completed (tracked in `docs/security/service-matrix.md`). Until then, log status as "Pending" with expected completion date.
- **Supabase**: When log drains or audit log exports are enabled, add evidence under `evidence/supabase/` and cross-reference here for consolidated audit trails.

## Storage & Access

- Evidence files live under `evidence/vercel/` and are committed for audit traceability.
- Sensitive secrets should be redacted before committing screenshots/logs.
- Reference this file from incident reviews and quarterly compliance reports.
