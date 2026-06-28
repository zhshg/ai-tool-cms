-- Search platform (Commits 051-060)

CREATE TABLE "search_query_logs" (
    "id" UUID NOT NULL,
    "query" VARCHAR(500) NOT NULL,
    "normalized_query" VARCHAR(500) NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "result_count" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "had_results" BOOLEAN NOT NULL,
    "semantic_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_query_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "search_click_logs" (
    "id" UUID NOT NULL,
    "query_log_id" UUID,
    "query" VARCHAR(500) NOT NULL,
    "tool_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_click_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tool_popularity_snapshots" (
    "id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "seo_score" INTEGER NOT NULL,
    "ai_score" INTEGER NOT NULL,
    "traffic_score" INTEGER NOT NULL,
    "freshness_score" INTEGER NOT NULL,
    "review_score" INTEGER NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_popularity_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "search_query_logs_query_idx" ON "search_query_logs"("query");
CREATE INDEX "search_query_logs_normalized_query_idx" ON "search_query_logs"("normalized_query");
CREATE INDEX "search_query_logs_had_results_idx" ON "search_query_logs"("had_results");
CREATE INDEX "search_query_logs_created_at_idx" ON "search_query_logs"("created_at");

CREATE INDEX "search_click_logs_query_log_id_idx" ON "search_click_logs"("query_log_id");
CREATE INDEX "search_click_logs_tool_id_idx" ON "search_click_logs"("tool_id");
CREATE INDEX "search_click_logs_query_idx" ON "search_click_logs"("query");
CREATE INDEX "search_click_logs_created_at_idx" ON "search_click_logs"("created_at");

CREATE INDEX "tool_popularity_snapshots_tool_id_idx" ON "tool_popularity_snapshots"("tool_id");
CREATE INDEX "tool_popularity_snapshots_overall_score_idx" ON "tool_popularity_snapshots"("overall_score");
CREATE INDEX "tool_popularity_snapshots_created_at_idx" ON "tool_popularity_snapshots"("created_at");

ALTER TABLE "search_click_logs" ADD CONSTRAINT "search_click_logs_query_log_id_fkey" FOREIGN KEY ("query_log_id") REFERENCES "search_query_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "search_click_logs" ADD CONSTRAINT "search_click_logs_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_popularity_snapshots" ADD CONSTRAINT "tool_popularity_snapshots_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
