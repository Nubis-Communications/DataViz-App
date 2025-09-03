#!/usr/bin/env python3
"""
Frontend Chart Generation Test - Simulates frontend requests
"""

import urllib.request
import json
import time

BASE_URL = "http://localhost:8000"

def simulate_frontend_chart_generation():
    """Simulate exactly what the frontend does when generating charts"""
    print("🎨 Frontend Chart Generation Simulation")
    print("=" * 50)
    
    # Step 1: Check if backend is running
    print("\n1️⃣ Checking backend status...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/health") as response:
            print(f"   ✅ Backend is running: {response.status}")
        backend_ok = True
    except Exception as e:
        print(f"   ❌ Backend not accessible: {e}")
        print("   💡 Start the backend first using: start_backend_robust.bat")
        return False
    
    # Step 2: Get existing datasets or create one
    print("\n2️⃣ Checking for existing datasets...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/datasets") as response:
            datasets = json.loads(response.read().decode())
            existing_datasets = datasets.get('datasets', [])
            
            if existing_datasets:
                dataset_id = existing_datasets[0]['dataset_id']
                print(f"   ✅ Using existing dataset: {dataset_id}")
                print(f"   Columns: {existing_datasets[0].get('columns', 'Unknown')}")
            else:
                print("   ℹ️ No existing datasets, creating test dataset...")
                dataset_id = create_test_dataset()
                if not dataset_id:
                    return False
    except Exception as e:
        print(f"   ❌ Failed to get datasets: {e}")
        return False
    
    # Step 3: Simulate frontend chart generation
    print(f"\n3️⃣ Simulating Frontend Chart Generation...")
    
    # This is exactly what the frontend sends
    frontend_chart_request = {
        "id": "frontend_test_chart",
        "type": "bar",
        "title": "Frontend Test Chart",
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
    
    print(f"   📤 Sending chart request to: /visualize/{dataset_id}/generate")
    print(f"   📋 Request data: {json.dumps(frontend_chart_request, indent=2)}")
    
    try:
        req = urllib.request.Request(f"{BASE_URL}/visualize/{dataset_id}/generate", method='POST')
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps(frontend_chart_request).encode()
        
        print(f"   🔄 Waiting for response...")
        
        with urllib.request.urlopen(req) as response:
            print(f"   ✅ Response received: {response.status}")
            
            if response.status == 200:
                result = json.loads(response.read().decode())
                print(f"   🎉 Chart generated successfully!")
                print(f"   Chart ID: {result.get('chart_id')}")
                print(f"   Chart Type: {result.get('chart_type')}")
                
                # Check the response structure
                plot_data = result.get('plot_data', {})
                if plot_data:
                    print(f"   📊 Plot data structure:")
                    print(f"      Keys: {list(plot_data.keys())}")
                    
                    if 'data' in plot_data and 'layout' in plot_data:
                        print(f"      ✅ Plot data is complete")
                        print(f"      Data traces: {len(plot_data['data'])}")
                        print(f"      Layout properties: {list(plot_data['layout'].keys())}")
                    else:
                        print(f"      ⚠️ Plot data incomplete")
                else:
                    print(f"   ❌ No plot data in response")
                
                return True
            else:
                print(f"   ❌ Chart generation failed: {response.status}")
                error_text = response.read().decode()
                print(f"   Error: {error_text}")
                return False
                
    except urllib.error.HTTPError as e:
        print(f"   ❌ HTTP Error: {e.code}")
        error_text = e.read().decode()
        print(f"   Error details: {error_text}")
        return False
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False

def create_test_dataset():
    """Create a simple test dataset"""
    print("   📊 Creating test dataset...")
    
    csv_content = "id,name,value,category\n1,Product A,100,Electronics\n2,Product B,200,Clothing\n3,Product C,150,Books"
    
    try:
        boundary = '----test'
        data = []
        data.append(f'--{boundary}'.encode())
        data.append(b'Content-Disposition: form-data; name="file"; filename="test.csv"')
        data.append(b'Content-Type: text/csv')
        data.append(b'')
        data.append(csv_content.encode())
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
                print(f"      ✅ Dataset created: {dataset_id}")
                return dataset_id
            else:
                print(f"      ❌ Upload failed: {response.status}")
                return None
    except Exception as e:
        print(f"      ❌ Upload error: {e}")
        return None

def main():
    """Main function"""
    print("🚀 Frontend Chart Generation Test")
    print("=" * 50)
    print("This script simulates exactly what the frontend does")
    print("when generating charts. Use it to debug chart generation issues.")
    print()
    
    success = simulate_frontend_chart_generation()
    
    print(f"\n📊 Test Summary")
    print("=" * 50)
    if success:
        print("✅ Frontend chart generation simulation successful!")
        print("💡 The backend is working correctly.")
        print("🔍 The issue is likely in the frontend JavaScript or UI.")
    else:
        print("❌ Frontend chart generation simulation failed.")
        print("🔍 Check the backend for errors.")
    
    print(f"\n🔧 Next Steps:")
    print(f"1. If backend test passed: Check frontend JavaScript console")
    print(f"2. If backend test failed: Fix backend issues first")
    print(f"3. Use the dataset ID shown above in the frontend")

if __name__ == "__main__":
    main()
