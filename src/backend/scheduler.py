"""
P-WOS Background Scheduler
Handles periodic tasks such as:
1. Automated Model Retraining (Self-Learning)
2. Data cleanup (optional)
"""

import sys
import os
import time
import threading
import schedule
import logging
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the pipeline
from ai_service.retrain_pipeline import run_retraining_pipeline
from log_config import setup_logger

logger = setup_logger("PWOS_Scheduler", "scheduler.log", "app")

def job_retrain_model():
    logger.info("Starting scheduled model retraining...")
    try:
        run_retraining_pipeline()
        logger.info("Scheduled retraining completed.")
    except Exception as e:
        logger.error(f"Retraining failed: {e}")

class BackgroundScheduler:
    def __init__(self):
        self.running = False
        self.worker_thread = None

    def start(self):
        if self.running:
            return
        
        self.running = True
        
        # Define Schedule
        # For demo/testing purposes, we might want it more frequent.
        # But for prod: Every 24 hours? Or every week?
        # User said "self retrain", implying it just happens.
        
        # Let's do it every day at midnight
        schedule.every().day.at("00:00").do(job_retrain_model)
        
        # FOr testing now: also run every 6 hours
        schedule.every(6).hours.do(job_retrain_model)
        
        logger.info("Scheduler started. Jobs configured.")
        logger.info(f"Next run: {schedule.next_run()}")
        
        self.worker_thread = threading.Thread(target=self._run_loop, daemon=True)
        self.worker_thread.start()

    def _run_loop(self):
        while self.running:
            try:
                schedule.run_pending()
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
            time.sleep(60) # Check every minute

    def stop(self):
        self.running = False
        if self.worker_thread:
            self.worker_thread.join()
        logger.info("Scheduler stopped.")

# Singleton instance
scheduler = BackgroundScheduler()

if __name__ == "__main__":
    # Test run
    print("Testing Scheduler (Press Ctrl+C to stop)...")
    scheduler.start()
    
    # Run immediately for test
    logger.info("Forcing immediate run for verification...")
    job_retrain_model()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        scheduler.stop()
