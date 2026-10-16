# Armstrong MCP Deployment Guide

## Prerequisites

- Cloudflare account with Workers paid plan ($5/mo)
- Wrangler CLI installed and authenticated: `npx wrangler login`
- Custom domain `mcp.armstrong.so` configured in Cloudflare DNS
- Google CrUX API key (free, for Phase 5 performance metrics)

## Secrets Configuration

Set the CrUX API key as a Worker secret:

```bash
npx wrangler secret put CRUX_API_KEY
```

When prompted, paste your Google CrUX API key.

## Deployment Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Tests

```bash
npm test
npm run typecheck
```

### 3. Deploy to Cloudflare Workers

```bash
npx wrangler deploy
```

This deploys the Worker to `armstrong-mcp.{your-subdomain}.workers.dev`.

### 4. Configure Custom Domain

Add a custom domain route in Cloudflare Dashboard or via Wrangler:

```bash
npx wrangler routes add "mcp.armstrong.so/mcp" armstrong-mcp
```

Or manually in Cloudflare Dashboard:
1. Go to Workers & Pages > armstrong-mcp > Settings > Triggers
2. Add Custom Domain: `mcp.armstrong.so`
3. Add Route Pattern: `mcp.armstrong.so/mcp`

### 5. Configure Rate Limiting (Optional)

The `rate_limit` binding in `wrangler.jsonc` will show a warning until properly configured. This is a placeholder for future implementation.

To configure rate limiting:
1. Create a Workers Rate Limiting binding in Cloudflare Dashboard
2. Update `wrangler.jsonc` with the correct binding configuration

### 6. Configure WAF Rule (Kill Switch)

Add a WAF rule in Cloudflare Dashboard:

1. Go to Security > WAF > Custom Rules
2. Create rule: "Armstrong MCP Kill Switch"
3. Expression: `(http.request.uri.path eq "/mcp")`
4. Action: Block
5. Set rule to disabled by default

Enable this rule only in emergencies to block all MCP traffic.

## DNS Configuration

Ensure DNS records are set up in Cloudflare:

```
A/AAAA record: mcp.armstrong.so → Cloudflare Workers proxy
```

The Workers platform will handle routing automatically once the custom domain is added.

## Verification

Test the deployment:

```bash
# Initialize
curl -X POST https://mcp.armstrong.so/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

# List tools
curl -X POST https://mcp.armstrong.so/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

## Monitoring

- Check Workers Analytics in Cloudflare Dashboard
- Monitor error rates and request volume
- Set up alerts for high error rates or CPU usage

## Rollback

If issues occur, roll back to a previous deployment:

```bash
npx wrangler deployments list
npx wrangler rollback [deployment-id]
```

## Cost Estimates

- Workers Paid Plan: $5/mo (10M requests included)
- Additional requests: $0.50 per million
- CrUX API: Free
- Expected monthly cost: ~$5-10 for moderate usage

## Security Notes

- No authentication required (free, public MCP)
- SSRF protection built-in (blocks private IPs, IP literals, non-standard ports)
- Rate limiting: 30 calls/min, 500/day per IP (to be configured)
- WAF rule available as kill switch
- Secrets stored in Cloudflare Workers, never committed to git

## Support

For issues or questions:
- Check Worker logs: `npx wrangler tail`
- Review error analytics in Cloudflare Dashboard
- File issues in the armstrong-mcp repository
