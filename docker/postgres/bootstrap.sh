#!/bin/sh
set -eu

admin_user="${POSTGRES_ADMIN_USER:-$POSTGRES_USER}"
admin_password="${POSTGRES_ADMIN_PASSWORD:-$POSTGRES_PASSWORD}"
admin_db="${POSTGRES_ADMIN_DB:-postgres}"

export PGPASSWORD="$admin_password"

psql -v ON_ERROR_STOP=1 \
  -h postgres \
  -U "$admin_user" \
  -d "$admin_db" \
  --set=target_user="$POSTGRES_USER" \
  --set=target_password="$POSTGRES_PASSWORD" \
  --set=target_db="$POSTGRES_DB" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'target_user', :'target_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'target_user')
\gexec

ALTER ROLE :"target_user" WITH LOGIN PASSWORD :'target_password';

SELECT format('CREATE DATABASE %I OWNER %I', :'target_db', :'target_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'target_db')
\gexec

ALTER DATABASE :"target_db" OWNER TO :"target_user";
SQL

psql -v ON_ERROR_STOP=1 \
  -h postgres \
  -U "$admin_user" \
  -d "$POSTGRES_DB" \
  --set=target_user="$POSTGRES_USER" <<'SQL'
ALTER SCHEMA public OWNER TO :"target_user";
GRANT ALL ON SCHEMA public TO :"target_user";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO :"target_user";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO :"target_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO :"target_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO :"target_user";
SQL
