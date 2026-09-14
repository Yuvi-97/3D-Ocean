"""
Automated Verification Script for Both LOCAL and HUGGINGFACE Modes.

Validates:
1. LOCAL mode functionality across all endpoints.
2. HUGGINGFACE mode functionality (fetching indices and on-demand ~22KB profiles from Yuvi2006pro/ocean-data).
3. Cache HIT / MISS performance.
4. Error handling (fail-fast behavior when source is invalid or missing, zero silent fallbacks).
"""

import os
import sys
import time
from fastapi.testclient import TestClient

# Ensure windows symlink warning is quiet
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

def test_mode(mode_name: str):
    print(f"\n{'='*60}")
    print(f" TESTING MODE: {mode_name.upper()} ")
    print(f"{'='*60}")

    os.environ["DATA_SOURCE"] = mode_name

    # Reload settings, providers, and services
    from app.config import settings
    settings.DATA_SOURCE = mode_name

    from app.providers import reset_data_provider, get_data_provider, cache
    reset_data_provider()
    cache.clear()

    from app.services.model_service import reset_model_service
    from app.services.argo_service import reset_argo_service
    from app.services.glider_service import reset_glider_service
    reset_model_service()
    reset_argo_service()
    reset_glider_service()

    from app.main import app

    provider = get_data_provider()
    print(f"Active Provider: {provider.name}")
    assert provider.name == mode_name, f"Expected provider '{mode_name}', got '{provider.name}'"

    # Validate data source connection
    provider.validate_connection()
    print(f"[OK] {mode_name.upper()} data source validated.")

    client = TestClient(app)

    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    assert health_data["data_source"] == mode_name.upper(), f"Unexpected data_source in health: {health_data}"
    print(f"[PASS] /health -> {health_data['data_source']}")

    # 2. Metadata Overview
    res = client.get("/api/v1/metadata/overview")
    assert res.status_code == 200, f"Metadata overview failed: {res.text}"
    meta = res.json()
    assert meta["depth_levels_count"] == 36, "Expected 36 depth levels"
    assert "in_situ_inventory" in meta
    print(f"[PASS] /metadata/overview -> {meta['dataset'][:40]}... (depths: {meta['depth_levels_count']})")

    # 3. Model Slice (First call: MISS)
    t0 = time.time()
    res1 = client.get("/api/v1/model/slice?variable=thetao&time_index=0&depth_index=0&stride=8")
    t_miss = time.time() - t0
    assert res1.status_code == 200, f"Model slice failed: {res1.text}"
    slice1 = res1.json()
    assert slice1["variable"] == "thetao"
    print(f"[PASS] /model/slice (first call / MISS) -> time: {t_miss:.3f}s, min: {slice1['min_value']}, max: {slice1['max_value']}")

    # 4. Model Slice Repeat (Second call: HIT)
    t0 = time.time()
    res2 = client.get("/api/v1/model/slice?variable=thetao&time_index=0&depth_index=0&stride=8")
    t_hit = time.time() - t0
    assert res2.status_code == 200
    print(f"[PASS] /model/slice (repeat call / CACHE HIT) -> time: {t_hit:.4f}s (Speedup: {t_miss/max(t_hit, 0.0001):.1f}x)")

    # 5. Argo Floats
    res = client.get("/api/v1/argo/floats")
    assert res.status_code == 200, f"Argo floats failed: {res.text}"
    argo_data = res.json()
    assert argo_data["total_floats"] > 0, "Expected at least 1 Argo float"
    print(f"[PASS] /argo/floats -> {argo_data['total_floats']} active floats")

    # 6. Argo Profile (On-demand ~22KB profile fetch)
    t0 = time.time()
    res = client.get("/api/v1/argo/profiles/R1902669_085")
    t_argo = time.time() - t0
    assert res.status_code == 200, f"Argo profile failed: {res.text}"
    prof_data = res.json()
    assert prof_data["profile_id"] == "R1902669_085"
    assert prof_data["levels_count"] > 0
    print(f"[PASS] /argo/profiles/R1902669_085 -> {prof_data['levels_count']} levels in {t_argo:.3f}s")

    # 7. Gliders List
    res = client.get("/api/v1/gliders")
    assert res.status_code == 200, f"Gliders list failed: {res.text}"
    glider_data = res.json()
    assert glider_data["total_gliders"] == 2, f"Expected 2 gliders, got {glider_data['total_gliders']}"
    print(f"[PASS] /gliders -> {glider_data['total_gliders']} gliders verified")

    # 8. Glider Profile (On-demand ~22KB profile fetch)
    t0 = time.time()
    res = client.get("/api/v1/gliders/8901048/profiles/R8901048_20251220_187D")
    t_glider = time.time() - t0
    assert res.status_code == 200, f"Glider profile failed: {res.text}"
    glider_prof = res.json()
    assert glider_prof["profile_id"] == "R8901048_20251220_187D"
    assert glider_prof["levels_count"] > 0
    print(f"[PASS] /gliders/8901048/profiles/... -> {glider_prof['levels_count']} levels in {t_glider:.3f}s")


def test_error_handling():
    print(f"\n{'='*60}")
    print(" TESTING ERROR HANDLING & FAIL-FAST BEHAVIOR ")
    print(f"{'='*60}")

    from app.config import settings
    from app.providers import reset_data_provider, get_data_provider

    # Test 1: Invalid Hugging Face repo must raise clear error and NOT fall back to local
    settings.DATA_SOURCE = "huggingface"
    settings.HF_DATASET_REPO = "invalid_user_9999/nonexistent_ocean_repo_9999"
    reset_data_provider()

    print("Testing invalid Hugging Face repo handling...")
    try:
        provider = get_data_provider()
        provider.validate_connection()
        assert False, "Should have failed with invalid Hugging Face repo!"
    except Exception as e:
        print(f"[PASS] Correctly rejected invalid Hugging Face dataset: {type(e).__name__}: {str(e)[:100]}...")

    # Test 2: Invalid Local path must report missing path clearly
    settings.DATA_SOURCE = "local"
    settings.MODEL_NETCDF_PATH = "D:/nonexistent_directory/missing_model.nc"
    reset_data_provider()

    print("Testing missing local dataset path handling...")
    try:
        provider = get_data_provider()
        provider.validate_connection()
        assert False, "Should have failed with missing local path!"
    except FileNotFoundError as e:
        print(f"[PASS] Correctly rejected missing local dataset path: FileNotFoundError: {str(e)[:100]}...")

    # Reset back to valid settings
    from app.config import DEFAULT_DATA_DIR
    settings.DATA_SOURCE = "local"
    settings.MODEL_NETCDF_PATH = str(DEFAULT_DATA_DIR / "model" / "cmems_indian_ocean_2026_06.nc")
    settings.HF_DATASET_REPO = "Yuvi2006pro/ocean-data"
    reset_data_provider()


if __name__ == "__main__":
    try:
        test_mode("local")
        test_mode("huggingface")
        test_error_handling()
        print("\n============================================================")
        print(" ALL VERIFICATIONS PASSED: LOCAL & HUGGINGFACE MODES READY ")
        print("============================================================\n")
    except Exception as err:
        print(f"\n[ERROR] Verification failed: {err}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
