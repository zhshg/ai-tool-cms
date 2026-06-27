-- AI Tool CMS 数据库初始化脚本
-- 与 .env.example 中 DATABASE_URL 保持一致：
-- postgresql://user:password@localhost:5432/ai_tool_cms

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 后续 Schema 由 Prisma 迁移管理
