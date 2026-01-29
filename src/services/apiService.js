/**
 * BookTracker API Service
 * Handles all external API calls for book data
 * Uses Open Library API (primary) and Google Books API (secondary)
 */

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  // Open Library API (free, no key required)
  openLibrary: {
    baseUrl: 'https://openlibrary.org',
    searchUrl: 'https://openlibrary.org/search.json',
    coversUrl: 'https://covers.openlibrary.org/b',
  },

  // Google Books API (optional, requires API key for higher quotas)
  googleBooks: {
    baseUrl: 'https://www.googleapis.com/books/v1',
    // Set your API key here or use environment variable
    // For development, the API works without a key (lower quota)
    apiKey: null, // Replace with your key: 'YOUR_API_KEY'
  },

  // Rate limiting settings
  rateLimit: {
    maxRequests: 10,      // Maximum requests per time window
    timeWindow: 1000,     // Time window in milliseconds (1 second)
    retryDelay: 1000,     // Delay before retry on rate limit
    maxRetries: 3,        // Maximum number of retries
  },

  // Cache settings
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000,   // Cache TTL: 5 minutes
  },

  // Default search settings
  defaults: {
    resultsPerPage: 20,
    maxResults: 100,
  },
};

// =============================================================================
// State Management
// =============================================================================

const state = {
  // Loading states for different operations
  loading: {
    search: false,
    bookDetails: false,
    global: false,
  },

  // Request queue for rate limiting
  requestQueue: [],
  requestCount: 0,
  lastRequestTime: 0,

  // Simple in-memory cache
  cache: new Map(),

  // Error state
  lastError: null,

  // Subscribers for state changes
  subscribers: new Set(),
};

// =============================================================================
// State Management Helpers
// =============================================================================

/**
 * Subscribe to loading state changes
 * @param {Function} callback - Function to call on state change
 * @returns {Function} Unsubscribe function
 */
export function subscribeToLoadingState(callback) {
  state.subscribers.add(callback);
  return () => state.subscribers.delete(callback);
}

/**
 * Get current loading state
 * @returns {Object} Current loading state
 */
export function getLoadingState() {
  return { ...state.loading };
}

/**
 * Set loading state and notify subscribers
 * @param {string} key - Loading state key
 * @param {boolean} value - Loading state value
 */
function setLoading(key, value) {
  state.loading[key] = value;
  state.loading.global = Object.values(state.loading).some(v => v === true);
  notifySubscribers();
}

/**
 * Notify all subscribers of state changes
 */
function notifySubscribers() {
  state.subscribers.forEach(callback => {
    try {
      callback(getLoadingState());
    } catch (error) {
      console.error('Error in loading state subscriber:', error);
    }
  });
}

// =============================================================================
// Rate Limiting & Throttling
// =============================================================================

/**
 * Check if we can make a request based on rate limits
 * @returns {boolean} Whether request is allowed
 */
function canMakeRequest() {
  const now = Date.now();
  const { maxRequests, timeWindow } = CONFIG.rateLimit;

  // Reset counter if time window has passed
  if (now - state.lastRequestTime > timeWindow) {
    state.requestCount = 0;
    state.lastRequestTime = now;
  }

  return state.requestCount < maxRequests;
}

/**
 * Wait for rate limit to reset
 * @returns {Promise<void>}
 */
async function waitForRateLimit() {
  const now = Date.now();
  const { timeWindow } = CONFIG.rateLimit;
  const timeToWait = timeWindow - (now - state.lastRequestTime);

  if (timeToWait > 0) {
    await delay(timeToWait);
  }

  state.requestCount = 0;
  state.lastRequestTime = Date.now();
}

/**
 * Throttled fetch with rate limiting
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
async function throttledFetch(url, options = {}) {
  if (!canMakeRequest()) {
    await waitForRateLimit();
  }

  state.requestCount++;
  return fetch(url, options);
}

/**
 * Delay helper
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// Caching
// =============================================================================

/**
 * Get item from cache
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null
 */
function getFromCache(key) {
  if (!CONFIG.cache.enabled) return null;

  const cached = state.cache.get(key);
  if (!cached) return null;

  // Check if cache has expired
  if (Date.now() > cached.expiry) {
    state.cache.delete(key);
    return null;
  }

  return cached.data;
}

/**
 * Set item in cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
function setCache(key, data) {
  if (!CONFIG.cache.enabled) return;

  state.cache.set(key, {
    data,
    expiry: Date.now() + CONFIG.cache.ttl,
  });
}

/**
 * Clear all cached data
 */
export function clearCache() {
  state.cache.clear();
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, status, code, originalError = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Error codes for different error types
 */
export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Handle API errors consistently
 * @param {Error} error - Original error
 * @param {string} context - Context where error occurred
 * @returns {ApiError}
 */
function handleError(error, context) {
  console.error(`API Error in ${context}:`, error);

  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new ApiError(
      'Network error. Please check your internet connection.',
      0,
      ErrorCodes.NETWORK_ERROR,
      error
    );
  }

  // Timeout errors
  if (error.name === 'AbortError') {
    return new ApiError(
      'Request timed out. Please try again.',
      408,
      ErrorCodes.TIMEOUT,
      error
    );
  }

  // HTTP status errors
  if (error.status) {
    if (error.status === 429) {
      return new ApiError(
        'Too many requests. Please wait a moment and try again.',
        429,
        ErrorCodes.RATE_LIMITED,
        error
      );
    }
    if (error.status === 404) {
      return new ApiError(
        'Resource not found.',
        404,
        ErrorCodes.NOT_FOUND,
        error
      );
    }
  }

  // Already an ApiError
  if (error instanceof ApiError) {
    return error;
  }

  // Unknown errors
  return new ApiError(
    error.message || 'An unexpected error occurred.',
    500,
    ErrorCodes.UNKNOWN,
    error
  );
}

/**
 * Fetch with timeout
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await throttledFetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Retry failed requests with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} retries - Number of retries
 * @returns {Promise<any>}
 */
async function withRetry(fn, retries = CONFIG.rateLimit.maxRetries) {
  let lastError;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      if (error.code === ErrorCodes.NOT_FOUND) {
        throw error;
      }

      // Exponential backoff
      if (i < retries) {
        const backoffDelay = CONFIG.rateLimit.retryDelay * Math.pow(2, i);
        console.warn(`Request failed, retrying in ${backoffDelay}ms...`);
        await delay(backoffDelay);
      }
    }
  }

  throw lastError;
}

// =============================================================================
// Open Library API Functions
// =============================================================================

/**
 * Search books using Open Library API
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
async function searchOpenLibrary(query, options = {}) {
  const {
    page = 1,
    limit = CONFIG.defaults.resultsPerPage,
    sort = 'relevance',
    fields = 'key,title,author_name,first_publish_year,cover_i,isbn,subject,publisher,language,edition_count,ratings_average',
  } = options;

  const params = new URLSearchParams({
    q: query,
    page: page.toString(),
    limit: limit.toString(),
    fields,
  });

  // Add sorting if specified
  if (sort && sort !== 'relevance') {
    params.set('sort', sort);
  }

  const url = `${CONFIG.openLibrary.searchUrl}?${params}`;

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();

  return {
    books: data.docs.map(normalizeOpenLibraryBook),
    total: data.numFound,
    page,
    totalPages: Math.ceil(data.numFound / limit),
    hasMore: page * limit < data.numFound,
  };
}

/**
 * Get book details from Open Library
 * @param {string} workId - Open Library work ID (e.g., 'OL45883W')
 * @returns {Promise<Object>} Book details
 */
async function getOpenLibraryBookDetails(workId) {
  // Ensure workId has correct format
  const cleanId = workId.replace('/works/', '').replace('.json', '');
  const url = `${CONFIG.openLibrary.baseUrl}/works/${cleanId}.json`;

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new ApiError('Book not found', 404, ErrorCodes.NOT_FOUND);
    }
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();

  // Fetch author details if available
  let authors = [];
  if (data.authors && data.authors.length > 0) {
    const authorPromises = data.authors.slice(0, 3).map(async (author) => {
      try {
        const authorKey = author.author?.key || author.key;
        if (!authorKey) return null;
        const authorResponse = await fetchWithTimeout(
          `${CONFIG.openLibrary.baseUrl}${authorKey}.json`
        );
        if (authorResponse.ok) {
          const authorData = await authorResponse.json();
          return authorData.name;
        }
      } catch {
        return null;
      }
    });
    authors = (await Promise.all(authorPromises)).filter(Boolean);
  }

  return normalizeOpenLibraryBookDetails(data, authors);
}

/**
 * Normalize Open Library search result to common format
 * @param {Object} book - Raw book data from Open Library
 * @returns {Object} Normalized book object
 */
function normalizeOpenLibraryBook(book) {
  return {
    id: book.key?.replace('/works/', '') || book.key,
    source: 'openlibrary',
    title: book.title || 'Unknown Title',
    author: Array.isArray(book.author_name)
      ? book.author_name.join(', ')
      : book.author_name || 'Unknown Author',
    authors: book.author_name || [],
    publishedYear: book.first_publish_year || null,
    coverUrl: book.cover_i
      ? `${CONFIG.openLibrary.coversUrl}/id/${book.cover_i}-M.jpg`
      : null,
    coverUrlLarge: book.cover_i
      ? `${CONFIG.openLibrary.coversUrl}/id/${book.cover_i}-L.jpg`
      : null,
    isbn: book.isbn?.[0] || null,
    isbns: book.isbn || [],
    subjects: book.subject?.slice(0, 5) || [],
    publisher: Array.isArray(book.publisher)
      ? book.publisher[0]
      : book.publisher || null,
    language: book.language?.[0] || null,
    editionCount: book.edition_count || 0,
    rating: book.ratings_average
      ? Math.round(book.ratings_average * 10) / 10
      : null,
  };
}

/**
 * Normalize Open Library book details to common format
 * @param {Object} book - Raw book details from Open Library
 * @param {Array} authors - Author names
 * @returns {Object} Normalized book details
 */
function normalizeOpenLibraryBookDetails(book, authors) {
  const coverId = book.covers?.[0];

  // Handle description which can be a string or an object
  let description = '';
  if (typeof book.description === 'string') {
    description = book.description;
  } else if (book.description?.value) {
    description = book.description.value;
  }

  return {
    id: book.key?.replace('/works/', '') || book.key,
    source: 'openlibrary',
    title: book.title || 'Unknown Title',
    author: authors.join(', ') || 'Unknown Author',
    authors,
    description,
    publishedYear: book.first_publish_date
      ? parseInt(book.first_publish_date)
      : null,
    coverUrl: coverId
      ? `${CONFIG.openLibrary.coversUrl}/id/${coverId}-M.jpg`
      : null,
    coverUrlLarge: coverId
      ? `${CONFIG.openLibrary.coversUrl}/id/${coverId}-L.jpg`
      : null,
    subjects: book.subjects?.slice(0, 10) || [],
    subjectPlaces: book.subject_places?.slice(0, 5) || [],
    subjectTimes: book.subject_times?.slice(0, 5) || [],
    links: book.links || [],
    excerpts: book.excerpts?.map(e => e.excerpt) || [],
    created: book.created?.value || null,
    lastModified: book.last_modified?.value || null,
  };
}

// =============================================================================
// Google Books API Functions (Alternative)
// =============================================================================

/**
 * Search books using Google Books API
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
async function searchGoogleBooks(query, options = {}) {
  const {
    page = 1,
    limit = CONFIG.defaults.resultsPerPage,
    orderBy = 'relevance',
    printType = 'books',
    langRestrict = null,
  } = options;

  const startIndex = (page - 1) * limit;

  const params = new URLSearchParams({
    q: query,
    startIndex: startIndex.toString(),
    maxResults: limit.toString(),
    orderBy,
    printType,
  });

  if (langRestrict) {
    params.set('langRestrict', langRestrict);
  }

  if (CONFIG.googleBooks.apiKey) {
    params.set('key', CONFIG.googleBooks.apiKey);
  }

  const url = `${CONFIG.googleBooks.baseUrl}/volumes?${params}`;

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();

  return {
    books: (data.items || []).map(normalizeGoogleBook),
    total: data.totalItems || 0,
    page,
    totalPages: Math.ceil((data.totalItems || 0) / limit),
    hasMore: startIndex + limit < (data.totalItems || 0),
  };
}

/**
 * Get book details from Google Books API
 * @param {string} volumeId - Google Books volume ID
 * @returns {Promise<Object>} Book details
 */
async function getGoogleBookDetails(volumeId) {
  const params = new URLSearchParams();

  if (CONFIG.googleBooks.apiKey) {
    params.set('key', CONFIG.googleBooks.apiKey);
  }

  const url = `${CONFIG.googleBooks.baseUrl}/volumes/${volumeId}?${params}`;

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new ApiError('Book not found', 404, ErrorCodes.NOT_FOUND);
    }
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return normalizeGoogleBookDetails(data);
}

/**
 * Normalize Google Books search result to common format
 * @param {Object} item - Raw book data from Google Books
 * @returns {Object} Normalized book object
 */
function normalizeGoogleBook(item) {
  const info = item.volumeInfo || {};
  const imageLinks = info.imageLinks || {};

  return {
    id: item.id,
    source: 'googlebooks',
    title: info.title || 'Unknown Title',
    author: info.authors?.join(', ') || 'Unknown Author',
    authors: info.authors || [],
    publishedYear: info.publishedDate
      ? parseInt(info.publishedDate.substring(0, 4))
      : null,
    coverUrl: imageLinks.thumbnail?.replace('http:', 'https:') || null,
    coverUrlLarge: imageLinks.large?.replace('http:', 'https:')
      || imageLinks.medium?.replace('http:', 'https:')
      || null,
    isbn: info.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier
      || info.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier
      || null,
    subjects: info.categories || [],
    publisher: info.publisher || null,
    language: info.language || null,
    pageCount: info.pageCount || null,
    rating: info.averageRating || null,
    ratingsCount: info.ratingsCount || 0,
    description: info.description || '',
  };
}

/**
 * Normalize Google Books details to common format
 * @param {Object} item - Raw book details from Google Books
 * @returns {Object} Normalized book details
 */
function normalizeGoogleBookDetails(item) {
  const info = item.volumeInfo || {};
  const imageLinks = info.imageLinks || {};
  const saleInfo = item.saleInfo || {};
  const accessInfo = item.accessInfo || {};

  return {
    id: item.id,
    source: 'googlebooks',
    title: info.title || 'Unknown Title',
    subtitle: info.subtitle || null,
    author: info.authors?.join(', ') || 'Unknown Author',
    authors: info.authors || [],
    description: info.description || '',
    publishedDate: info.publishedDate || null,
    publishedYear: info.publishedDate
      ? parseInt(info.publishedDate.substring(0, 4))
      : null,
    publisher: info.publisher || null,
    pageCount: info.pageCount || null,
    coverUrl: imageLinks.thumbnail?.replace('http:', 'https:') || null,
    coverUrlLarge: imageLinks.extraLarge?.replace('http:', 'https:')
      || imageLinks.large?.replace('http:', 'https:')
      || imageLinks.medium?.replace('http:', 'https:')
      || null,
    isbn13: info.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier || null,
    isbn10: info.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier || null,
    subjects: info.categories || [],
    language: info.language || null,
    rating: info.averageRating || null,
    ratingsCount: info.ratingsCount || 0,
    previewLink: info.previewLink || null,
    infoLink: info.infoLink || null,
    buyLink: saleInfo.buyLink || null,
    isEbook: saleInfo.isEbook || false,
    webReaderLink: accessInfo.webReaderLink || null,
    maturityRating: info.maturityRating || null,
  };
}

// =============================================================================
// Public API Functions
// =============================================================================

/**
 * Search for books
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Results per page (default: 20)
 * @param {string} options.sort - Sort order (relevance, new, rating)
 * @param {string} options.source - API source ('openlibrary' or 'googlebooks')
 * @returns {Promise<Object>} Search results with books array and pagination info
 *
 * @example
 * const results = await searchBooks('harry potter', { page: 1, limit: 10 });
 * console.log(results.books); // Array of normalized book objects
 * console.log(results.total); // Total number of results
 */
export async function searchBooks(query, options = {}) {
  const { source = 'openlibrary', ...searchOptions } = options;
  const cacheKey = `search:${source}:${query}:${JSON.stringify(searchOptions)}`;

  // Check cache first
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('Returning cached search results');
    return cached;
  }

  setLoading('search', true);
  state.lastError = null;

  try {
    const result = await withRetry(async () => {
      if (source === 'googlebooks') {
        return await searchGoogleBooks(query, searchOptions);
      }
      return await searchOpenLibrary(query, searchOptions);
    });

    // Cache the results
    setCache(cacheKey, result);

    return result;
  } catch (error) {
    const apiError = handleError(error, 'searchBooks');
    state.lastError = apiError;
    throw apiError;
  } finally {
    setLoading('search', false);
  }
}

/**
 * Get detailed information about a specific book
 * @param {string} bookId - Book identifier (work ID for Open Library, volume ID for Google Books)
 * @param {Object} options - Options
 * @param {string} options.source - API source ('openlibrary' or 'googlebooks')
 * @returns {Promise<Object>} Detailed book information
 *
 * @example
 * const book = await getBookDetails('OL45883W', { source: 'openlibrary' });
 * console.log(book.title, book.author, book.description);
 */
export async function getBookDetails(bookId, options = {}) {
  const { source = 'openlibrary' } = options;
  const cacheKey = `book:${source}:${bookId}`;

  // Check cache first
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('Returning cached book details');
    return cached;
  }

  setLoading('bookDetails', true);
  state.lastError = null;

  try {
    const result = await withRetry(async () => {
      if (source === 'googlebooks') {
        return await getGoogleBookDetails(bookId);
      }
      return await getOpenLibraryBookDetails(bookId);
    });

    // Cache the results
    setCache(cacheKey, result);

    return result;
  } catch (error) {
    const apiError = handleError(error, 'getBookDetails');
    state.lastError = apiError;
    throw apiError;
  } finally {
    setLoading('bookDetails', false);
  }
}

/**
 * Search books by ISBN
 * @param {string} isbn - ISBN-10 or ISBN-13
 * @returns {Promise<Object|null>} Book details or null if not found
 */
export async function searchByISBN(isbn) {
  // Clean ISBN (remove dashes and spaces)
  const cleanIsbn = isbn.replace(/[-\s]/g, '');

  try {
    const results = await searchBooks(`isbn:${cleanIsbn}`, { limit: 1 });
    return results.books[0] || null;
  } catch (error) {
    if (error.code === ErrorCodes.NOT_FOUND) {
      return null;
    }
    throw error;
  }
}

/**
 * Search books by author
 * @param {string} authorName - Author name
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function searchByAuthor(authorName, options = {}) {
  return searchBooks(`author:${authorName}`, options);
}

/**
 * Search books by subject/category
 * @param {string} subject - Subject or category
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function searchBySubject(subject, options = {}) {
  return searchBooks(`subject:${subject}`, options);
}

/**
 * Get the last error that occurred
 * @returns {ApiError|null} Last error or null
 */
export function getLastError() {
  return state.lastError;
}

/**
 * Check if currently loading
 * @param {string} key - Optional specific loading key
 * @returns {boolean} Loading state
 */
export function isLoading(key = null) {
  if (key) {
    return state.loading[key] || false;
  }
  return state.loading.global;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get cover image URL for a book
 * @param {Object} book - Book object
 * @param {string} size - Size: 'small', 'medium', 'large'
 * @returns {string|null} Cover URL or null
 */
export function getCoverUrl(book, size = 'medium') {
  if (!book) return null;

  if (size === 'large' && book.coverUrlLarge) {
    return book.coverUrlLarge;
  }

  return book.coverUrl || null;
}

/**
 * Format author names for display
 * @param {Array|string} authors - Authors array or string
 * @param {number} maxDisplay - Maximum authors to display
 * @returns {string} Formatted author string
 */
export function formatAuthors(authors, maxDisplay = 2) {
  if (!authors) return 'Unknown Author';

  const authorList = Array.isArray(authors) ? authors : [authors];

  if (authorList.length === 0) return 'Unknown Author';
  if (authorList.length <= maxDisplay) return authorList.join(', ');

  return `${authorList.slice(0, maxDisplay).join(', ')} and ${authorList.length - maxDisplay} more`;
}

/**
 * Generate a placeholder cover URL
 * @param {string} title - Book title
 * @returns {string} Placeholder URL or data URI
 */
export function getPlaceholderCover(title = 'Book') {
  // Return a simple SVG data URI as placeholder
  const initials = title
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="192" viewBox="0 0 128 192">
      <rect fill="#e5e7eb" width="128" height="192"/>
      <text x="64" y="96" font-family="Arial, sans-serif" font-size="32" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

// =============================================================================
// Export configuration for customization
// =============================================================================

export { CONFIG as apiConfig };

// =============================================================================
// Debug helpers (only in development)
// =============================================================================

if (typeof window !== 'undefined') {
  // Expose for browser console testing
  window.__bookTrackerApi = {
    searchBooks,
    getBookDetails,
    searchByISBN,
    searchByAuthor,
    searchBySubject,
    getLoadingState,
    clearCache,
    getLastError,
    CONFIG,
  };

  console.log(
    '%c📚 BookTracker API Ready',
    'color: #6366f1; font-weight: bold; font-size: 14px;'
  );
  console.log(
    'Test in console: window.__bookTrackerApi.searchBooks("harry potter").then(console.log)'
  );
}
