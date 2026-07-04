# Production Backlog

Date: 2026-07-04
Project: AI Tool CMS
Source: `docs/15-launch/LaunchCandidate3.md`

## P0

- Production dataset expansion: active dataset is only 50 real tools, target is at least 500. Evidence: `docs/15-launch/Batch2_DatasetVerification.md`.
- Logo coverage: current logo coverage is 12%, target is at least 95%. Evidence: `docs/15-launch/Batch2_DatasetVerification.md`.
- Screenshot coverage: current screenshot coverage is 0%, target is at least 70%. Evidence: `docs/15-launch/Batch2_DatasetVerification.md`.
- Durable import workflow: no history, resume, retry, cancel, rollback, or job detail. Evidence: `docs/15-launch/Batch3_ImportVerification.md`.
- Real production domain and HTTPS: production env still points to `localhost`, and nginx is HTTP-only. Evidence: `docs/15-launch/Batch7_ProductionEnvironment.md`.
- Restore drill: restore readiness is documented but not proven. Evidence: `docs/15-launch/Batch7_ProductionEnvironment.md`.

## P1

- Trivy image scanning: production image vulnerability scan is not completed. Evidence: `docs/15-launch/Batch5_SecurityProof.md`.
- Swagger production exposure: `/api/docs` is publicly reachable. Evidence: `docs/15-launch/Batch5_SecurityProof.md`.
- Dependency advisories: High and Moderate findings still remain in dependency audit. Evidence: `docs/15-launch/Batch5_SecurityProof.md`.
- Import Queue operations proof: operations stack is healthy, but Import Queue is not implemented. Evidence: `docs/15-launch/Batch6_OperationsVerification.md`.
- Cloudflare, DNS, and SSL live validation: external edge setup is not configured or verified. Evidence: `docs/15-launch/Batch7_ProductionEnvironment.md`.
- Search Console, Bing, and IndexNow live setup: webmaster integrations are not production-connected. Evidence: `docs/15-launch/Batch7_ProductionEnvironment.md`.

## P2

- Alternatives coverage: current dataset verification reports 0% alternatives coverage. Evidence: `docs/15-launch/Batch2_DatasetVerification.md`.
- Use-case completion: a small number of tools still miss use cases. Evidence: `docs/15-launch/Batch2_DatasetVerification.md`.
- Monitoring sink integration: OTEL and Sentry hooks exist, but live sinks are unset. Evidence: `docs/15-launch/Batch7_ProductionEnvironment.md`.
- Alert routing proof: alert rules are documented, but no live alert provider evidence exists. Evidence: `docs/15-launch/Batch7_ProductionEnvironment.md`.
- Rollback drill evidence: rollback guide exists, but no verified drill evidence has been archived. Evidence: `docs/15-launch/Batch7_ProductionEnvironment.md`.
