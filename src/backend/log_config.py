"""
Centralized Logging Configuration for P-WOS

Provides consistent log directory resolution and logger setup
across all services. Logs are organized into subdirectories:
  logs/app/   - Backend application logs
  logs/sim/   - Simulation logs
  logs/test/  - Test logs
"""

import logging
import os

# Project root: 2 levels up from src/backend/log_config.py
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def get_log_dir(category: str = "app") -> str:
    """
    Return the path to logs/<category>/, creating it if needed.
    
    Args:
        category: One of 'app', 'sim', or 'test'
    """
    log_dir = os.path.join(PROJECT_ROOT, "logs", category)
    os.makedirs(log_dir, exist_ok=True)
    return log_dir


def setup_logger(name: str, log_file: str, category: str = "app",
                 level: int = logging.INFO) -> logging.Logger:
    """
    Create and return a named logger that writes to logs/<category>/<log_file>.
    
    Also attaches a StreamHandler for console output.
    
    Args:
        name:     Logger name (e.g. "ESP32_Sim")
        log_file: Filename within the category dir (e.g. "esp32_simulator.log")
        category: Log subdirectory - 'app', 'sim', or 'test'
        level:    Logging level (default INFO)
    """
    log_dir = get_log_dir(category)
    log_path = os.path.join(log_dir, log_file)

    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Avoid adding duplicate handlers on repeated calls
    if not logger.handlers:
        fmt = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

        file_handler = logging.FileHandler(log_path, encoding='utf-8')
        file_handler.setLevel(level)
        file_handler.setFormatter(fmt)

        console_handler = logging.StreamHandler()
        console_handler.setLevel(level)
        console_handler.setFormatter(fmt)

        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

    return logger
