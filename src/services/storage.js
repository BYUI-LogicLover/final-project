/**
 * Storage Service
 * Handles persistent data storage using localStorage with validation,
 * error handling, and import/export capabilities.
 */

// Storage key prefix to avoid conflicts
const STORAGE_PREFIX = 'booktracker_';

// Storage keys
export const STORAGE_KEYS = {
  READING_LISTS: 'reading_lists',
  USER_STATS: 'user_stats',
  USER_PREFERENCES: 'user_preferences',
  SEARCH_HISTORY: 'search_history',
  CACHED_BOOKS: 'cached_books',
};

/**
 * Schema definitions for data validation
 */
const schemas = {
  [STORAGE_KEYS.READING_LISTS]: {
    type: 'object',
    properties: {
      reading: { type: 'array' },
      toRead: { type: 'array' },
      completed: { type: 'array' },
    },
  },
  [STORAGE_KEYS.USER_STATS]: {
    type: 'object',
    properties: {
      booksRead: { type: 'number' },
      pagesRead: { type: 'number' },
      avgRating: { type: 'number' },
      readingStreak: { type: 'number' },
    },
  },
  [STORAGE_KEYS.USER_PREFERENCES]: {
    type: 'object',
    properties: {
      theme: { type: 'string', enum: ['light', 'dark', 'system'] },
      booksPerPage: { type: 'number' },
      defaultView: { type: 'string', enum: ['grid', 'list'] },
    },
  },
  [STORAGE_KEYS.SEARCH_HISTORY]: {
    type: 'array',
    maxItems: 50,
  },
  [STORAGE_KEYS.CACHED_BOOKS]: {
    type: 'object',
  },
};

/**
 * Check if localStorage is available
 * @returns {boolean}
 */
function isStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get the full storage key with prefix
 * @param {string} key - The base key
 * @returns {string} The prefixed key
 */
function getFullKey(key) {
  return `${STORAGE_PREFIX}${key}`;
}

/**
 * Validate data against a schema
 * @param {*} data - The data to validate
 * @param {Object} schema - The schema to validate against
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateData(data, schema) {
  const errors = [];

  if (!schema) {
    return { valid: true, errors: [] };
  }

  // Type checking
  if (schema.type === 'array') {
    if (!Array.isArray(data)) {
      errors.push(`Expected array, got ${typeof data}`);
      return { valid: false, errors };
    }
    if (schema.maxItems && data.length > schema.maxItems) {
      errors.push(`Array exceeds maximum length of ${schema.maxItems}`);
    }
  } else if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      errors.push(`Expected object, got ${Array.isArray(data) ? 'array' : typeof data}`);
      return { valid: false, errors };
    }

    // Validate properties
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (data[propName] !== undefined) {
          const propType = Array.isArray(data[propName]) ? 'array' : typeof data[propName];
          if (propSchema.type && propType !== propSchema.type) {
            errors.push(`Property "${propName}" expected ${propSchema.type}, got ${propType}`);
          }
          if (propSchema.enum && !propSchema.enum.includes(data[propName])) {
            errors.push(`Property "${propName}" must be one of: ${propSchema.enum.join(', ')}`);
          }
        }
      }
    }
  } else if (schema.type) {
    const actualType = typeof data;
    if (actualType !== schema.type) {
      errors.push(`Expected ${schema.type}, got ${actualType}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Storage error class
 */
export class StorageError extends Error {
  constructor(message, code, originalError = null) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.originalError = originalError;
  }
}

// Error codes
export const StorageErrorCodes = {
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  INVALID_DATA: 'INVALID_DATA',
  PARSE_ERROR: 'PARSE_ERROR',
  KEY_NOT_FOUND: 'KEY_NOT_FOUND',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  IMPORT_ERROR: 'IMPORT_ERROR',
  EXPORT_ERROR: 'EXPORT_ERROR',
};

/**
 * Save data to localStorage
 * @param {string} key - The storage key
 * @param {*} data - The data to save
 * @param {Object} options - Options
 * @param {boolean} options.validate - Whether to validate data (default: true)
 * @returns {{ success: boolean, error?: StorageError }}
 */
export function saveData(key, data, options = {}) {
  const { validate = true } = options;

  try {
    // Check storage availability
    if (!isStorageAvailable()) {
      throw new StorageError(
        'localStorage is not available',
        StorageErrorCodes.STORAGE_UNAVAILABLE
      );
    }

    // Validate data if schema exists and validation is enabled
    if (validate && schemas[key]) {
      const validation = validateData(data, schemas[key]);
      if (!validation.valid) {
        throw new StorageError(
          `Validation failed: ${validation.errors.join(', ')}`,
          StorageErrorCodes.VALIDATION_FAILED
        );
      }
    }

    // Serialize and save
    const serialized = JSON.stringify({
      data,
      timestamp: Date.now(),
      version: 1,
    });

    localStorage.setItem(getFullKey(key), serialized);

    return { success: true };
  } catch (error) {
    // Handle quota exceeded
    if (error.name === 'QuotaExceededError' ||
        error.code === 22 ||
        error.code === 1014 ||
        (error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      const storageError = new StorageError(
        'Storage quota exceeded. Please clear some data.',
        StorageErrorCodes.QUOTA_EXCEEDED,
        error
      );
      console.error('Storage quota exceeded:', error);
      return { success: false, error: storageError };
    }

    // Re-throw StorageErrors
    if (error instanceof StorageError) {
      return { success: false, error };
    }

    // Handle other errors
    const storageError = new StorageError(
      `Failed to save data: ${error.message}`,
      StorageErrorCodes.INVALID_DATA,
      error
    );
    console.error('Storage save error:', error);
    return { success: false, error: storageError };
  }
}

/**
 * Load data from localStorage
 * @param {string} key - The storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {{ success: boolean, data?: *, error?: StorageError }}
 */
export function loadData(key, defaultValue = null) {
  try {
    // Check storage availability
    if (!isStorageAvailable()) {
      throw new StorageError(
        'localStorage is not available',
        StorageErrorCodes.STORAGE_UNAVAILABLE
      );
    }

    const fullKey = getFullKey(key);
    const item = localStorage.getItem(fullKey);

    if (item === null) {
      return { success: true, data: defaultValue };
    }

    // Parse the stored data
    const parsed = JSON.parse(item);

    // Handle versioned data format
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      return { success: true, data: parsed.data, timestamp: parsed.timestamp };
    }

    // Handle legacy format (raw data)
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof StorageError) {
      return { success: false, data: defaultValue, error };
    }

    if (error instanceof SyntaxError) {
      const storageError = new StorageError(
        'Failed to parse stored data',
        StorageErrorCodes.PARSE_ERROR,
        error
      );
      console.error('Storage parse error:', error);
      return { success: false, data: defaultValue, error: storageError };
    }

    const storageError = new StorageError(
      `Failed to load data: ${error.message}`,
      StorageErrorCodes.INVALID_DATA,
      error
    );
    console.error('Storage load error:', error);
    return { success: false, data: defaultValue, error: storageError };
  }
}

/**
 * Remove data from localStorage
 * @param {string} key - The storage key
 * @returns {{ success: boolean, error?: StorageError }}
 */
export function removeData(key) {
  try {
    if (!isStorageAvailable()) {
      throw new StorageError(
        'localStorage is not available',
        StorageErrorCodes.STORAGE_UNAVAILABLE
      );
    }

    const fullKey = getFullKey(key);
    localStorage.removeItem(fullKey);

    return { success: true };
  } catch (error) {
    if (error instanceof StorageError) {
      return { success: false, error };
    }

    const storageError = new StorageError(
      `Failed to remove data: ${error.message}`,
      StorageErrorCodes.INVALID_DATA,
      error
    );
    console.error('Storage remove error:', error);
    return { success: false, error: storageError };
  }
}

/**
 * Clear all app data from localStorage
 * @returns {{ success: boolean, error?: StorageError }}
 */
export function clearAllData() {
  try {
    if (!isStorageAvailable()) {
      throw new StorageError(
        'localStorage is not available',
        StorageErrorCodes.STORAGE_UNAVAILABLE
      );
    }

    // Get all keys with our prefix
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    // Remove each key
    keysToRemove.forEach(key => localStorage.removeItem(key));

    return { success: true };
  } catch (error) {
    const storageError = new StorageError(
      `Failed to clear data: ${error.message}`,
      StorageErrorCodes.INVALID_DATA,
      error
    );
    console.error('Storage clear error:', error);
    return { success: false, error: storageError };
  }
}

/**
 * Export all app data as JSON
 * @returns {{ success: boolean, data?: string, error?: StorageError }}
 */
export function exportData() {
  try {
    if (!isStorageAvailable()) {
      throw new StorageError(
        'localStorage is not available',
        StorageErrorCodes.STORAGE_UNAVAILABLE
      );
    }

    const exportObject = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'BookTracker',
      data: {},
    };

    // Collect all app data
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (fullKey && fullKey.startsWith(STORAGE_PREFIX)) {
        const key = fullKey.replace(STORAGE_PREFIX, '');
        const item = localStorage.getItem(fullKey);
        try {
          exportObject.data[key] = JSON.parse(item);
        } catch {
          exportObject.data[key] = item;
        }
      }
    }

    const jsonString = JSON.stringify(exportObject, null, 2);

    return { success: true, data: jsonString };
  } catch (error) {
    const storageError = new StorageError(
      `Failed to export data: ${error.message}`,
      StorageErrorCodes.EXPORT_ERROR,
      error
    );
    console.error('Storage export error:', error);
    return { success: false, error: storageError };
  }
}

/**
 * Download exported data as a file
 * @param {string} filename - The filename for the download
 * @returns {{ success: boolean, error?: StorageError }}
 */
export function downloadExport(filename = 'booktracker-backup.json') {
  const exportResult = exportData();

  if (!exportResult.success) {
    return exportResult;
  }

  try {
    const blob = new Blob([exportResult.data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    const storageError = new StorageError(
      `Failed to download export: ${error.message}`,
      StorageErrorCodes.EXPORT_ERROR,
      error
    );
    return { success: false, error: storageError };
  }
}

/**
 * Import data from JSON string
 * @param {string} jsonString - The JSON string to import
 * @param {Object} options - Import options
 * @param {boolean} options.merge - Merge with existing data (default: false, overwrites)
 * @param {boolean} options.validate - Validate data before import (default: true)
 * @returns {{ success: boolean, imported?: string[], error?: StorageError }}
 */
export function importData(jsonString, options = {}) {
  const { merge = false, validate = true } = options;

  try {
    if (!isStorageAvailable()) {
      throw new StorageError(
        'localStorage is not available',
        StorageErrorCodes.STORAGE_UNAVAILABLE
      );
    }

    // Parse JSON
    let importObject;
    try {
      importObject = JSON.parse(jsonString);
    } catch (e) {
      throw new StorageError(
        'Invalid JSON format',
        StorageErrorCodes.PARSE_ERROR,
        e
      );
    }

    // Validate import format
    if (!importObject || typeof importObject !== 'object') {
      throw new StorageError(
        'Import data must be an object',
        StorageErrorCodes.IMPORT_ERROR
      );
    }

    // Handle both full export format and simple key-value format
    const dataToImport = importObject.data || importObject;

    if (typeof dataToImport !== 'object' || dataToImport === null) {
      throw new StorageError(
        'Import data is invalid',
        StorageErrorCodes.IMPORT_ERROR
      );
    }

    const importedKeys = [];
    const errors = [];

    // Import each key
    for (const [key, value] of Object.entries(dataToImport)) {
      // Skip metadata fields
      if (['version', 'exportedAt', 'app'].includes(key)) {
        continue;
      }

      // Validate if schema exists
      if (validate && schemas[key]) {
        // Extract actual data from versioned format
        const actualData = value && typeof value === 'object' && 'data' in value
          ? value.data
          : value;

        const validation = validateData(actualData, schemas[key]);
        if (!validation.valid) {
          errors.push(`${key}: ${validation.errors.join(', ')}`);
          continue;
        }
      }

      // Handle merge vs overwrite
      if (merge) {
        const existing = loadData(key);
        if (existing.success && existing.data && typeof existing.data === 'object') {
          const actualValue = value && typeof value === 'object' && 'data' in value
            ? value.data
            : value;

          if (Array.isArray(existing.data) && Array.isArray(actualValue)) {
            // Merge arrays (deduplicate by id if available)
            const merged = [...existing.data];
            actualValue.forEach(item => {
              const existingIndex = item.id
                ? merged.findIndex(e => e.id === item.id)
                : -1;
              if (existingIndex >= 0) {
                merged[existingIndex] = item;
              } else {
                merged.push(item);
              }
            });
            saveData(key, merged, { validate: false });
          } else if (typeof existing.data === 'object' && typeof actualValue === 'object') {
            // Merge objects
            saveData(key, { ...existing.data, ...actualValue }, { validate: false });
          } else {
            saveData(key, actualValue, { validate: false });
          }
        } else {
          const actualValue = value && typeof value === 'object' && 'data' in value
            ? value.data
            : value;
          saveData(key, actualValue, { validate: false });
        }
      } else {
        // Overwrite
        const actualValue = value && typeof value === 'object' && 'data' in value
          ? value.data
          : value;
        saveData(key, actualValue, { validate: false });
      }

      importedKeys.push(key);
    }

    if (errors.length > 0 && importedKeys.length === 0) {
      throw new StorageError(
        `Validation failed: ${errors.join('; ')}`,
        StorageErrorCodes.VALIDATION_FAILED
      );
    }

    return {
      success: true,
      imported: importedKeys,
      warnings: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    if (error instanceof StorageError) {
      return { success: false, error };
    }

    const storageError = new StorageError(
      `Failed to import data: ${error.message}`,
      StorageErrorCodes.IMPORT_ERROR,
      error
    );
    console.error('Storage import error:', error);
    return { success: false, error: storageError };
  }
}

/**
 * Import data from a File object
 * @param {File} file - The file to import
 * @param {Object} options - Import options
 * @returns {Promise<{ success: boolean, imported?: string[], error?: StorageError }>}
 */
export async function importFromFile(file, options = {}) {
  try {
    if (!file || !(file instanceof File)) {
      throw new StorageError(
        'Invalid file provided',
        StorageErrorCodes.IMPORT_ERROR
      );
    }

    if (!file.type.includes('json') && !file.name.endsWith('.json')) {
      throw new StorageError(
        'File must be a JSON file',
        StorageErrorCodes.IMPORT_ERROR
      );
    }

    const text = await file.text();
    return importData(text, options);
  } catch (error) {
    if (error instanceof StorageError) {
      return { success: false, error };
    }

    const storageError = new StorageError(
      `Failed to read file: ${error.message}`,
      StorageErrorCodes.IMPORT_ERROR,
      error
    );
    return { success: false, error: storageError };
  }
}

/**
 * Get storage usage statistics
 * @returns {{ used: number, total: number, percentage: number, items: number }}
 */
export function getStorageStats() {
  if (!isStorageAvailable()) {
    return { used: 0, total: 0, percentage: 0, items: 0 };
  }

  let used = 0;
  let items = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      const value = localStorage.getItem(key);
      used += key.length + (value ? value.length : 0);
      items++;
    }
  }

  // Approximate total available (5MB is common limit)
  const total = 5 * 1024 * 1024;
  const percentage = (used / total) * 100;

  return {
    used,
    total,
    percentage: Math.round(percentage * 100) / 100,
    items,
    usedFormatted: formatBytes(used),
    totalFormatted: formatBytes(total),
  };
}

/**
 * Format bytes to human readable string
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Expose to console for debugging
if (typeof window !== 'undefined') {
  window.__bookTrackerStorage = {
    saveData,
    loadData,
    removeData,
    clearAllData,
    exportData,
    downloadExport,
    importData,
    getStorageStats,
    STORAGE_KEYS,
  };
}
