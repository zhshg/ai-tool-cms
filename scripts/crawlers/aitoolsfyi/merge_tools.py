"""
aitoolsfyi 数据清洗与合并脚本

功能：
1. 读取中文版（含中英双描述）和英文版 JSON 文件
2. 以中文版为基础合并两份数据，交叉验证一致性
3. 清洗数据：去重、文本规范化、URL 校正、价格类型映射、空值处理
4. 输出为统一的 SQLite 数据库表，兼容 Prisma Tool 模型结构

在远程服务器上执行：
    python3 merge_tools.py
"""

import json
import re
import sqlite3
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path("/root/storage/imports/aitoolsfyi")
ZH_FILE = BASE_DIR / "tools_raw.json"
EN_FILE = BASE_DIR / "tools_raw_en.json"
DB_FILE = BASE_DIR / "tools_unified.db"

PRICING_MAP = {
    "Free": "FREE",
    "Freemium": "FREEMIUM",
    "Paid": "PAID",
    "Contact": "CONTACT",
}


def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def normalize_url(url: str) -> str:
    if not url:
        return ""
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    url = url.rstrip("/")
    return url


def map_pricing(raw: str) -> str:
    return PRICING_MAP.get(raw, "FREE")


def load_json(path: Path) -> dict:
    print(f"  读取 {path.name} ...", flush=True)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    start = time.time()
    print("=" * 60, flush=True)
    print("  aitoolsfyi 数据清洗与合并", flush=True)
    print("=" * 60, flush=True)

    # 1. 读取两份数据
    print("\n[1/5] 读取源数据...", flush=True)
    zh_data = load_json(ZH_FILE)
    en_data = load_json(EN_FILE)
    zh_tools = zh_data.get("items", [])
    en_tools = en_data.get("items", [])
    print(f"  中文版: {len(zh_tools)} 条", flush=True)
    print(f"  英文版: {len(en_tools)} 条", flush=True)

    # 2. 交叉验证一致性
    print("\n[2/5] 交叉验证数据一致性...", flush=True)
    zh_ids = {t["id"] for t in zh_tools}
    en_ids = {t["id"] for t in en_tools}
    only_zh = zh_ids - en_ids
    only_en = en_ids - zh_ids
    if only_zh:
        print(f"  ⚠ 仅中文版有: {len(only_zh)} 个ID", flush=True)
    if only_en:
        print(f"  ⚠ 仅英文版有: {len(only_en)} 个ID", flush=True)
    if not only_zh and not only_en:
        print(f"  ✓ 两份文件ID完全一致 ({len(zh_ids)} 个)", flush=True)

    # 3. 构建合并映射
    print("\n[3/5] 构建统一数据映射...", flush=True)
    en_by_id = {t["id"]: t for t in en_tools}
    merged = {}
    stats = Counter()

    for tool in zh_tools:
        tid = tool["id"]
        en_tool = en_by_id.get(tid, {})

        desc = clean_text(tool.get("description", "") or en_tool.get("description", ""))
        zh_desc = clean_text(tool.get("zhDescription", ""))
        name = clean_text(tool.get("name", ""))
        slug = tool.get("slug", "") or f"tool-{tid}"
        website = normalize_url(tool.get("website", ""))
        pricing = map_pricing(tool.get("pricingType", "Free"))
        is_ad = 1 if tool.get("isAd", False) else 0
        upvotes = tool.get("totalUpvotes", 0) or 0
        cats = tool.get("category", [])
        source_cat = tool.get("sourceCategory", "")
        has_zh = 1 if zh_desc else 0
        has_desc = 1 if desc else 0

        merged[tid] = {
            "id": tid,
            "slug": slug,
            "name": name,
            "description": desc,
            "zh_description": zh_desc,
            "website": website,
            "pricing_type": pricing,
            "is_ad": is_ad,
            "total_upvotes": upvotes,
            "source_category": source_cat,
            "categories": json.dumps(cats, ensure_ascii=False),
            "has_zh_description": has_zh,
            "has_description": has_desc,
            "status": "PUBLISHED",
            "meta_title": name,
            "meta_description": desc[:300] if desc else "",
        }

        stats["total"] += 1
        if has_zh:
            stats["has_zh"] += 1
        if desc:
            stats["has_desc"] += 1
        if pricing == "FREE":
            stats["free"] += 1
        elif pricing == "FREEMIUM":
            stats["freemium"] += 1
        elif pricing == "PAID":
            stats["paid"] += 1

    print(f"  合并完成: {len(merged)} 条唯一工具", flush=True)
    print(f"  有中文描述: {stats['has_zh']}", flush=True)
    print(f"  有英文描述: {stats['has_desc']}", flush=True)
    print(f"  价格分布: Free={stats['free']}, Freemium={stats['freemium']}, Paid={stats['paid']}", flush=True)

    # 4. 写入 SQLite 数据库
    print("\n[4/5] 写入 SQLite 数据库...", flush=True)
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)

    if DB_FILE.exists():
        DB_FILE.unlink()
        print(f"  已删除旧数据库", flush=True)

    conn = sqlite3.connect(str(DB_FILE))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    conn.executescript("""
        CREATE TABLE tools (
            id              INTEGER PRIMARY KEY,
            slug            TEXT NOT NULL,
            name            TEXT NOT NULL,
            description     TEXT,
            zh_description  TEXT,
            website         TEXT NOT NULL,
            pricing_type    TEXT NOT NULL CHECK (pricing_type IN ('FREE','FREEMIUM','PAID','CONTACT')),
            is_ad           INTEGER NOT NULL DEFAULT 0,
            total_upvotes   INTEGER NOT NULL DEFAULT 0,
            source_category TEXT,
            categories      TEXT NOT NULL DEFAULT '[]',
            has_zh_description INTEGER NOT NULL DEFAULT 0,
            has_description INTEGER NOT NULL DEFAULT 0,
            status          TEXT NOT NULL DEFAULT 'PUBLISHED',
            meta_title      TEXT,
            meta_description TEXT,
            metadata        TEXT NOT NULL DEFAULT '{}',
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
            deleted_at      TEXT
        );

        CREATE INDEX idx_tools_slug         ON tools(slug);
        CREATE INDEX idx_tools_pricing      ON tools(pricing_type);
        CREATE INDEX idx_tools_source_cat   ON tools(source_category);
        CREATE INDEX idx_tools_status       ON tools(status);
        CREATE INDEX idx_tools_has_zh       ON tools(has_zh_description);
        CREATE INDEX idx_tools_website      ON tools(website);
        CREATE INDEX idx_tools_upvotes      ON tools(total_upvotes);
    """)

    batch = []
    BATCH_SIZE = 500
    for tid in sorted(merged.keys()):
        t = merged[tid]
        batch.append((
            t["id"], t["slug"], t["name"], t["description"],
            t["zh_description"], t["website"], t["pricing_type"],
            t["is_ad"], t["total_upvotes"], t["source_category"],
            t["categories"], t["has_zh_description"], t["has_description"],
            t["status"], t["meta_title"], t["meta_description"],
            json.dumps({"source": "aitoolsfyi", "source_id": tid, "imported_at": datetime.now(timezone.utc).isoformat()}, ensure_ascii=False),
        ))
        if len(batch) >= BATCH_SIZE:
            conn.executemany(
                "INSERT INTO tools (id, slug, name, description, zh_description, website, pricing_type, is_ad, total_upvotes, source_category, categories, has_zh_description, has_description, status, meta_title, meta_description, metadata) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                batch,
            )
            batch = []
            print(f"    已写入 {len(batch)} 条...", flush=True)
    if batch:
        conn.executemany(
            "INSERT INTO tools (id, slug, name, description, zh_description, website, pricing_type, is_ad, total_upvotes, source_category, categories, has_zh_description, has_description, status, meta_title, meta_description, metadata) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            batch,
        )

    conn.commit()
    print(f"  ✓ 数据已提交 ({len(merged)} 条)", flush=True)

    # 5. 生成统计报告
    print("\n[5/5] 生成统计报告...", flush=True)

    conn.execute("ANALYZE")

    total = conn.execute("SELECT COUNT(*) FROM tools").fetchone()[0]
    by_pricing = conn.execute("SELECT pricing_type, COUNT(*) FROM tools GROUP BY pricing_type").fetchall()
    by_source = conn.execute("SELECT source_category, COUNT(*) FROM tools WHERE source_category != '' GROUP BY source_category ORDER BY COUNT(*) DESC").fetchall()
    with_zh = conn.execute("SELECT COUNT(*) FROM tools WHERE has_zh_description = 1").fetchone()[0]
    without_desc = conn.execute("SELECT COUNT(*) FROM tools WHERE has_description = 0").fetchone()[0]
    avg_upvotes = conn.execute("SELECT ROUND(AVG(total_upvotes), 1) FROM tools").fetchone()[0]

    print(f"\n  ✓ 数据库写入完成", flush=True)
    print(f"\n{'='*60}", flush=True)
    print(f"  统计报告", flush=True)
    print(f"{'='*60}", flush=True)
    print(f"  总工具数:       {total}", flush=True)
    print(f"  有中文描述:     {with_zh} ({with_zh*100/total:.1f}%)", flush=True)
    print(f"  无英文描述:     {without_desc}", flush=True)
    print(f"  平均Upvotes:    {avg_upvotes}", flush=True)
    print(f"\n  价格分布:", flush=True)
    for p, c in by_pricing:
        print(f"    {p}: {c} ({c*100/total:.1f}%)", flush=True)
    print(f"\n  来源分类 (前10):", flush=True)
    for cat, c in by_source[:10]:
        print(f"    {cat}: {c}", flush=True)

    conn.close()

    elapsed = time.time() - start
    print(f"\n{'='*60}", flush=True)
    print(f"  完成! 耗时 {elapsed:.1f}s", flush=True)
    print(f"  数据库: {DB_FILE}", flush=True)
    print(f"  大小: {DB_FILE.stat().st_size / 1024 / 1024:.1f} MB", flush=True)
    print(f"{'='*60}", flush=True)


if __name__ == "__main__":
    main()