/**
 * Storage Service Tests
 * Run in browser console or as a module to test storage functionality
 */

import {
  saveData,
  loadData,
  removeData,
  clearAllData,
  exportData,
  importData,
  getStorageStats,
  STORAGE_KEYS,
  StorageErrorCodes,
} from './storage.js';

// Test results collector
const testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

function test(name, fn) {
  try {
    fn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASSED' });
    console.log(`PASSED: ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAILED', error: error.message });
    console.error(`FAILED: ${name}`, error.message);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Clear storage before tests
clearAllData();

console.log('=== Storage Service Tests ===\n');

// Test 1: Save and load simple data
test('saveData and loadData with simple object', () => {
  const testData = { name: 'Test Book', author: 'Test Author' };
  const saveResult = saveData('test_simple', testData, { validate: false });
  assert(saveResult.success, 'Save should succeed');

  const loadResult = loadData('test_simple');
  assert(loadResult.success, 'Load should succeed');
  assertDeepEqual(loadResult.data, testData, 'Loaded data should match saved data');
});

// Test 2: Save and load reading lists with validation
test('saveData with schema validation for reading_lists', () => {
  const readingLists = {
    reading: [{ id: 1, title: 'Book 1' }],
    toRead: [{ id: 2, title: 'Book 2' }],
    completed: [{ id: 3, title: 'Book 3' }],
  };

  const saveResult = saveData(STORAGE_KEYS.READING_LISTS, readingLists);
  assert(saveResult.success, 'Save should succeed with valid data');

  const loadResult = loadData(STORAGE_KEYS.READING_LISTS);
  assert(loadResult.success, 'Load should succeed');
  assertDeepEqual(loadResult.data, readingLists, 'Loaded data should match');
});

// Test 3: Validation failure
test('saveData fails with invalid data structure', () => {
  const invalidData = {
    reading: 'not an array', // Should be array
    toRead: [],
    completed: [],
  };

  const saveResult = saveData(STORAGE_KEYS.READING_LISTS, invalidData);
  assert(!saveResult.success, 'Save should fail with invalid data');
  assertEqual(saveResult.error.code, StorageErrorCodes.VALIDATION_FAILED, 'Should be validation error');
});

// Test 4: Load non-existent key returns default
test('loadData returns default for non-existent key', () => {
  const defaultValue = { empty: true };
  const loadResult = loadData('non_existent_key', defaultValue);
  assert(loadResult.success, 'Load should succeed');
  assertDeepEqual(loadResult.data, defaultValue, 'Should return default value');
});

// Test 5: Remove data
test('removeData removes stored data', () => {
  saveData('test_remove', { data: 'to remove' }, { validate: false });
  const removeResult = removeData('test_remove');
  assert(removeResult.success, 'Remove should succeed');

  const loadResult = loadData('test_remove', null);
  assert(loadResult.data === null, 'Data should be removed');
});

// Test 6: Save user stats with validation
test('saveData with user_stats schema', () => {
  const userStats = {
    booksRead: 42,
    pagesRead: 12500,
    avgRating: 4.2,
    readingStreak: 15,
  };

  const saveResult = saveData(STORAGE_KEYS.USER_STATS, userStats);
  assert(saveResult.success, 'Save should succeed');

  const loadResult = loadData(STORAGE_KEYS.USER_STATS);
  assertDeepEqual(loadResult.data, userStats, 'Stats should match');
});

// Test 7: Save user preferences with enum validation
test('saveData with user_preferences validates enum values', () => {
  const validPrefs = {
    theme: 'dark',
    booksPerPage: 12,
    defaultView: 'grid',
  };

  const saveResult = saveData(STORAGE_KEYS.USER_PREFERENCES, validPrefs);
  assert(saveResult.success, 'Valid preferences should save');

  const invalidPrefs = {
    theme: 'invalid_theme', // Not in enum
    booksPerPage: 12,
    defaultView: 'grid',
  };

  const invalidResult = saveData(STORAGE_KEYS.USER_PREFERENCES, invalidPrefs);
  assert(!invalidResult.success, 'Invalid enum value should fail');
});

// Test 8: Search history max items
test('saveData validates search_history max items', () => {
  const validHistory = Array(50).fill('search term');
  const saveResult = saveData(STORAGE_KEYS.SEARCH_HISTORY, validHistory);
  assert(saveResult.success, '50 items should succeed');

  const tooLongHistory = Array(51).fill('search term');
  const failResult = saveData(STORAGE_KEYS.SEARCH_HISTORY, tooLongHistory);
  assert(!failResult.success, '51 items should fail');
});

// Test 9: Export data
test('exportData creates valid JSON export', () => {
  // Save some data first
  saveData('export_test', { test: 'data' }, { validate: false });

  const exportResult = exportData();
  assert(exportResult.success, 'Export should succeed');
  assert(typeof exportResult.data === 'string', 'Export should be string');

  const parsed = JSON.parse(exportResult.data);
  assert(parsed.version === 1, 'Should have version');
  assert(parsed.app === 'BookTracker', 'Should have app name');
  assert(parsed.exportedAt, 'Should have export timestamp');
  assert(typeof parsed.data === 'object', 'Should have data object');
});

// Test 10: Import data
test('importData restores exported data', () => {
  // Clear and create fresh data
  clearAllData();
  const originalData = { books: ['Book 1', 'Book 2'] };
  saveData('import_test', originalData, { validate: false });

  // Export
  const exportResult = exportData();
  assert(exportResult.success, 'Export should succeed');

  // Clear and import
  clearAllData();
  const importResult = importData(exportResult.data);
  assert(importResult.success, 'Import should succeed');
  assert(importResult.imported.includes('import_test'), 'Should import test key');

  // Verify
  const loadResult = loadData('import_test');
  assertDeepEqual(loadResult.data, originalData, 'Imported data should match');
});

// Test 11: Import with merge option
test('importData with merge combines data', () => {
  clearAllData();

  // Save initial data
  saveData('merge_test', { a: 1, b: 2 }, { validate: false });

  // Import with merge
  const importJson = JSON.stringify({
    data: {
      merge_test: { data: { b: 3, c: 4 }, timestamp: Date.now(), version: 1 }
    }
  });

  const importResult = importData(importJson, { merge: true });
  assert(importResult.success, 'Merge import should succeed');

  const loadResult = loadData('merge_test');
  assertDeepEqual(loadResult.data, { a: 1, b: 3, c: 4 }, 'Data should be merged');
});

// Test 12: Import invalid JSON
test('importData rejects invalid JSON', () => {
  const importResult = importData('not valid json');
  assert(!importResult.success, 'Should fail on invalid JSON');
  assertEqual(importResult.error.code, StorageErrorCodes.PARSE_ERROR, 'Should be parse error');
});

// Test 13: Storage stats
test('getStorageStats returns usage information', () => {
  clearAllData();
  saveData('stats_test', { data: 'x'.repeat(1000) }, { validate: false });

  const stats = getStorageStats();
  assert(stats.used > 0, 'Should report used space');
  assert(stats.total > 0, 'Should report total space');
  assert(stats.items >= 1, 'Should count items');
  assert(typeof stats.percentage === 'number', 'Should have percentage');
  assert(stats.usedFormatted, 'Should have formatted used');
});

// Test 14: clearAllData removes only prefixed keys
test('clearAllData only removes app data', () => {
  // Save app data
  saveData('app_data', { test: true }, { validate: false });

  // Save non-app data directly
  localStorage.setItem('other_app_data', 'should remain');

  clearAllData();

  const appDataResult = loadData('app_data', null);
  assert(appDataResult.data === null, 'App data should be cleared');

  const otherData = localStorage.getItem('other_app_data');
  assertEqual(otherData, 'should remain', 'Other app data should remain');

  // Cleanup
  localStorage.removeItem('other_app_data');
});

// Test 15: Data versioning/timestamp
test('saveData includes timestamp', () => {
  const before = Date.now();
  saveData('timestamp_test', { test: true }, { validate: false });
  const after = Date.now();

  const loadResult = loadData('timestamp_test');
  assert(loadResult.timestamp >= before, 'Timestamp should be after save start');
  assert(loadResult.timestamp <= after, 'Timestamp should be before save end');
});

// Cleanup
clearAllData();

// Print summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${testResults.passed}`);
console.log(`Failed: ${testResults.failed}`);
console.log(`Total: ${testResults.passed + testResults.failed}`);

if (testResults.failed > 0) {
  console.log('\nFailed tests:');
  testResults.tests
    .filter(t => t.status === 'FAILED')
    .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
}

export { testResults };
