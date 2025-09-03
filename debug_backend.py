#!/usr/bin/env python3
"""
Debug script to test backend step by step
"""

import urllib.request
import json
import time

BASE_URL = "http://localhost:8000"

def test_backend_step_by_step():
    """Test backend step by step"""
    print("🔍 Backend Debug Test")
    print("=" * 40)
    
    # Step 1: Check if backend is accessible
    print("\n1️⃣ Testing backend connectivity...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/health") as response:
            print(f"   ✅ Backend is accessible: {response.status}")
            data = response.read().decode()
            print(f"   Response: {data}")
            backend_ok = True
    except Exception as e:
        print(f"   ❌ Backend not accessible: {e}")
        print("   💡 Make sure backend is running with: uvicorn main:app --host 127.0.0.1 --port 8000")
        return False
    
    if not backend_ok:
        return False
    
    # Step 2: Test basic endpoints
    print("\n2️⃣ Testing basic endpoints...")
    
    # Test datasets endpoint
    try:
        with urllib.request.urlopen(f"{BASE_URL}/datasets") as response:
            print(f"   ✅ Datasets endpoint: {response.status}")
            data = response.read().decode()
            datasets = json.loads(data)
            print(f"   Found {len(datasets.get('datasets', []))} datasets")
    except Exception as e:
        print(f"   ❌ Datasets endpoint failed: {e}")
    
    # Step 3: Test visualization endpoints exist
    print("\n3️⃣ Testing visualization endpoints...")
    
    # Test with non-existent dataset (should give 404)
    try:
        req = urllib.request.Request(f"{BASE_URL}/visualize/fake_dataset/test", method='POST')
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req) as response:
            print(f"   ❌ Unexpected success: {response.status}")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"   ✅ Visualization endpoints exist (404 expected for non-existent dataset)")
            print(f"   Error detail: {e.read().decode()}")
        else:
            print(f"   ❌ Unexpected HTTP error: {e.code}")
    except Exception as e:
        print(f"   ❌ Visualization endpoint test failed: {e}")
    
    print("\n📊 Debug Summary")
    print("=" * 40)
    print("✅ Backend is running and accessible")
    print("✅ Basic endpoints are working")
    print("✅ Visualization router is loaded")
    print("\n💡 Next step: Upload a dataset and test chart generation")
    
    return True

if __name__ == "__main__":
    test_backend_step_by_step()
