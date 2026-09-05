"""
Comprehensive Verification Script for INCOIS Ocean Backend API Endpoints.
Tests all endpoints using actual NetCDF and index data.
"""

import sys
import json
from fastapi.testclient import TestClient

from app.main import app

def run_tests():
    client = TestClient(app)
    passed = 0
    failed = 0

    def check(name, resp, expected_status=200, validate_fn=None):
        nonlocal passed, failed
        print(f"\n--- Testing: {name} ---")
        print(f"Status: {resp.status_code}")
        if resp.status_code == expected_status:
            try:
                data = resp.json()
                if validate_fn:
                    validate_fn(data)
                print(f"PASS: {name}")
                passed += 1
            except Exception as e:
                print(f"FAIL (Validation Error): {name} -> {e}")
                failed += 1
        else:
            print(f"FAIL (HTTP Error): {name} -> {resp.text[:300]}")
            failed += 1

    # 1. Health
    check("Health Check", client.get("/health"), 200, lambda d: d["status"] == "healthy")

    # 2. Metadata Overview
    check(
        "Metadata Overview",
        client.get("/api/v1/metadata/overview"),
        200,
        lambda d: "spatial_coverage" in d and d["depth_levels_count"] == 36
    )

    # 3. Metadata Levels
    check(
        "Metadata Levels",
        client.get("/api/v1/metadata/levels"),
        200,
        lambda d: len(d["depth_levels"]) == 36 and len(d["time_steps"]) == 23
    )

    # 4. Model Slice (stride=8 for fast test)
    check(
        "Model Slice (thetao at surface)",
        client.get("/api/v1/model/slice?variable=thetao&time_index=0&depth_index=0&stride=8"),
        200,
        lambda d: d["variable"] == "thetao" and len(d["values"]) > 0
    )

    # 5. Model Point Profile
    check(
        "Model Point Profile (12N, 80E)",
        client.get("/api/v1/model/point-profile?latitude=12.0&longitude=80.0&time_index=22"),
        200,
        lambda d: len(d["profile"]) == 36
    )

    # 6. Model Vector Currents
    check(
        "Model Vector Currents (grid_step=15)",
        client.get("/api/v1/model/vector-currents?time_index=22&depth_index=0&grid_step=15"),
        200,
        lambda d: len(d["vectors"]) > 0 and "uo" in d["vectors"][0]
    )

    # 7. Model Transect
    check(
        "Model Transect (start=5.0,80.0 end=15.0,85.0)",
        client.get("/api/v1/model/transect?start_coord=5.0,80.0&end_coord=15.0,85.0&variable=thetao&num_samples=20"),
        200,
        lambda d: len(d["distances_km"]) == 20 and len(d["matrix"]) == 36
    )

    # 8. Argo Floats
    check(
        "Argo Floats List",
        client.get("/api/v1/argo/floats"),
        200,
        lambda d: d["total_floats"] > 0 and len(d["floats"]) > 0
    )

    # 9. Argo Trajectory
    check(
        "Argo Float Trajectory (WMO 1902669)",
        client.get("/api/v1/argo/floats/1902669/trajectory"),
        200,
        lambda d: d["wmo_id"] == "1902669" and len(d["trajectory"]) > 0
    )

    # 10. Argo Profile NetCDF
    check(
        "Argo Profile (R1902669_085)",
        client.get("/api/v1/argo/profiles/R1902669_085"),
        200,
        lambda d: len(d["data"]) > 0 and "temp" in d["data"][0]
    )

    # 11. Gliders List
    check(
        "Gliders List",
        client.get("/api/v1/gliders"),
        200,
        lambda d: d["total_gliders"] == 2
    )

    # 12. Glider Track
    check(
        "Glider Track (8901048)",
        client.get("/api/v1/gliders/8901048/track?downsample_factor=5"),
        200,
        lambda d: d["glider_id"] == "8901048" and len(d["track"]) > 0
    )

    # 13. Glider Profile NetCDF
    check(
        "Glider Profile (R8901048_20251220_187D)",
        client.get("/api/v1/gliders/8901048/profiles/R8901048_20251220_187D"),
        200,
        lambda d: len(d["data"]) > 0 and "doxy_umol_kg" in d["data"][0]
    )

    # 14. Observations Spatial Search
    check(
        "Observations Spatial Search",
        client.get("/api/v1/observations/spatial-search?bbox=40,-20,100,25"),
        200,
        lambda d: d["total_found"] > 0
    )

    # 15. Observations Catalog
    check(
        "Observations Catalog (page 1)",
        client.get("/api/v1/observations/catalog?page=1&page_size=10"),
        200,
        lambda d: len(d["items"]) == 10 and d["total_records"] > 0
    )

    # 16. Comparison Colocated Pairs
    check(
        "Comparison Colocated Pairs",
        client.get("/api/v1/comparison/colocated-pairs?spatial_tolerance_km=50.0"),
        200,
        lambda d: d["total_matched_pairs"] > 0
    )

    # 17. Comparison Dual Profile
    check(
        "Comparison Dual Profile (R1902669_085)",
        client.get("/api/v1/comparison/dual-profile?observation_type=argo&profile_id=R1902669_085"),
        200,
        lambda d: "validation_metrics" in d and len(d["levels"]) > 0
    )

    # 18. Comparison Statistics
    check(
        "Comparison Validation Statistics",
        client.get("/api/v1/comparison/statistics?variable=thetao"),
        200,
        lambda d: d["overall_rmse"] > 0
    )

    # 19. Analytics Alerts
    check(
        "Analytics Alerts",
        client.get("/api/v1/analytics/alerts?time_index=22"),
        200,
        lambda d: d["alerts_count"] > 0
    )

    # 20. Analytics Hovmoller
    check(
        "Analytics Hovmoller (12N, 80E)",
        client.get("/api/v1/analytics/hovmoller?latitude=12.0&longitude=80.0&variable=thetao"),
        200,
        lambda d: len(d["time_axis"]) == 23 and len(d["depth_axis"]) == 36
    )

    print("\n=======================================================")
    print(f"TEST SUMMARY: {passed} PASSED, {failed} FAILED")
    print("=======================================================")

    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
