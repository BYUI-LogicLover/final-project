/**
 * Reading List Service
 * Manages reading lists with persistent storage
 */

import { saveData, loadData, STORAGE_KEYS } from './storage.js';
import { sampleBooks } from '../data/books.js';

// List types
export const LIST_TYPES = {
  READING: 'reading',
  TO_READ: 'toRead',
  COMPLETED: 'completed',
};

// Default reading lists (used for initial data)
const defaultReadingLists = {
  reading: [
    { ...sampleBooks[0], progress: 65 },
    { ...sampleBooks[5], progress: 30 },
  ],
  toRead: [
    sampleBooks[2],
    sampleBooks[6],
    sampleBooks[10],
  ],
  completed: [
    { ...sampleBooks[1], completedDate: '2024-01-15' },
    { ...sampleBooks[3], completedDate: '2024-01-02' },
    { ...sampleBooks[7], completedDate: '2023-12-20' },
    { ...sampleBooks[11], completedDate: '2023-12-10' },
  ]
};

// In-memory cache of reading lists
let listsCache = null;

// Subscribers for list changes
const subscribers = new Set();

/**
 * Notify all subscribers of list changes
 */
function notifySubscribers(listType, action, book) {
  subscribers.forEach(callback => {
    try {
      callback({ listType, action, book, lists: listsCache });
    } catch (error) {
      console.error('Subscriber error:', error);
    }
  });
}

/**
 * Subscribe to reading list changes
 * @param {Function} callback - Called with { listType, action, book, lists }
 * @returns {Function} Unsubscribe function
 */
export function subscribeToListChanges(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/**
 * Initialize and load reading lists from storage
 * @returns {Object} The reading lists
 */
export function initReadingLists() {
  const result = loadData(STORAGE_KEYS.READING_LISTS, defaultReadingLists);

  if (result.success && result.data) {
    // Ensure all list types exist
    listsCache = {
      reading: result.data.reading || [],
      toRead: result.data.toRead || [],
      completed: result.data.completed || [],
    };
  } else {
    // Use defaults and save them
    listsCache = { ...defaultReadingLists };
    saveData(STORAGE_KEYS.READING_LISTS, listsCache);
  }

  return listsCache;
}

/**
 * Get all reading lists
 * @returns {Object} The reading lists
 */
export function getReadingLists() {
  if (!listsCache) {
    return initReadingLists();
  }
  return listsCache;
}

/**
 * Get a specific list
 * @param {string} listType - The list type (reading, toRead, completed)
 * @returns {Array} The list of books
 */
export function getList(listType) {
  const lists = getReadingLists();
  return lists[listType] || [];
}

/**
 * Check if a book is in any list
 * @param {string|number} bookId - The book ID
 * @returns {{ inList: boolean, listType: string|null }}
 */
export function getBookListStatus(bookId) {
  const lists = getReadingLists();
  const id = String(bookId);

  for (const [listType, books] of Object.entries(lists)) {
    if (books.some(book => String(book.id) === id)) {
      return { inList: true, listType };
    }
  }

  return { inList: false, listType: null };
}

/**
 * Add a book to a list
 * @param {Object} book - The book to add
 * @param {string} listType - The list type (reading, toRead, completed)
 * @returns {{ success: boolean, error?: string }}
 */
export function addToList(book, listType) {
  if (!book || !book.id) {
    return { success: false, error: 'Invalid book data' };
  }

  if (!LIST_TYPES[listType.toUpperCase()] && !Object.values(LIST_TYPES).includes(listType)) {
    return { success: false, error: 'Invalid list type' };
  }

  const lists = getReadingLists();
  const bookId = String(book.id);

  // Remove from other lists first
  for (const [type, bookList] of Object.entries(lists)) {
    const index = bookList.findIndex(b => String(b.id) === bookId);
    if (index !== -1) {
      bookList.splice(index, 1);
    }
  }

  // Prepare book data based on list type
  let bookToAdd = { ...book };

  if (listType === LIST_TYPES.READING) {
    bookToAdd.progress = bookToAdd.progress || 0;
    bookToAdd.startedDate = bookToAdd.startedDate || new Date().toISOString().split('T')[0];
  } else if (listType === LIST_TYPES.COMPLETED) {
    bookToAdd.completedDate = bookToAdd.completedDate || new Date().toISOString().split('T')[0];
    delete bookToAdd.progress;
  } else {
    bookToAdd.addedDate = bookToAdd.addedDate || new Date().toISOString().split('T')[0];
    delete bookToAdd.progress;
    delete bookToAdd.completedDate;
  }

  // Add to the target list
  lists[listType].unshift(bookToAdd);

  // Save to storage
  const saveResult = saveData(STORAGE_KEYS.READING_LISTS, lists);

  if (!saveResult.success) {
    return { success: false, error: saveResult.error?.message || 'Failed to save' };
  }

  listsCache = lists;
  notifySubscribers(listType, 'add', bookToAdd);

  return { success: true };
}

/**
 * Remove a book from a list
 * @param {string|number} bookId - The book ID
 * @param {string} listType - The list type (optional, searches all if not provided)
 * @returns {{ success: boolean, error?: string }}
 */
export function removeFromList(bookId, listType = null) {
  const lists = getReadingLists();
  const id = String(bookId);
  let removed = false;
  let removedFrom = null;
  let removedBook = null;

  const listsToCheck = listType ? [listType] : Object.keys(lists);

  for (const type of listsToCheck) {
    const index = lists[type].findIndex(book => String(book.id) === id);
    if (index !== -1) {
      removedBook = lists[type][index];
      lists[type].splice(index, 1);
      removed = true;
      removedFrom = type;
      break;
    }
  }

  if (!removed) {
    return { success: false, error: 'Book not found in list' };
  }

  // Save to storage
  const saveResult = saveData(STORAGE_KEYS.READING_LISTS, lists);

  if (!saveResult.success) {
    return { success: false, error: saveResult.error?.message || 'Failed to save' };
  }

  listsCache = lists;
  notifySubscribers(removedFrom, 'remove', removedBook);

  return { success: true };
}

/**
 * Move a book between lists
 * @param {string|number} bookId - The book ID
 * @param {string} fromList - Source list type
 * @param {string} toList - Destination list type
 * @returns {{ success: boolean, error?: string }}
 */
export function moveToList(bookId, fromList, toList) {
  const lists = getReadingLists();
  const id = String(bookId);

  const index = lists[fromList]?.findIndex(book => String(book.id) === id);
  if (index === -1 || index === undefined) {
    return { success: false, error: 'Book not found in source list' };
  }

  const book = lists[fromList][index];
  return addToList(book, toList);
}

/**
 * Update a book's progress (for currently reading)
 * @param {string|number} bookId - The book ID
 * @param {number} progress - Progress percentage (0-100)
 * @returns {{ success: boolean, error?: string }}
 */
export function updateProgress(bookId, progress) {
  const lists = getReadingLists();
  const id = String(bookId);

  const book = lists.reading.find(b => String(b.id) === id);
  if (!book) {
    return { success: false, error: 'Book not found in reading list' };
  }

  // Clamp progress between 0 and 100
  book.progress = Math.max(0, Math.min(100, progress));

  // If progress is 100, optionally move to completed
  if (book.progress === 100) {
    return addToList(book, LIST_TYPES.COMPLETED);
  }

  // Save to storage
  const saveResult = saveData(STORAGE_KEYS.READING_LISTS, lists);

  if (!saveResult.success) {
    return { success: false, error: saveResult.error?.message || 'Failed to save' };
  }

  listsCache = lists;
  notifySubscribers(LIST_TYPES.READING, 'update', book);

  return { success: true };
}

/**
 * Update a book's rating
 * @param {string|number} bookId - The book ID
 * @param {number} rating - Rating (0-5)
 * @returns {{ success: boolean, error?: string }}
 */
export function updateRating(bookId, rating) {
  const lists = getReadingLists();
  const id = String(bookId);
  let found = false;
  let updatedBook = null;
  let listType = null;

  for (const [type, bookList] of Object.entries(lists)) {
    const book = bookList.find(b => String(b.id) === id);
    if (book) {
      book.userRating = Math.max(0, Math.min(5, rating));
      found = true;
      updatedBook = book;
      listType = type;
      break;
    }
  }

  if (!found) {
    return { success: false, error: 'Book not found in any list' };
  }

  // Save to storage
  const saveResult = saveData(STORAGE_KEYS.READING_LISTS, lists);

  if (!saveResult.success) {
    return { success: false, error: saveResult.error?.message || 'Failed to save' };
  }

  listsCache = lists;
  notifySubscribers(listType, 'update', updatedBook);

  return { success: true };
}

/**
 * Get list statistics
 * @returns {Object} Statistics about reading lists
 */
export function getListStats() {
  const lists = getReadingLists();

  const completedBooks = lists.completed;
  const totalPages = completedBooks.reduce((sum, book) => sum + (book.pages || 0), 0);
  const avgRating = completedBooks.length > 0
    ? completedBooks.reduce((sum, book) => sum + (book.userRating || book.rating || 0), 0) / completedBooks.length
    : 0;

  return {
    reading: lists.reading.length,
    toRead: lists.toRead.length,
    completed: lists.completed.length,
    totalBooks: lists.reading.length + lists.toRead.length + lists.completed.length,
    totalPagesRead: totalPages,
    averageRating: Math.round(avgRating * 10) / 10,
  };
}

/**
 * Clear all reading lists
 * @returns {{ success: boolean, error?: string }}
 */
export function clearAllLists() {
  const emptyLists = {
    reading: [],
    toRead: [],
    completed: [],
  };

  const saveResult = saveData(STORAGE_KEYS.READING_LISTS, emptyLists);

  if (!saveResult.success) {
    return { success: false, error: saveResult.error?.message || 'Failed to save' };
  }

  listsCache = emptyLists;
  notifySubscribers(null, 'clear', null);

  return { success: true };
}

/**
 * Reset to default reading lists
 * @returns {{ success: boolean, error?: string }}
 */
export function resetToDefaults() {
  const saveResult = saveData(STORAGE_KEYS.READING_LISTS, defaultReadingLists);

  if (!saveResult.success) {
    return { success: false, error: saveResult.error?.message || 'Failed to save' };
  }

  listsCache = { ...defaultReadingLists };
  notifySubscribers(null, 'reset', null);

  return { success: true };
}

// Initialize on module load
initReadingLists();

// Expose to console for debugging
if (typeof window !== 'undefined') {
  window.__readingLists = {
    getReadingLists,
    getList,
    addToList,
    removeFromList,
    moveToList,
    updateProgress,
    updateRating,
    getListStats,
    getBookListStatus,
    clearAllLists,
    resetToDefaults,
    LIST_TYPES,
  };
}
