"""
Vapor Pressure Deficit (VPD) Calculator
"""
import math

def calculate_vpd(temperature_c: float, humidity: float) -> float:
    """
    Calculate Vapor Pressure Deficit (VPD) in kPa.
    
    Args:
        temperature_c: Temperature in Celsius
        humidity: Relative Humidity in % (0-100)
        
    Returns:
        float: VPD in kPa
    """
    # Saturation Vapor Pressure (SVP) in kPa
    # formula: 0.61078 * exp((17.27 * T) / (T + 237.3))
    svp = 0.61078 * math.exp((17.27 * temperature_c) / (temperature_c + 237.3))
    
    # Actual Vapor Pressure (AVP)
    avp = svp * (humidity / 100.0)
    
    # VPD = SVP - AVP
    vpd = svp - avp
    
    return round(max(0.0, vpd), 2)
