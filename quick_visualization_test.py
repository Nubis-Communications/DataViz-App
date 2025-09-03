#!/usr/bin/env python3
"""
Quick visualization test - run this after backend is started
"""

import urllib.request
import json

BASE_URL = "http://localhost:8000"

def quick_test():
    """Quick test of visualization functionality"""
    print("🚀 Quick Visualization Test")
    print("=" * 40)
    
    # Step 1: Check backend
    try:
        with urllib.request.urlopen(f"{BASE_URL}/health") as response:
            print("✅ Backend is running")
    except:
        print("❌ Backend not accessible - make sure it's running on port 8000")
        return
    
    # Step 2: Create simple test data
    print("\n📊 Creating test dataset...")
    csv_data = "id,value,category\n1,100,A\n2,200,B\n3,150,A\n4,300,B"
    
    try:
        # Simple upload
        boundary = '----test'
        data = []
        data.append(f'--{boundary}'.encode())
        data.append(b'Content-Disposition: form-data; name="file"; filename="test.csv"')
        data.append(b'Content-Type: text/csv')
        data.append(b'')
        data.append(csv_data.encode())
        data.append(f'--{boundary}--'.encode())
        data.append(b'')
        
        body = b'\r\n'.join(data)
        
        req = urllib.request.Request(f"{BASE_URL}/upload")
        req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
        req.data = body
        
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                result = json.loads(response.read().decode())
                dataset_id = result.get('dataset_id')
                print(f"✅ Dataset created: {dataset_id}")
                print(f"   Columns: {result.get('column_names')}")
            else:
                print(f"❌ Upload failed: {response.status}")
                return
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return
    
    # Step 3: Test visualization
    print(f"\n🎨 Testing visualization for dataset: {dataset_id}")
    
    # Test the test endpoint
    print("\n1️⃣ Testing /test endpoint...")
    try:
        req = urllib.request.Request(f"{BASE_URL}/visualize/{dataset_id}/test", method='POST')
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                result = json.loads(response.read().decode())
                print(f"   ✅ Test chart generated!")
                print(f"   Chart Type: {result.get('chart_type')}")
                print(f"   X Column: {result.get('test_info', {}).get('x_column')}")
                print(f"   Y Column: {result.get('test_info', {}).get('y_column')}")
            else:
                print(f"   ❌ Test endpoint failed: {response.status}")
                print(f"   Error: {response.read().decode()}")
    except Exception as e:
        print(f"   ❌ Test endpoint error: {e}")
    
    # Test actual chart generation
    print("\n2️⃣ Testing chart generation...")
    chart_config = {
        "id": "test_chart",
        "type": "bar",
        "title": "Test Chart",
        "xAxis": "category",
        "yAxis": "value",
        "customizations": {"theme": "plotly_white"},
        "enabled": True
    }
    
    try:
        req = urllib.request.Request(f"{BASE_URL}/visualize/{dataset_id}/generate", method='POST')
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps(chart_config).encode()
        
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                result = json.loads(response.read().decode())
                print(f"   ✅ Chart generated successfully!")
                print(f"   Chart ID: {result.get('chart_id')}")
                print(f"   Chart Type: {result.get('chart_type')}")
                print(f"   Plot data keys: {list(result.get('plot_data', {}).keys())}")
            else:
                print(f"   ❌ Chart generation failed: {response.status}")
                print(f"   Error: {response.read().decode()}")
    except Exception as e:
        print(f"   ❌ Chart generation error: {e}")
    
    print(f"\n📊 Test Complete!")
    print(f"💡 Dataset ID for frontend testing: {dataset_id}")

if __name__ == "__main__":
    quick_test()
