# Vercel Pro Monitoring & Incident Runbook

## Purpose
Ensure Urban Manual projects running on Vercel Pro stay compliant with the security baseline (WAF + firewall rules + analytics + log retention) and provide a clear escalation path.

## Weekly Review Checklist
1. **Traffic Analytics** (Vercel → Analytics)
   - Review Pro anomaly feed for traffic spikes >3σ.
   - Export CSV and attach to `evidence/vercel/analytics-week-<ISO-DATE>.csv`.
2. **WAF / Firewall Blocks** (Security → WAF & Firewall)
   - Confirm managed rule set is `ON` and last update <30 days.
   - Download block summary screenshot; save as `evidence/vercel/waf-<DATE>.png`.
3. **Log Drain Health** (Logs → Log Drains)
   - Verify last delivery status `OK`.
   - Run `curl https://logs.security.urbanmanual.com/v1/vercel/health` and store output in `evidence/vercel/log-drain-health-<DATE>.txt`.

## Token & Secret Rotation
- **LOG_DRAIN_TOKEN** and **VERCEL_ALERT_SECRET** rotate quarterly (Jan/Apr/Jul/Oct).
- Steps:
  1. Generate new secret via `scripts/generate_secret.ts`.
  2. Update destination (SIEM or alert system) first.
  3. Update Vercel settings (Log Drain or Alert webhook) and validate using test delivery.
  4. Record rotation evidence in `docs/security/vercel-pro-validation.md` under the relevant quarter.

## Incident Response Flow
1. **Detection**
   - Trigger from alert webhook, analytics anomaly, or SIEM correlation.
2. **Triage (within 15 min)**
   - Check `logs` → filter by request ID.
   - Validate if WAF blocked malicious IP; if not, add temporary block rule.
3. **Containment**
   - Adjust firewall rules or disable impacted deployment (Settings → Deployments → Rollback).
   - Notify `security@urbanmanual.com` and #sec-ops Slack channel.
4. **Eradication & Recovery**
   - Patch root cause, redeploy, verify WAF/log drains are still enabled.
5. **Post-Incident Review**
   - Document summary in `docs/security/incidents/<DATE>-<slug>.md`.
   - Update service matrix or runbook if new controls needed.

## Escalation Contacts
- **Primary**: Platform Engineering On-Call — `+1-415-555-0100`
- **Backup**: Security Operations — `security@urbanmanual.com`
- **Finance/Billing issues**: `finance@urbanmanual.com`

## References
- `DEPLOY_TO_VERCEL.md` → configuration checklist.
- `docs/security/service-matrix.md` → CIDR allowlist + cost centers.
- `docs/security/vercel-pro-validation.md` → evidence log & validation steps.
