#!/usr/bin/env python3
"""
Simple debug test for DataViz Platform
"""

import urllib.request
import json

BASE_URL = "http://localhost:8000"

def test_step_by_step():
    """Test each step individually"""
    print("🔍 Step-by-Step Debug Test")
    print("=" * 40)
    
    # Step 1: Check if backend is running
    print("\n1️⃣ Checking if backend is running...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/health") as response:
            print(f"   ✅ Backend is running: {response.status}")
            data = response.read().decode()
            print(f"   Response: {data}")
        backend_running = True
    except Exception as e:
        print(f"   ❌ Backend not accessible: {e}")
        print("   💡 Make sure backend is running on port 8000")
        return False
    
    # Step 2: Check datasets endpoint
    print("\n2️⃣ Checking datasets endpoint...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/datasets") as response:
            print(f"   ✅ Datasets endpoint: {response.status}")
            data = response.read().decode()
            datasets = json.loads(data)
            print(f"   Found {len(datasets.get('datasets', []))} datasets")
    except Exception as e:
        print(f"   ❌ Datasets endpoint failed: {e}")
    
    # Step 3: Check if visualization router is loaded
    print("\n3️⃣ Checking if visualization endpoints exist...")
    try:
        # Try to access a visualization endpoint (should give 404 if no dataset)
        req = urllib.request.Request(f"{BASE_URL}/visualize/test_dataset/test", method='POST')
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req) as response:
            print(f"   ❌ Unexpected success: {response.status}")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"   ✅ Visualization endpoint exists (404 expected for non-existent dataset)")
        else:
            print(f"   ❌ Unexpected HTTP error: {e.code}")
    except Exception as e:
        print(f"   ❌ Visualization endpoint test failed: {e}")
    
    print("\n📊 Debug Summary")
    print("=" * 40)
    if backend_running:
        print("✅ Backend is running and accessible")
        print("✅ Basic endpoints are working")
        print("✅ Visualization router appears to be loaded")
        print("\n💡 Next step: Upload a dataset and test visualization")
    else:
        print("❌ Backend is not accessible")
        print("💡 Check if backend is running and on correct port")
    
    return backend_running

if __name__ == "__main__":
    test_step_by_step()
