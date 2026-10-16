# Armstrong MCP Deployment Guide

## Prerequisites

- Cloudflare account with Workers paid plan ($5/mo)
- Wrangler CLI installed and authenticated: `npx wrangler login`
- Custom domain `mcp.armstrong.so` configured in Cloudflare DNS
- Google CrUX API key (free, for Core Web Vitals metrics)

## Secrets Configuration

Set the CrUX API key as a Worker secret:

```bash
npx wrangler secret put CRUX_API_KEY
```

When prompted, paste your Google CrUX API key obtained from:
https://console.cloud.google.com/apis/credentials

The `scorecard_26` tool will degrade gracefully without this key, showing "CrUX unavailable" for Web Vitals metrics.

## Deployment Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Tests and Checks

```bash
npm test
npm run typecheck
npm run lint  # if lint script exists
```

All checks must pass before deployment.

### 3. Deploy to Cloudflare Workers

```bash
npx wrangler deploy
```

This deploys the Worker to `armstrong-mcp.{your-subdomain}.workers.dev` initially.

### 4. Configure Custom Domain

The `wrangler.jsonc` is already configured for `mcp.armstrong.so`. After deployment:

1. Go to Cloudflare Dashboard > Workers & Pages > armstrong-mcp
2. Settings > Triggers > Custom Domains
3. Add domain: `mcp.armstrong.so`
4. Cloudflare will automatically create the DNS record

Or via Wrangler:
```bash
npx wrangler domains add mcp.armstrong.so
```

### 5. Verify Deployment

Test the deployed endpoint:

```bash
# Initialize
curl -X POST https://mcp.armstrong.so/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

# List tools (should return 6 tools)
curl -X POST https://mcp.armstrong.so/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

## Rate Limiting

**Current Implementation:** In-memory rate limiting per Worker instance.

**Limits:**
- Tools: 30 calls/minute, 500/day per IP
- Resources: 120 calls/minute, 10000/day per IP

**For Production (Optional Enhancement):**

To implement distributed rate limiting across multiple Worker instances:

1. **Option A: Workers Rate Limiting API** (Recommended)
   - Add to `wrangler.jsonc`:
     ```json
     {
       "rate_limit": {
         "binding": "RATE_LIMITER"
       }
     }
     ```
   - Update `src/rate-limit.ts` to use the binding
   - Configure limits in Cloudflare Dashboard

2. **Option B: Durable Objects**
   - Create a rate limiting Durable Object
   - Store counters per IP with automatic cleanup
   - Higher consistency, more cost

3. **Option C: KV with Expiration**
   - Use Workers KV for distributed counters
   - Set TTL on keys
   - Lower consistency, lower cost

The current in-memory approach works well for moderate traffic and single-region deployments.

## WAF Configuration (Kill Switch)

Add a WAF rule as an emergency kill switch:

1. Go to Security > WAF > Custom Rules
2. Create rule: **"Armstrong MCP Kill Switch"**
3. Rule expression:
   ```
   (http.host eq "mcp.armstrong.so" and http.request.uri.path eq "/mcp")
   ```
4. Action: **Block**
5. **Set to Disabled** by default
6. Note the rule ID for emergency use

**In an emergency:** Enable this rule to immediately block all MCP traffic while keeping the site accessible.

## DNS Configuration

DNS is automatically configured when you add the custom domain. Verify:

```
mcp.armstrong.so → Cloudflare Workers (proxied)
```

The Workers platform handles all routing once the custom domain is added.

## Monitoring & Observability

### Workers Analytics
- View in Cloudflare Dashboard > Workers & Pages > armstrong-mcp > Metrics
- Monitor: request count, error rate, CPU time, duration

### Real-time Logs
```bash
npx wrangler tail
```

### Set Up Alerts
1. Go to Notifications
2. Create alert for "Worker Errors Exceeded"
3. Set threshold (e.g., >5% error rate)
4. Add email/webhook notification

### Key Metrics to Monitor
- Error rate (target: <1%)
- P95 duration (target: <2s)
- Rate limit rejections
- CrUX API failures

## Cost Estimates

**Workers Paid Plan:** $5/mo includes:
- 10M requests
- 30M CPU milliseconds
- Custom domains

**Additional Costs:**
- Requests: $0.50 per million after 10M
- CPU time: $0.02 per million CPU ms after 30M
- CrUX API: Free (Google Cloud)

**Expected Monthly Cost:** $5-10 for moderate usage (100k-1M requests/month)

## Rollback Procedure

If issues occur after deployment:

```bash
# List recent deployments
npx wrangler deployments list

# Rollback to previous version
npx wrangler rollback [deployment-id]
```

Rollbacks are instant and affect all traffic immediately.

## Security Notes

### Authentication
- **Public server:** No authentication required
- All tools are read-only (no writes to external systems)
- Rate limiting prevents abuse

### SSRF Protection (Built-in)
- Blocks IP literals (127.0.0.1, 192.168.x.x, etc.)
- Blocks private IP ranges
- Blocks non-HTTP(S) protocols
- Only ports 80 and 443 allowed
- Validates after each redirect

### Data Privacy
- No user data stored
- No PII collected
- Cache keys are URL-based only
- Logs contain only: tool name, origin host, duration

### Secrets Management
- CrUX API key stored as Worker secret (encrypted at rest)
- Never logged or exposed in responses
- Injected at runtime only

## Troubleshooting

### "CrUX unavailable" in scorecard
- Verify secret is set: `npx wrangler secret list`
- Check CrUX API quota in Google Console
- Ensure API key has Chrome UX Report API enabled

### Rate limit false positives
- Check CF-Connecting-IP header
- Verify IP isn't shared (VPN, proxy)
- Adjust limits in `src/rate-limit.ts` if needed

### Tools returning errors
- Check `npx wrangler tail` for error details
- Verify target URL is accessible
- Check SSRF guards aren't blocking legitimate hosts

### Deployment fails
- Run `npm test` locally first
- Check wrangler.jsonc syntax (JSONC allows comments)
- Verify custom domain ownership in Cloudflare

## Support

For issues or questions:
- Check Worker logs: `npx wrangler tail`
- Review analytics in Cloudflare Dashboard
- Check deployment history: `npx wrangler deployments list`
- File issues in the armstrong-mcp repository

## Post-Deployment Checklist

- [ ] All 6 tools working (`tools/list` returns 6 items)
- [ ] Resources fetching from GitHub
- [ ] CrUX API key configured (or degrading gracefully)
- [ ] Rate limiting functional
- [ ] WAF kill switch created (disabled)
- [ ] Custom domain responding
- [ ] Monitoring alerts configured
- [ ] Team notified of deployment
