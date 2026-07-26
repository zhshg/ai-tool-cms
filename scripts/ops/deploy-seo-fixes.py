from __future__ import annotations

import subprocess
from pathlib import Path


ROOT = Path(r"F:\project\ai-tool-cms")
KEY_PATH = Path.home() / ".ssh" / "codex_ed25519"
HOST = "root@154.48.226.152"
REMOTE_ROOT = "/opt/ai-tool-cms"

FILES = [
    (
        ROOT / "apps" / "web" / "src" / "lib" / "tool-page.ts",
        f"{REMOTE_ROOT}/apps/web/src/lib/tool-page.ts",
    ),
    (
        ROOT / "apps" / "web" / "src" / "lib" / "catalog.ts",
        f"{REMOTE_ROOT}/apps/web/src/lib/catalog.ts",
    ),
    (
        ROOT / "packages" / "search" / "src" / "bootstrap.ts",
        f"{REMOTE_ROOT}/packages/search/src/bootstrap.ts",
    ),
]


def run(command: list[str]) -> None:
    print("RUN>", " ".join(command))
    subprocess.run(command, check=True)


def main() -> None:
    for local_path, remote_path in FILES:
        run(
            [
                "scp",
                "-i",
                str(KEY_PATH),
                str(local_path),
                f"{HOST}:{remote_path}",
            ]
        )

    run(
        [
            "ssh",
            "-i",
            str(KEY_PATH),
            HOST,
            (
                f"cd {REMOTE_ROOT} && "
                "docker compose --env-file .env.production -f docker-compose.prod.yml build web api && "
                "docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate --no-deps web api && "
                "docker restart ai-tool-cms-nginx-1 && "
                "docker compose --env-file .env.production -f docker-compose.prod.yml ps nginx web api search-bootstrap"
            ),
        ]
    )


if __name__ == "__main__":
    main()
