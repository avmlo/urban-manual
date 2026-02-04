# Security Service Matrix

| Service | Subscription | Capabilities Enabled | Billing / Cost Center | Owner |
|---------|--------------|----------------------|-----------------------|-------|
| **Vercel (Preview / Staging / Production)** | **Pro plan** ($20/project/mo) | WAF managed rules, custom firewall/IP blocking, 30-day log retention with drains, Pro analytics & anomaly alerts, log drains to SIEM | Cost center **SEC-OPS-4521** / Finance contact `finance@urbanmanual.com` | Platform Engineering (`devops@urbanmanual.com`)
| **Supabase** | Pro ($25/project/mo) | Database encryption at rest, RLS, nightly backups, audit log export | Cost center **DATA-4207** | Data Platform (`data@urbanmanual.com`)
| **Cloudflare** | Pending upgrade to Pro | CDN, TLS, planned WAF failover | Cost center **SEC-OPS-4521** | Network Security (`security@urbanmanual.com`)

## Vercel Pro Reference

- **Plan confirmation**: Screenshot/CLI evidence required per `docs/security/vercel-pro-validation.md`.
- **Firewall allowlist**: `203.0.113.0/24` (Admin VPN), `35.226.0.0/16` (Supabase Edge Functions), `198.51.100.0/24` (Cloudflare Workers).
- **Log drains**: `https://logs.security.urbanmanual.com/v1/vercel` with token `LOG_DRAIN_TOKEN` (rotate quarterly).
- **Alert webhooks**: `https://alerts.urbanmanual.com/vercel/anomalies` with secret `VERCEL_ALERT_SECRET`.
- **Analytics**: Enable Pro Traffic Analytics + Anomaly Detection; review weekly per `vercel/monitoring.md`.

## Follow-on Tasks

1. **Cloudflare Pro**: Pending upgrade; add screenshot + configuration summary once billing approved.
2. **Supabase log streaming**: Evaluate Supabase Log Drains for parity with Vercel (target Q3). Note in `docs/security/vercel-pro-validation.md` if deferred.
