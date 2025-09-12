/**
 * Centralized Data Service
 * Handles all data operations with consistent type handling and versioning
 */

import axios from 'axios';

// Types
export interface FilterConfig {
  column: string;
  type: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in_list' | 'is_null' | 'not_null';
  value: any;
  enabled: boolean;
}

export interface DatasetVersion {
  version_id: string;
  parent_id: string | null;
  name: string;
  description: string;
  created_at: string;
  filters_applied: FilterConfig[];
  transformations_applied: any[];
  row_count: number;
  column_count: number;
}

export interface ColumnInfo {
  type: 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean';
  dtype: string;
  unique_count: number;
  null_count: number;
  sample_values: any[];
}

export interface DatasetInfo {
  dataset_id: string;
  filename: string;
  rows: number;
  columns: number;
  column_names: string[];
  data_types: Record<string, string>;
  summary_stats: Record<string, any>;
  upload_time: string;
}

class DataService {
  private baseURL = '/data';

  // Dataset Management
  async getDatasets(): Promise<DatasetInfo[]> {
    const response = await axios.get('/datasets');
    return response.data.datasets || [];
  }

  async getDatasetInfo(datasetId: string): Promise<DatasetInfo> {
    const response = await axios.get(`/dataset/${datasetId}`);
    return response.data;
  }

  async getDatasetPreview(datasetId: string, rows: number = 100): Promise<any[]> {
    const response = await axios.get(`/dataset/${datasetId}/preview?rows=${rows}`);
    return response.data.preview_data || [];
  }

  // Version Management
  async getVersionInfo(versionId: string): Promise<DatasetVersion> {
    const response = await axios.get(`${this.baseURL}/versions/${versionId}`);
    return response.data;
  }

  async getVersionData(versionId: string, rows: number = 100): Promise<any[]> {
    const response = await axios.get(`${this.baseURL}/versions/${versionId}/data?rows=${rows}`);
    return response.data.preview_data || [];
  }

  async getVersionColumnInfo(versionId: string): Promise<Record<string, ColumnInfo>> {
    const response = await axios.get(`${this.baseURL}/versions/${versionId}/columns`);
    return response.data.columns || {};
  }

  async getUniqueValues(versionId: string, column: string, limit: number = 100): Promise<any[]> {
    const response = await axios.get(`${this.baseURL}/versions/${versionId}/unique-values/${column}?limit=${limit}`);
    return response.data.unique_values || [];
  }

  async listDatasetVersions(datasetId: string): Promise<DatasetVersion[]> {
    const response = await axios.get(`${this.baseURL}/datasets/${datasetId}/versions`);
    return response.data.versions || [];
  }

  // Filtered Version Creation
  async createFilteredVersion(
    parentVersionId: string,
    name: string,
    description: string,
    filters: FilterConfig[]
  ): Promise<{ version_id: string; version_info: DatasetVersion }> {
    const response = await axios.post(`${this.baseURL}/versions/${parentVersionId}/create-filtered`, {
      name,
      description,
      filters
    });
    return response.data;
  }

  async deleteVersion(versionId: string): Promise<boolean> {
    const response = await axios.delete(`${this.baseURL}/versions/${versionId}`);
    return response.data.success;
  }

  // Clear cache and temporary versions
  async clearCache(): Promise<{ success: boolean; message: string; details: any }> {
    const response = await axios.post(`${this.baseURL}/clear-cache`);
    return response.data;
  }

  // Legacy Support (for backward compatibility)
  async applyFilters(datasetId: string, filters: Record<string, any>): Promise<any> {
    const response = await axios.post(`${this.baseURL}/${datasetId}/filter`, filters);
    return response.data;
  }

  async applyTransformations(datasetId: string, transformations: any[]): Promise<any> {
    const response = await axios.post(`${this.baseURL}/${datasetId}/transform`, transformations);
    return response.data;
  }

  // Utility Functions
  getOriginalVersionId(datasetId: string): string {
    return `${datasetId}_original`;
  }

  isOriginalVersion(versionId: string): boolean {
    return versionId.endsWith('_original');
  }

  // Data Type Detection
  detectColumnType(columnInfo: ColumnInfo): 'numeric' | 'categorical' | 'datetime' | 'text' {
    // Convert boolean to categorical for compatibility
    if (columnInfo.type === 'boolean') {
      return 'categorical';
    }
    return columnInfo.type as 'numeric' | 'categorical' | 'datetime' | 'text';
  }

  // Filter Validation
  validateFilter(filter: FilterConfig, columnInfo: ColumnInfo): { valid: boolean; message?: string } {
    if (!filter.column || !filter.type) {
      return { valid: false, message: 'Filter column and type are required' };
    }

    if (filter.type === 'between' && (!filter.value?.min || !filter.value?.max)) {
      return { valid: false, message: 'Between filter requires min and max values' };
    }

    if (filter.type === 'in_list' && (!Array.isArray(filter.value) || filter.value.length === 0)) {
      return { valid: false, message: 'In list filter requires an array of values' };
    }

    return { valid: true };
  }

  // Smart Filter Value Conversion
  convertFilterValue(value: any, columnType: string): any {
    if (columnType === 'numeric') {
      const num = parseFloat(value);
      return isNaN(num) ? value : num;
    } else if (columnType === 'datetime') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date.toISOString();
    }
    return value;
  }
}

// Export singleton instance
export const dataService = new DataService();
export default dataService;
