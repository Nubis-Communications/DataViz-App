#!/usr/bin/env python3
"""
Test script for DataViz Platform visualization backend
This script creates dummy data and tests chart generation functionality
"""

import requests
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Backend URL
BASE_URL = "http://localhost:8000"

def create_test_data():
    """Create and upload test dataset"""
    print("🔄 Creating test dataset...")
    
    # Generate sample data
    np.random.seed(42)
    n_rows = 100
    
    # Create sample data
    data = {
        'id': range(1, n_rows + 1),
        'value': np.random.normal(100, 20, n_rows),
        'category': np.random.choice(['A', 'B', 'C', 'D'], n_rows),
        'date': [datetime.now() - timedelta(days=i) for i in range(n_rows)],
        'score': np.random.uniform(0, 100, n_rows),
        'status': np.random.choice(['Active', 'Inactive', 'Pending'], n_rows)
    }
    
    # Convert to DataFrame and save as CSV
    df = pd.DataFrame(data)
    csv_content = df.to_csv(index=False)
    
    # Upload the test data
    files = {'file': ('test_data.csv', csv_content, 'text/csv')}
    response = requests.post(f"{BASE_URL}/upload", files=files)
    
    if response.status_code == 200:
        dataset_info = response.json()
        print(f"✅ Test dataset uploaded successfully!")
        print(f"   Dataset ID: {dataset_info['dataset_id']}")
        print(f"   Rows: {dataset_info['rows']}")
        print(f"   Columns: {dataset_info['columns']}")
        print(f"   Columns: {dataset_info['column_names']}")
        return dataset_info['dataset_id']
    else:
        print(f"❌ Failed to upload test dataset: {response.status_code}")
        print(f"   Error: {response.text}")
        return None

def test_chart_generation(dataset_id):
    """Test chart generation with different chart types"""
    print(f"\n🔄 Testing chart generation for dataset {dataset_id}...")
    
    # Test chart configurations
    test_charts = [
        {
            "id": "test_bar",
            "type": "bar",
            "title": "Test Bar Chart",
            "xAxis": "category",
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
            "id": "test_scatter",
            "type": "scatter",
            "title": "Test Scatter Plot",
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
        },
        {
            "id": "test_line",
            "type": "line",
            "title": "Test Line Chart",
            "xAxis": "id",
            "yAxis": "value",
            "customizations": {
                "theme": "plotly_white",
                "colorPalette": "plasma",
                "opacity": 0.9,
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
    
    for chart_config in test_charts:
        print(f"   Testing {chart_config['type']} chart...")
        
        try:
            response = requests.post(
                f"{BASE_URL}/visualize/{dataset_id}/generate",
                json=chart_config
            )
            
            if response.status_code == 200:
                chart_data = response.json()
                print(f"   ✅ {chart_config['type']} chart generated successfully!")
                print(f"      Chart ID: {chart_data['chart_id']}")
                print(f"      Generated at: {chart_data['generated_at']}")
                successful_charts += 1
            else:
                print(f"   ❌ Failed to generate {chart_config['type']} chart: {response.status_code}")
                print(f"      Error: {response.text}")
                
        except Exception as e:
            print(f"   ❌ Exception during {chart_config['type']} chart generation: {str(e)}")
    
    return successful_charts

def test_test_chart_endpoint(dataset_id):
    """Test the test chart endpoint"""
    print(f"\n🔄 Testing test chart endpoint for dataset {dataset_id}...")
    
    try:
        response = requests.post(f"{BASE_URL}/visualize/{dataset_id}/test")
        
        if response.status_code == 200:
            test_data = response.json()
            print(f"✅ Test chart generated successfully!")
            print(f"   Chart ID: {test_data['chart_id']}")
            print(f"   Chart Type: {test_data['chart_type']}")
            print(f"   X Column: {test_data['test_info']['x_column']}")
            print(f"   Y Column: {test_data['test_info']['y_column']}")
            print(f"   Data Points: {test_data['test_info']['data_points']}")
            print(f"   Message: {test_data['test_info']['message']}")
            return True
        else:
            print(f"❌ Failed to generate test chart: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception during test chart generation: {str(e)}")
        return False

def test_error_handling(dataset_id):
    """Test error handling with invalid configurations"""
    print(f"\n🔄 Testing error handling...")
    
    # Test with non-existent columns
    invalid_chart = {
        "id": "test_error",
        "type": "bar",
        "title": "Invalid Chart",
        "xAxis": "non_existent_column",
        "yAxis": "another_non_existent_column",
        "customizations": {},
        "enabled": True
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/visualize/{dataset_id}/generate",
            json=invalid_chart
        )
        
        if response.status_code == 400:
            print(f"✅ Error handling working correctly!")
            print(f"   Expected error: {response.json()['detail']}")
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception during error handling test: {str(e)}")

def main():
    """Main test function"""
    print("🚀 DataViz Platform - Visualization Backend Test")
    print("=" * 60)
    
    # Check if backend is running
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Backend is running and healthy")
        else:
            print(f"⚠️ Backend responded with status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Make sure it's running on http://localhost:8000")
        return
    
    # Create test dataset
    dataset_id = create_test_data()
    if not dataset_id:
        print("❌ Cannot proceed without test dataset")
        return
    
    # Test chart generation
    successful_charts = test_chart_generation(dataset_id)
    
    # Test test chart endpoint
    test_chart_success = test_test_chart_endpoint(dataset_id)
    
    # Test error handling
    test_error_handling(dataset_id)
    
    # Summary
    print(f"\n📊 Test Summary")
    print("=" * 60)
    print(f"✅ Dataset created: {dataset_id}")
    print(f"✅ Charts generated: {successful_charts}/3")
    print(f"✅ Test chart endpoint: {'Working' if test_chart_success else 'Failed'}")
    
    if successful_charts == 3 and test_chart_success:
        print("\n🎉 All tests passed! Visualization backend is working correctly.")
    else:
        print(f"\n⚠️ Some tests failed. Check the output above for details.")
    
    print(f"\n💡 You can now test the frontend with dataset ID: {dataset_id}")

if __name__ == "__main__":
    main()
