import logging, sys
import os
from pathlib import Path
def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        # Ensure logs directory exists
        log_dir = Path(__file__).resolve().parents[2] / "logs"
        os.makedirs(log_dir, exist_ok=True)
        # Stream handler for console output
        stream_handler = logging.StreamHandler(sys.stdout)
        stream_handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)-8s | %(name)s | %(message)s", "%Y-%m-%dT%H:%M:%S"))
        logger.addHandler(stream_handler)
        # File handler for persistent logs
        file_handler = logging.FileHandler(log_dir / "app.log")
        file_handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)-8s | %(name)s | %(message)s", "%Y-%m-%dT%H:%M:%S"))
        logger.addHandler(file_handler)
        logger.setLevel(logging.DEBUG)
    return logger
