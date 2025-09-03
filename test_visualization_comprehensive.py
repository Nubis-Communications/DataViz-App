#!/usr/bin/env python3
"""
Comprehensive test script for DataViz Platform visualization
This script creates dummy data and tests all visualization endpoints
"""

import urllib.request
import urllib.parse
import json
import base64

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

def create_dummy_csv():
    """Create comprehensive dummy CSV data"""
    csv_content = """id,name,value,score,category,date
1,Product A,150.5,85.2,Electronics,2024-01-15
2,Product B,89.99,92.1,Clothing,2024-01-16
3,Product C,234.75,78.9,Electronics,2024-01-17
4,Product D,45.50,95.3,Books,2024-01-18
5,Product E,189.99,87.6,Electronics,2024-01-19
6,Product F,67.25,91.2,Clothing,2024-01-20
7,Product G,312.00,82.4,Electronics,2024-01-21
8,Product H,23.99,96.8,Books,2024-01-22
9,Product I,156.75,88.9,Clothing,2024-01-23
10,Product J,445.50,79.1,Electronics,2024-01-24
11,Product K,78.25,93.7,Books,2024-01-25
12,Product L,267.99,84.2,Electronics,2024-01-26
13,Product M,34.50,97.1,Books,2024-01-27
14,Product N,198.75,86.3,Clothing,2024-01-28
15,Product O,523.00,81.5,Electronics,2024-01-29"""
    
    return csv_content

def upload_dummy_data():
    """Upload dummy data to backend"""
    try:
        csv_content = create_dummy_csv()
        
        # Create multipart form data
        boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
        data = []
        data.append(f'--{boundary}'.encode())
        data.append(b'Content-Disposition: form-data; name="file"; filename="dummy_data.csv"')
        data.append(b'Content-Type: text/csv')
        data.append(b'')
        data.append(csv_content.encode())
        data.append(f'--{boundary}--'.encode())
        data.append(b'')
        
        body = b'\r\n'.join(data)
        
        # Create request
        req = urllib.request.Request(f"{BASE_URL}/upload")
        req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
        req.add_header('Content-Length', str(len(body)))
        req.data = body
        
        with urllib.request.urlopen(req) as response:
            print(f"✅ Upload test: {response.status}")
            if response.status == 200:
                data = response.read().decode()
                result = json.loads(data)
                print(f"   Dataset ID: {result.get('dataset_id')}")
                print(f"   Rows: {result.get('rows')}")
                print(f"   Columns: {result.get('column_names')}")
                return result.get('dataset_id')
            else:
                print(f"   Error: {response.read().decode()}")
                return None
                
    except Exception as e:
        print(f"❌ Upload test failed: {e}")
        return None

def test_visualization_endpoints(dataset_id):
    """Test all visualization endpoints"""
    if not dataset_id:
        print("❌ No dataset ID to test visualization")
        return False
    
    print(f"\n🔄 Testing visualization endpoints for dataset: {dataset_id}")
    
    # Test 1: Test chart endpoint
    print("\n1️⃣ Testing /test endpoint...")
    try:
        req = urllib.request.Request(f"{BASE_URL}/visualize/{dataset_id}/test", method='POST')
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req) as response:
            print(f"   ✅ Test chart endpoint: {response.status}")
            if response.status == 200:
                data = response.read().decode()
                result = json.loads(data)
                print(f"      Chart ID: {result.get('chart_id')}")
                print(f"      Chart Type: {result.get('chart_type')}")
                print(f"      Test Info: {result.get('test_info')}")
                return True
            else:
                print(f"      ❌ Error: {response.read().decode()}")
                return False
                
    except Exception as e:
        print(f"      ❌ Test chart endpoint failed: {e}")
        return False

def test_chart_generation(dataset_id):
    """Test actual chart generation"""
    print(f"\n2️⃣ Testing chart generation...")
    
    # Test chart configuration
    chart_config = {
        "id": "test_bar_chart",
        "type": "bar",
        "title": "Test Bar Chart - Product Values",
        "xAxis": "name",
        "yAxis": "value",
        "customizations": {
            "theme": "plotly_white",
            "colorPalette": "default",
            "opacity": 0.8,
            "showGrid": True,
            "showLegend": True,
            "showLabels": False,
            "fontSize": 12,
            "width": 600,
            "height": 400
        },
        "enabled": True
    }
    
    try:
        req = urllib.request.Request(f"{BASE_URL}/visualize/{dataset_id}/generate", method='POST')
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps(chart_config).encode()
        
        with urllib.request.urlopen(req) as response:
            print(f"   ✅ Chart generation: {response.status}")
            if response.status == 200:
                data = response.read().decode()
                result = json.loads(data)
                print(f"      Chart ID: {result.get('chart_id')}")
                print(f"      Chart Type: {result.get('chart_type')}")
                print(f"      Generated at: {result.get('generated_at')}")
                print(f"      Plot data keys: {list(result.get('plot_data', {}).keys())}")
                return True
            else:
                print(f"      ❌ Error: {response.read().decode()}")
                return False
                
    except Exception as e:
        print(f"      ❌ Chart generation failed: {e}")
        return False

def test_error_handling(dataset_id):
    """Test error handling with invalid data"""
    print(f"\n3️⃣ Testing error handling...")
    
    # Test with non-existent columns
    invalid_chart = {
        "id": "invalid_chart",
        "type": "bar",
        "title": "Invalid Chart",
        "xAxis": "non_existent_column",
        "yAxis": "another_fake_column",
        "customizations": {},
        "enabled": True
    }
    
    try:
        req = urllib.request.Request(f"{BASE_URL}/visualize/{dataset_id}/generate", method='POST')
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps(invalid_chart).encode()
        
        with urllib.request.urlopen(req) as response:
            print(f"   ✅ Error handling test: {response.status}")
            if response.status == 400:
                data = response.read().decode()
                result = json.loads(data)
                print(f"      Expected error: {result.get('detail')}")
                return True
            else:
                print(f"      ❌ Unexpected response: {response.status}")
                print(f"      Response: {response.read().decode()}")
                return False
                
    except urllib.error.HTTPError as e:
        if e.code == 400:
            print(f"   ✅ Error handling working correctly!")
            print(f"      Error: {e.read().decode()}")
            return True
        else:
            print(f"   ❌ Unexpected HTTP error: {e.code}")
            return False
    except Exception as e:
        print(f"      ❌ Error handling test failed: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 DataViz Platform - Comprehensive Visualization Test")
    print("=" * 70)
    
    # Test health
    if not test_health():
        print("❌ Backend is not healthy, stopping tests")
        return
    
    # Upload dummy data
    dataset_id = upload_dummy_data()
    if not dataset_id:
        print("❌ Cannot proceed without test dataset")
        return
    
    # Test visualization endpoints
    test_success = test_visualization_endpoints(dataset_id)
    
    # Test chart generation
    chart_success = test_chart_generation(dataset_id)
    
    # Test error handling
    error_success = test_error_handling(dataset_id)
    
    # Summary
    print(f"\n📊 Test Summary")
    print("=" * 70)
    print(f"✅ Dataset created: {dataset_id}")
    print(f"✅ Test endpoint: {'Working' if test_success else 'Failed'}")
    print(f"✅ Chart generation: {'Working' if chart_success else 'Failed'}")
    print(f"✅ Error handling: {'Working' if error_success else 'Failed'}")
    
    if test_success and chart_success and error_success:
        print("\n🎉 All tests passed! Visualization backend is working correctly.")
        print(f"\n💡 You can now test the frontend with dataset ID: {dataset_id}")
    else:
        print(f"\n⚠️ Some tests failed. Check the output above for details.")
        print(f"\n🔍 Check the backend terminal for error messages and logs.")

if __name__ == "__main__":
    main()
