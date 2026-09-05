"""
Serialization utilities for sanitizing NetCDF / NumPy data to valid JSON.

Ensures that NaN, Inf, byte strings, numpy scalars, and dates are safely converted.
"""

import math
from datetime import datetime, date
from typing import Any
import numpy as np

def sanitize_value(val: Any) -> Any:
    """Recursively converts a value to a JSON-compliant standard Python type."""
    if val is None:
        return None
    
    # Check for NaN / Inf
    if isinstance(val, (float, np.floating)):
        if math.isnan(val) or math.isinf(val) or abs(val) > 90000.0:
            return None
        return float(val)
    
    if isinstance(val, (int, np.integer)):
        return int(val)
    
    if isinstance(val, (bool, np.bool_)):
        return bool(val)
    
    if isinstance(val, bytes):
        try:
            return val.decode("utf-8").strip()
        except UnicodeDecodeError:
            return val.hex()
            
    if isinstance(val, (datetime, date)):
        return val.isoformat()
        
    if isinstance(val, np.ndarray):
        return [sanitize_value(x) for x in val.tolist()]
        
    if isinstance(val, (list, tuple)):
        return [sanitize_value(x) for x in val]
        
    if isinstance(val, dict):
        return {str(k): sanitize_value(v) for k, v in val.items()}
        
    return val

def clean_row_dict(d: dict) -> dict:
    """Sanitizes a dictionary representing a table row or record."""
    return {k: sanitize_value(v) for k, v in d.items()}
