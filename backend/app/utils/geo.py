"""
Geospatial utilities for ocean coordinate calculations.
"""

import math
from typing import List, Tuple

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance between two points on a sphere in kilometers.
    """
    radius = 6371.0  # Earth's mean radius in km

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return radius * c

def parse_bbox(bbox_str: str) -> Tuple[float, float, float, float]:
    """
    Parses a bounding box string formatted as 'min_lon,min_lat,max_lon,max_lat'.
    Returns: (min_lon, min_lat, max_lon, max_lat)
    """
    parts = [float(p.strip()) for p in bbox_str.split(",")]
    if len(parts) != 4:
        raise ValueError("Bounding box must contain 4 comma-separated numbers: min_lon,min_lat,max_lon,max_lat")
    min_lon, min_lat, max_lon, max_lat = parts
    if min_lon > max_lon or min_lat > max_lat:
        raise ValueError("Invalid bounding box: min coordinates exceed max coordinates")
    return min_lon, min_lat, max_lon, max_lat

def interpolate_line(
    start_lat: float, start_lon: float,
    end_lat: float, end_lon: float,
    n_points: int = 100
) -> List[Tuple[float, float, float]]:
    """
    Generates a list of (lat, lon, distance_km) points along a great circle or linear transect.
    """
    points = []
    total_dist = haversine_distance_km(start_lat, start_lon, end_lat, end_lon)
    
    for i in range(n_points):
        fraction = i / max(1, n_points - 1)
        lat = start_lat + fraction * (end_lat - start_lat)
        lon = start_lon + fraction * (end_lon - start_lon)
        dist = fraction * total_dist
        points.append((lat, lon, dist))
        
    return points
