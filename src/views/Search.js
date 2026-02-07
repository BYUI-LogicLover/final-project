import { searchBooks } from '../services/apiService.js';
import { createBookCard } from '../components/BookCard.js';
import {
  createSearchBar,
  createResultsContainer,
  updateResultsState,
} from '../components/SearchBar.js';

/**
 * Debounce utility for search input
 */
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Normalize API book data to match BookCard expected format
 */
function normalizeBookForDisplay(book) {
  return {
    id: book.id,
    title: book.title,
    author: Array.isArray(book.authors) ? book.authors.join(', ') : book.authors || 'Unknown',
    cover: book.coverUrl,
    rating: book.rating || 0,
    pages: book.pageCount || 0,
    published: book.publishDate || '',
    publishedYear: book.publishedYear || null,
    genre: Array.isArray(book.subjects) ? book.subjects[0] || '' : '',
    subjects: book.subjects || [],
    description: book.description || '',
    ...book
  };
}

/**
 * Map filter types to Open Library subject search terms
 */
const FILTER_SUBJECT_MAP = {
  fiction: 'fiction',
  nonfiction: 'nonfiction',
  fantasy: 'fantasy',
  scifi: 'science_fiction',
  romance: 'romance',
  mystery: 'mystery',
};

/**
 * Build search query with genre filters
 * @param {string} baseQuery - The user's search query
 * @param {Array} types - Selected genre filter types
 * @returns {string} Modified query with subject filters
 */
function buildSearchQuery(baseQuery, types = []) {
  if (!types || types.length === 0) {
    return baseQuery;
  }

  // Build subject query parts
  const subjectQueries = types
    .map(type => FILTER_SUBJECT_MAP[type])
    .filter(Boolean)
    .map(subject => `subject:${subject}`);

  if (subjectQueries.length === 0) {
    return baseQuery;
  }

  // Combine base query with subject filters
  return `${baseQuery} ${subjectQueries.join(' ')}`;
}

/**
 * Map sort option to Open Library sort parameter
 */
const SORT_MAP = {
  relevance: null, // Default, no sort param needed
  newest: 'new',
  rating: null, // Client-side sort needed
  title: null, // Client-side sort needed
};

/**
 * Sort books client-side when API doesn't support the sort option
 * @param {Array} books - Array of books to sort
 * @param {string} sortBy - Sort option
 * @returns {Array} Sorted books
 */
function sortBooksClientSide(books, sortBy) {
  if (!sortBy || sortBy === 'relevance') {
    return books; // Keep API order
  }

  const sortedBooks = [...books];

  switch (sortBy) {
    case 'newest':
      // Sort by published year descending (newest first)
      sortedBooks.sort((a, b) => {
        const yearA = a.publishedYear || 0;
        const yearB = b.publishedYear || 0;
        return yearB - yearA;
      });
      break;

    case 'rating':
      // Sort by rating descending (highest first)
      sortedBooks.sort((a, b) => {
        const ratingA = a.rating || 0;
        const ratingB = b.rating || 0;
        return ratingB - ratingA;
      });
      break;

    case 'title':
      // Sort by title alphabetically
      sortedBooks.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
      break;

    default:
      break;
  }

  return sortedBooks;
}

export function renderSearch(container) {
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const initialQuery = urlParams.get('q') || '';

  // State
  let currentPage = 1;
  let currentQuery = initialQuery;
  let currentFilters = { types: [], sort: 'relevance' };
  const booksPerPage = 8;
  let totalPages = 1;
  let lastSearchResults = [];

  // Create page structure
  container.innerHTML = `
    <div class="search-page" style="display: block;">
      <div class="search-bar-wrapper" id="search-bar-container"></div>
      <div class="search-results-container" id="search-results-container"></div>
    </div>
  `;

  const searchBarContainer = document.getElementById('search-bar-container');
  const resultsContainer = document.getElementById('search-results-container');

  // Create and append the search bar and results components
  searchBarContainer.appendChild(createSearchBar({
    initialQuery,
    onSearch: handleSearch,
    onFilterChange: handleQuickFilterChange,
  }));
  resultsContainer.appendChild(createResultsContainer());

  // Get elements from the dynamically created components
  const resultsGrid = resultsContainer.querySelector('#results-grid');
  const pagination = resultsContainer.querySelector('#results-pagination');
  const searchInput = searchBarContainer.querySelector('#search-bar-input');

  // Debounced search for live typing (300ms delay)
  const debouncedSearch = debounce((query) => {
    currentQuery = query;
    currentPage = 1;
    performSearch();
  }, 300);

  // Connect debounced search to input for live search as user types
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });
  }

  /**
   * Handle search submission
   */
  function handleSearch(query, filters = currentFilters) {
    currentQuery = query;
    currentFilters = filters;
    currentPage = 1;
    performSearch();
  }

  /**
   * Handle quick filter changes
   */
  function handleQuickFilterChange(filters) {
    currentFilters = { ...currentFilters, ...filters };
    currentPage = 1;
    performSearch();
  }

  /**
   * Perform the search with current parameters
   */
  async function performSearch() {
    // Show loading state
    updateResultsState(resultsContainer, { loading: true });

    // Don't search if query is empty
    if (!currentQuery.trim()) {
      updateResultsState(resultsContainer, {
        empty: true,
        count: 0,
        query: '',
      });
      return;
    }

    try {
      // Build query with genre filters
      const searchQuery = buildSearchQuery(currentQuery, currentFilters.types);

      // Get API sort parameter (if supported)
      const apiSort = SORT_MAP[currentFilters.sort];

      const response = await searchBooks(searchQuery, {
        page: currentPage,
        limit: booksPerPage,
        sort: apiSort,
      });

      let books = response.books.map(normalizeBookForDisplay);

      // Apply client-side sorting if needed
      books = sortBooksClientSide(books, currentFilters.sort);

      lastSearchResults = books;
      totalPages = response.totalPages || 1;

      if (books.length === 0) {
        updateResultsState(resultsContainer, {
          empty: true,
          count: 0,
          query: currentQuery,
        });
        return;
      }

      // Success - display books
      displayBooks(books);

      updateResultsState(resultsContainer, {
        loading: false,
        empty: false,
        error: false,
        count: response.total || books.length,
        query: currentQuery,
        showPagination: totalPages > 1,
      });
    } catch (error) {
      const message = error.status === 442
        ? 'Search error, please try again.'
        : error.message || 'Failed to search books. Please try again.';
      updateResultsState(resultsContainer, {
        error: true,
        errorMessage: message,
      });
    }
  }


  /**
   * Display books (API already handles pagination)
   */
  function displayBooks(books) {
    resultsGrid.innerHTML = '';

    books.forEach(book => {
      resultsGrid.appendChild(createBookCard(book));
    });

    resultsGrid.classList.add('grid-view');
    renderPagination();
  }

  /**
   * Render pagination controls
   */
  function renderPagination() {
    pagination.innerHTML = '';

    if (totalPages <= 1) {
      pagination.style.display = 'none';
      return;
    }

    pagination.style.display = 'flex';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-secondary btn-sm';
    prevBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m15 18-6-6 6-6"/>
      </svg>
      Prev
    `;
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
      currentPage--;
      performSearch();
      scrollToTop();
    });
    pagination.appendChild(prevBtn);

    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      pagination.appendChild(createPageButton(1));
      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'pagination-ellipsis';
        ellipsis.textContent = '...';
        ellipsis.style.padding = '0 8px';
        ellipsis.style.color = 'var(--gray-400)';
        pagination.appendChild(ellipsis);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pagination.appendChild(createPageButton(i));
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'pagination-ellipsis';
        ellipsis.textContent = '...';
        ellipsis.style.padding = '0 8px';
        ellipsis.style.color = 'var(--gray-400)';
        pagination.appendChild(ellipsis);
      }
      pagination.appendChild(createPageButton(totalPages));
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-secondary btn-sm';
    nextBtn.innerHTML = `
      Next
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    `;
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      currentPage++;
      performSearch();
      scrollToTop();
    });
    pagination.appendChild(nextBtn);
  }

  /**
   * Create a page number button
   */
  function createPageButton(pageNum) {
    const btn = document.createElement('button');
    btn.className = `btn btn-sm ${pageNum === currentPage ? 'btn-primary' : 'btn-ghost'}`;
    btn.textContent = pageNum;
    btn.addEventListener('click', () => {
      currentPage = pageNum;
      performSearch();
      scrollToTop();
    });
    return btn;
  }

  /**
   * Scroll to top of results
   */
  function scrollToTop() {
    const searchHeader = document.getElementById('search-header');
    if (searchHeader) {
      searchHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }


  // Initial search
  performSearch();
}
