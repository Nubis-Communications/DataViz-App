#!/usr/bin/env python3
"""
Quick test script to check backend API endpoints
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Health check: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_datasets():
    """Test datasets endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/datasets")
        print(f"✅ Datasets endpoint: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Found {len(data.get('datasets', []))} datasets")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Datasets endpoint failed: {e}")
        return False

def test_upload_sample():
    """Test file upload with sample data"""
    try:
        # Create sample CSV data
        sample_csv = "id,name,value\n1,Test1,100\n2,Test2,200\n3,Test3,300"
        
        files = {'file': ('test.csv', sample_csv, 'text/csv')}
        response = requests.post(f"{BASE_URL}/upload", files=files)
        
        print(f"✅ Upload test: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Dataset ID: {data.get('dataset_id')}")
            print(f"   Columns: {data.get('column_names')}")
            return data.get('dataset_id')
        else:
            print(f"   Error: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Upload test failed: {e}")
        return None

def test_visualization_endpoints(dataset_id):
    """Test visualization endpoints"""
    if not dataset_id:
        print("❌ No dataset ID to test visualization")
        return False
    
    try:
        # Test the test chart endpoint
        response = requests.post(f"{BASE_URL}/visualize/{dataset_id}/test")
        print(f"✅ Test chart endpoint: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Chart ID: {data.get('chart_id')}")
            print(f"   Chart Type: {data.get('chart_type')}")
            print(f"   Test Info: {data.get('test_info')}")
            return True
        else:
            print(f"   Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test chart endpoint failed: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Quick Backend API Test")
    print("=" * 40)
    
    # Test health
    if not test_health():
        print("❌ Backend is not healthy, stopping tests")
        return
    
    # Test datasets
    test_datasets()
    
    # Test upload
    dataset_id = test_upload_sample()
    
    # Test visualization if we have a dataset
    if dataset_id:
        test_visualization_endpoints(dataset_id)
    
    print("\n📊 Test Summary")
    print("=" * 40)
    print("✅ Backend is running and responding")
    if dataset_id:
        print(f"✅ Sample dataset created: {dataset_id}")
        print("✅ Visualization endpoints tested")
    else:
        print("❌ Failed to create sample dataset")

if __name__ == "__main__":
    main()
