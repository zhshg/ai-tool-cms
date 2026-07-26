from datetime import datetime, timezone
from pathlib import Path

from scripts.crawlers.futurepedia.checkpoint import CheckpointStore
from scripts.crawlers.futurepedia.cleaners import clean_website_url, normalize_slug, sanitize_html
from scripts.crawlers.futurepedia.detail_parser import DetailParser
from scripts.crawlers.futurepedia.discovery import (
    discover_categories,
    parse_tool_urls,
    should_stop_pagination,
)
from scripts.crawlers.futurepedia.models import CheckpointState


FIXTURES = Path(__file__).parents[2] / "fixtures" / "futurepedia"


def test_clean_website_url_removes_tracking_but_keeps_business_query():
    raw = "https://example.com/app?id=7&utm_source=futurepedia&ref=fp"
    assert clean_website_url(raw) == "https://example.com/app?id=7"
    assert clean_website_url("https://futurepedia.io/tool/x") is None


def test_slug_and_html_cleaning():
    assert normalize_slug("  Hello---World!  ") == "hello-world"
    raw = '<script>x()</script><h2 onclick="x()">Title</h2><p>Body <a href="/docs">Docs</a></p>'
    assert sanitize_html(raw, "https://www.futurepedia.io/tool/x") == (
        '<h2>Title</h2><p>Body <a href="https://www.futurepedia.io/docs">Docs</a></p>'
    )


def test_html_cleaning_handles_nested_nodes_inside_removed_element():
    raw = '<button><span><strong>Visit</strong></span></button><p>Safe</p>'
    assert sanitize_html(raw, "https://www.futurepedia.io/tool/x") == "<p>Safe</p>"


def test_discovery_and_pagination_rules():
    html = '<a href="/ai-tools/productivity">Productivity</a><a href="/tool/a">A</a>'
    assert [item.slug for item in discover_categories(html)] == ["productivity"]
    assert parse_tool_urls(html) == ["https://www.futurepedia.io/tool/a"]
    assert should_stop_pagination({"a"}, {"a"}, True)
    assert should_stop_pagination(set(), {"a"}, True)
    assert should_stop_pagination({"b"}, {"a"}, False)


def test_parses_coralflavor_fixture():
    html = (FIXTURES / "coralflavor.html").read_text(encoding="utf-8")
    record = DetailParser().parse(
        html,
        "https://www.futurepedia.io/tool/coralflavor",
        datetime(2026, 7, 12, tzinfo=timezone.utc),
        "PUBLISHED",
    )
    assert record.name == "Coralflavor"
    assert str(record.website) == "https://coralflavor.com/"
    assert record.logoUrl is not None
    assert record.metadata.sourceCategories[0].slug == "chatbots"
    assert record.metadata.screenshots
    assert "script" not in record.longDescription
    assert len(record.summary) <= 120


def test_categories_do_not_include_global_navigation():
    html = '''<main><section><span>AI Categories:</span><a href="/ai-tools/chatbots">AI chatbots</a></section></main>
    <nav><a href="/ai-tools/productivity">Productivity Tools</a></nav>
    <a data-tool-name="X" href="https://example.com"><button>Visit Site</button></a><h1>X</h1>'''
    record = DetailParser().parse(html, "https://www.futurepedia.io/tool/x", datetime.now(timezone.utc), "DRAFT")
    assert [item.slug for item in record.metadata.sourceCategories] == ["chatbots"]


def test_checkpoint_round_trip(tmp_path):
    store = CheckpointStore(tmp_path / "checkpoint.json")
    store.save(CheckpointState(processedUrls=["https://x/tool/a"]))
    assert store.load().processedUrls == ["https://x/tool/a"]
