# Threat Model

**AI Tool CMS — Sprint 11**

## Assets

- User credentials (JWT)
- API keys (`atcms_*`)
- Tool catalog database
- Webhook secrets
- AI provider API keys

## Trust Boundaries

```
Internet → CDN/Nginx → Web/API → Postgres/Redis/Meili
                    → Worker (internal)
```

## Threats & Controls

| Threat | Control |
|--------|---------|
| SQL Injection | Prisma parameterized queries |
| XSS | React escaping; CSP headers |
| CSRF | JWT Bearer; SameSite cookies |
| SSRF | URL validation on crawler |
| Brute force | Rate limiting |
| Token theft | Short JWT TTL; refresh rotation |
| Webhook replay | HMAC signature + timestamp |
