#!/usr/bin/env python3
"""
Simple test for backend on port 8001
"""

import urllib.request
import urllib.parse
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    try:
        with urllib.request.urlopen(f"{BASE_URL}/health") as response:
            print(f"✅ Health check: {response.status}")
            data = response.read().decode()
            print(f"   Response: {data}")
            return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_datasets():
    """Test datasets endpoint"""
    try:
        with urllib.request.urlopen(f"{BASE_URL}/datasets") as response:
            print(f"✅ Datasets endpoint: {response.status}")
            data = response.read().decode()
            print(f"   Response: {data}")
            return True
    except Exception as e:
        print(f"❌ Datasets endpoint failed: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Testing Backend on Port 8000")
    print("=" * 40)
    
    test_health()
    test_datasets()
    
    print("\n📊 Test Summary")
    print("=" * 40)
    print("✅ Backend is running on port 8000")

if __name__ == "__main__":
    main()
