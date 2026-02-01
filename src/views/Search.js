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
    genre: Array.isArray(book.subjects) ? book.subjects[0] || '' : '',
    description: book.description || '',
    ...book
  };
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
    <div class="search-page">
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
      const response = await searchBooks(currentQuery, {
        page: currentPage,
        limit: booksPerPage,
      });

      const books = response.books.map(normalizeBookForDisplay);
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
      updateResultsState(resultsContainer, {
        error: true,
        errorMessage: error.message || 'Failed to search books. Please try again.',
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
