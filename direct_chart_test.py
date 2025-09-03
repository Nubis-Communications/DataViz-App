#!/usr/bin/env python3
"""
Direct Chart Generation Test - Tests backend visualization directly
"""

import urllib.request
import json
import base64

BASE_URL = "http://localhost:8000"

def create_test_dataset():
    """Create a test dataset with good data for visualization"""
    print("📊 Creating test dataset...")
    
    # Create comprehensive test data
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
10,Product J,445.50,79.1,Electronics,2024-01-24"""
    
    try:
        # Upload the data
        boundary = '----test_boundary'
        data = []
        data.append(f'--{boundary}'.encode())
        data.append(b'Content-Disposition: form-data; name="file"; filename="test_data.csv"')
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
                print(f"✅ Dataset created: {dataset_id}")
                print(f"   Columns: {result.get('column_names')}")
                print(f"   Rows: {result.get('rows')}")
                return dataset_id
            else:
                print(f"❌ Upload failed: {response.status}")
                return None
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return None

def test_chart_generation(dataset_id):
    """Test various chart types"""
    print(f"\n🎨 Testing Chart Generation for Dataset: {dataset_id}")
    
    # Test 1: Simple test chart
    print("\n1️⃣ Testing /test endpoint...")
    try:
        req = urllib.request.Request(f"{BASE_URL}/visualize/{dataset_id}/test", method='POST')
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                result = json.loads(response.read().decode())
                print(f"   ✅ Test chart generated successfully!")
                print(f"   Chart Type: {result.get('chart_type')}")
                print(f"   X Column: {result.get('test_info', {}).get('x_column')}")
                print(f"   Y Column: {result.get('test_info', {}).get('y_column')}")
                print(f"   Data Points: {result.get('test_info', {}).get('data_points')}")
                
                # Check if plot data is present
                plot_data = result.get('plot_data', {})
                if plot_data:
                    print(f"   Plot Data Keys: {list(plot_data.keys())}")
                    if 'data' in plot_data and 'layout' in plot_data:
                        print(f"   ✅ Plot data structure is correct")
                    else:
                        print(f"   ⚠️ Plot data structure incomplete")
                else:
                    print(f"   ❌ No plot data in response")
                
                return True
            else:
                print(f"   ❌ Test endpoint failed: {response.status}")
                print(f"   Error: {response.read().decode()}")
                return False
    except Exception as e:
        print(f"   ❌ Test endpoint error: {e}")
        return False

def test_custom_charts(dataset_id):
    """Test custom chart generation"""
    print(f"\n2️⃣ Testing Custom Chart Generation...")
    
    # Test different chart types
    chart_configs = [
        {
            "id": "bar_chart",
            "type": "bar",
            "title": "Product Values Bar Chart",
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
        },
        {
            "id": "scatter_chart",
            "type": "scatter",
            "title": "Value vs Score Scatter Plot",
            "xAxis": "value",
            "yAxis": "score",
            "customizations": {
                "theme": "plotly_white",
                "colorPalette": "viridis",
                "opacity": 0.7,
                "showGrid": True,
                "showLegend": True,
                "showLabels": False,
                "fontSize": 12,
                "width": 600,
                "height": 400
            },
            "enabled": True
        }
    ]
    
    successful_charts = 0
    
    for i, chart_config in enumerate(chart_configs, 1):
        print(f"\n   Testing {chart_config['type']} chart ({i}/{len(chart_configs)})...")
        
        try:
            req = urllib.request.Request(f"{BASE_URL}/visualize/{dataset_id}/generate", method='POST')
            req.add_header('Content-Type', 'application/json')
            req.data = json.dumps(chart_config).encode()
            
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    result = json.loads(response.read().decode())
                    print(f"      ✅ {chart_config['type']} chart generated!")
                    print(f"      Chart ID: {result.get('chart_id')}")
                    print(f"      Chart Type: {result.get('chart_type')}")
                    
                    # Validate plot data
                    plot_data = result.get('plot_data', {})
                    if plot_data and 'data' in plot_data and 'layout' in plot_data:
                        print(f"      ✅ Plot data is valid")
                        successful_charts += 1
                    else:
                        print(f"      ⚠️ Plot data incomplete")
                        
                else:
                    print(f"      ❌ Failed: {response.status}")
                    print(f"      Error: {response.read().decode()}")
                    
        except Exception as e:
            print(f"      ❌ Error: {e}")
    
    return successful_charts

def test_error_handling(dataset_id):
    """Test error handling"""
    print(f"\n3️⃣ Testing Error Handling...")
    
    # Test with invalid column names
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
            print(f"   ❌ Unexpected success: {response.status}")
            return False
    except urllib.error.HTTPError as e:
        if e.code == 400:
            error_detail = e.read().decode()
            print(f"   ✅ Error handling working correctly!")
            print(f"   Error: {error_detail}")
            return True
        else:
            print(f"   ❌ Unexpected HTTP error: {e.code}")
            return False
    except Exception as e:
        print(f"   ❌ Error handling test failed: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Direct Chart Generation Test")
    print("=" * 50)
    
    # Create test dataset
    dataset_id = create_test_dataset()
    if not dataset_id:
        print("❌ Cannot proceed without test dataset")
        return
    
    # Test chart generation
    test_success = test_chart_generation(dataset_id)
    custom_charts_success = test_custom_charts(dataset_id)
    error_handling_success = test_error_handling(dataset_id)
    
    # Summary
    print(f"\n📊 Test Summary")
    print("=" * 50)
    print(f"✅ Dataset: {dataset_id}")
    print(f"✅ Test Chart: {'Working' if test_success else 'Failed'}")
    print(f"✅ Custom Charts: {custom_charts_success}/2 successful")
    print(f"✅ Error Handling: {'Working' if error_handling_success else 'Failed'}")
    
    if test_success and custom_charts_success > 0 and error_handling_success:
        print(f"\n🎉 Backend visualization is working correctly!")
        print(f"💡 The issue is likely in the frontend. Dataset ID for testing: {dataset_id}")
    else:
        print(f"\n⚠️ Some backend tests failed. Check the output above.")
    
    print(f"\n🔍 Next Steps:")
    print(f"1. Use dataset ID '{dataset_id}' in the frontend")
    print(f"2. Try the 'Test Chart' button")
    print(f"3. Check browser console for JavaScript errors")

if __name__ == "__main__":
    main()
