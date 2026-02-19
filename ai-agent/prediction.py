import numpy as np
from datetime import datetime, timedelta

def predict_wait(patients_before, avg_service_time, time_of_day=None):
    """
    Predict waiting time based on queue length and time of day
    """
    base_wait = patients_before * avg_service_time
    
    # Time-based adjustments (rush hours)
    if time_of_day:
        hour = time_of_day.hour
        if 9 <= hour <= 11 or 14 <= hour <= 16:  # Peak hours
            base_wait *= 1.3
        elif 12 <= hour <= 13:  # Lunch hour
            base_wait *= 1.2
    
    return round(base_wait, 2)

def predict_completion_time(token_time, position, avg_service_time):
    """
    Predict when a token will be completed
    """
    estimated_minutes = position * avg_service_time
    completion_time = token_time + timedelta(minutes=estimated_minutes)
    return completion_time.isoformat()