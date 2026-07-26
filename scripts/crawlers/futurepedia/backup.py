import os
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path

if '__file__' in globals():
    SCRIPT_DIR = Path(__file__).resolve().parent
else:
    SCRIPT_DIR = Path.cwd()
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
SOURCE_DIR = PROJECT_ROOT / "storage" / "crawler" / "futurepedia"
BACKUP_DIR = SOURCE_DIR / "backups"
BACKUP_INTERVAL = 600
FILES_TO_BACKUP = ["tools.json", "checkpoint.json", "errors.json"]
LOG_FILE = SCRIPT_DIR / "backup.log"


def log(msg):
    line = f"[{datetime.now().isoformat()}] {msg}\n"
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line)
    print(line.strip())


def backup():
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"backup_{timestamp}"
    backup_path.mkdir(exist_ok=True)
    
    copied = 0
    for filename in FILES_TO_BACKUP:
        source = SOURCE_DIR / filename
        if source.exists():
            target = backup_path / filename
            shutil.copy2(source, target)
            copied += 1
            log(f"备份: {filename} -> {target}")
        else:
            log(f"跳过(不存在): {filename}")
    
    return copied


def main():
    log(f"启动备份服务")
    log(f"  源目录: {SOURCE_DIR.resolve()}")
    log(f"  备份目录: {BACKUP_DIR.resolve()}")
    log(f"  备份间隔: {BACKUP_INTERVAL}秒 ({BACKUP_INTERVAL//60}分钟)")
    log(f"  监控文件: {', '.join(FILES_TO_BACKUP)}")
    log(f"等待采集器启动...")
    
    while True:
        try:
            copied = backup()
            if copied > 0:
                log(f"备份完成，共 {copied} 个文件")
        except Exception as e:
            log(f"备份出错: {e}")
        
        time.sleep(BACKUP_INTERVAL)


if __name__ == "__main__":
    main()