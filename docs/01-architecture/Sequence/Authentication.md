# Sequence: Authentication

> **Document Type:** Interaction Sequence  
> **Version:** 2.0.0  
> **Status:** Draft

---

## 1. Admin Login (JWT)

```mermaid
sequenceDiagram
    participant U as User
    participant ADM as apps/admin
    participant API as apps/api
    participant PG as PostgreSQL
    participant R as Redis

    U->>ADM: Enter email + password
    ADM->>API: POST /v1/auth/login
    API->>PG: Find user by email
    API->>API: Verify password hash
    API->>API: Sign access JWT (15m) + refresh token
    API->>R: Store refresh token session
    API-->>ADM: { accessToken, refreshToken, user }
    ADM->>ADM: Store tokens (httpOnly cookie or secure storage)
    ADM-->>U: Redirect to dashboard
```

---

## 2. Authenticated API Request

```mermaid
sequenceDiagram
    participant C as Client
    participant API as apps/api
    participant G as JwtAuthGuard
    participant P as PermissionsGuard
    participant H as Handler

    C->>API: PATCH /v1/tools/1 + Authorization Bearer
    API->>G: Validate JWT signature + expiry
    G->>G: Load user from payload
    G->>P: Check tools:update permission
    P-->>G: Allowed
    G->>H: Execute handler
    H-->>C: 200 Response
```

---

## 3. Token Refresh

```mermaid
sequenceDiagram
    participant ADM as apps/admin
    participant API as apps/api
    participant R as Redis

    ADM->>API: POST /v1/auth/refresh { refreshToken }
    API->>R: Validate refresh session exists
    API->>API: Issue new access JWT
    API-->>ADM: { accessToken }
```

---

## 4. API Key Authentication (Integrator)

```mermaid
sequenceDiagram
    participant DEV as Developer
    participant API as apps/api
    participant PG as PostgreSQL

    DEV->>API: GET /v1/tools + X-Api-Key header
    API->>PG: Lookup api_keys by hash
    API->>API: Validate not revoked / not expired
    API->>API: Attach scopes to request context
    API-->>DEV: 200 Paginated tools
```

---

## 5. RBAC Permission Matrix (Conceptual)

| Permission | admin | editor | viewer |
|---|---|---|---|
| `tools:create` | ● | ● | |
| `tools:update` | ● | ● | |
| `tools:publish` | ● | ● | |
| `tools:delete` | ● | | |
| `users:manage` | ● | | |
| `roles:manage` | ● | | |
| `crawler:run` | ● | | |
| `settings:manage` | ● | | |

● = granted

---

## 6. Security Controls

| Control | Implementation |
|---|---|
| Password storage | bcrypt or argon2 via `packages/auth` |
| JWT secret | `JWT_SECRET` env, rotation documented |
| Refresh token | Stored server-side in Redis; revocable |
| API key | Stored as hash; plaintext shown once on create |
| Rate limit | `POST /v1/auth/login` per IP |

---

## 7. Failure Scenarios

| Condition | Response |
|---|---|
| Invalid credentials | 401 `INVALID_CREDENTIALS` |
| Expired JWT | 401 `TOKEN_EXPIRED` → client refresh |
| Missing permission | 403 `FORBIDDEN` |
| Revoked API key | 401 `API_KEY_REVOKED` |

---

## Related Documents

- [RequestFlow.md](./RequestFlow.md)
- [DDD.md](./DDD.md) — Identity context
- [ADR/ADR-0003-nest.md](./ADR/ADR-0003-nest.md)
