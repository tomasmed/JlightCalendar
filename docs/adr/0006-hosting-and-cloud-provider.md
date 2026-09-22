# ADR 0006: Hosting Provider & Cloud Staging Strategy (Vercel)

## Status
Accepted

## Context
During initial development and staging:
1. We do not have custom domain DNS resolution configured yet.
2. We require a free-tier hosting platform that provides instant HTTPS subdomains.
3. We need automatic branch preview deployments to support the Human-in-the-Loop (HITL) "Show & Tell" PR review workflow.
4. We are using Next.js 15 and Turso (libSQL).

## Evaluated Alternatives
- **Vercel**: Native Next.js 15 creator, automatic `*.vercel.app` SSL domains, automatic preview URL generated for every git feature branch/PR, 1-click native Turso integration. Free tier includes 100GB bandwidth and unlimited deployments.
- **Render**: Free tier Web Service with `*.onrender.com` domain. Downside: Free tier spins down after 15 minutes of inactivity, causing 40-50s cold starts.
- **Fly.io**: Docker container running on edge hardware with `*.fly.dev` domain. Excellent for persistent connections, but requires CLI/Docker deployment workflows.
- **Railway**: Generous developer experience and persistent containers, but trial credit model is time-limited.

## Decision
Adopt **Vercel** as the primary cloud hosting and staging provider for V1:
- Immediate zero-DNS setup with `*.vercel.app` subdomains.
- Native integration with Next.js 15 and Turso environment variable syncing.
- Automatic per-branch preview environments allowing human maintainers to test PRs on physical phones/tablets before merging to `main`.
- For real-time updates: Use Edge runtime streaming or lightweight polling to respect serverless function limits.
- If persistent 24/7 long-lived container hosting is needed later, Docker packaging allows a 5-minute migration to Fly.io or self-hosted hardware.

## Consequences
- **Positive**: Zero initial hosting cost, instant preview links for staging tests, fastest possible development loop.
- **Negative**: Long-lived SSE connections must use Edge streaming or short-lived reconnect intervals to accommodate serverless constraints.
