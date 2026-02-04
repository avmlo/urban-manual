# Deploy to Vercel

## Quick Deploy via Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/new
   - Sign in with your GitHub account

2. **Import Repository**
   - Select "Import Git Repository"
   - Choose `avmlo/urban-manual`
   - Or paste: `https://github.com/avmlo/urban-manual.git`

3. **Configure Project**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `.` (project root)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Add Environment Variables**
   Go to Project Settings > Environment Variables and add:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GOOGLE_API_KEY=your_google_api_key
   ```
   
   Optional:
   ```
   DATABASE_URL=your_database_url
   POSTGRES_URL=your_postgres_url
   PAYLOAD_SECRET=your_payload_secret
   ADMIN_EMAILS=admin@example.com,another@example.com
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `your-project.vercel.app`

## Deploy via CLI

If you have Node.js and Vercel CLI installed:

```bash
# Install Vercel CLI globally (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (first time will configure project)
vercel

# Deploy to production
vercel --prod
```

## Post-Deployment

1. **Verify Environment Variables**
   - Visit `/api/health` on your deployed site
   - Should show all checks passing

2. **Test Key Features**
   - Homepage loads
   - Search works
   - Destination pages load
   - Authentication works

3. **Set up Custom Domain** (optional)
   - Go to Project Settings > Domains
   - Add your custom domain

## Harden the Vercel Pro Environment

Urban Manual is standardized on the **Vercel Pro** subscription for every preview, staging, and production project. Use the following checklist immediately after the first deploy (and any time a new project/environment is created):

| Capability | Where to Configure | Required Value |
|------------|-------------------|----------------|
| **Plan tier** | Settings → General → Plan | Set to **Pro** (owner-billed). Cost center: **SEC-OPS-4521 / $20 per project per month** |
| **Web Application Firewall (WAF)** | Settings → Security → WAF | Enable managed rules. Block OWASP Top 10 (SQLi, XSS) and enable bot protection. |
| **Firewall/IP rules** | Settings → Security → Firewall Rules | Block `0.0.0.0/0` except `allow` for `Cloudflare`, `Supabase`, and `Admin VPN` CIDR ranges listed in `docs/security/service-matrix.md`. |
| **Log retention** | Settings → Logs → Retention | Set to **30 days (Pro default)** and archive daily to the configured log drain. |
| **Edge/Traffic analytics** | Settings → Analytics | Enable Pro analytics, anomaly detection, and alert webhooks to `https://alerts.urbanmanual.com/vercel`. |
| **Log drains** | Settings → Logs → Log Drains | Send to `https://logs.security.urbanmanual.com/v1/vercel` (signed payload) and tag with project/environment. |
| **Alert webhooks** | Settings → Alerts | Add webhook `https://alerts.urbanmanual.com/vercel/anomalies`. Trigger on WAF blocks, latency spikes, and error rate >2%. |

> **Subscription tracking**: Record each project switch to Pro in `docs/security/service-matrix.md` (include environment, owner email, billing reference, and monthly spend). The finance owner for cost center **SEC-OPS-4521** is `finance@urbanmanual.com`.

### Firewall/IP Blocking Rules

1. Navigate to **Settings → Security → Firewall Rules**.
2. Add the following allow rules (priority order matters):
   - `Allow` **Admin VPN** `203.0.113.0/24` (Reason: operations access)
   - `Allow` **Supabase Edge Functions** `35.226.0.0/16`
   - `Allow` **Cloudflare Workers** `198.51.100.0/24`
3. Add a `Block` rule for `0.0.0.0/0` with action `Challenge` to force unknown IPs through WAF challenges.
4. Save and redeploy to propagate rules.

### Log Drains & Alerts

1. **Log Drains**
   - Destination: `https://logs.security.urbanmanual.com/v1/vercel`
   - Format: `JSON` with metadata. Include secrets `LOG_DRAIN_TOKEN`, rotate quarterly (see `vercel/monitoring.md`).
2. **Alert Webhooks**
   - Endpoint: `https://alerts.urbanmanual.com/vercel/anomalies`
   - Secret: `VERCEL_ALERT_SECRET`
   - Events: Deployment failed, WAF block spike (>50 blocks/min), log drain failure, traffic anomaly >3σ.

Document evidence of each configuration (screenshots or CLI outputs) in `docs/security/vercel-pro-validation.md`.

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify `package.json` has correct build script

### Runtime Errors
- Check function logs in Vercel dashboard
- Verify environment variables are accessible
- Check browser console for client-side errors

### Environment Variables Not Working
- Ensure `NEXT_PUBLIC_` prefix for client-side variables
- Redeploy after adding new environment variables
- Check for typos in variable names

