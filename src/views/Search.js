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
      <aside class="filters-sidebar" id="filters-sidebar">
        <h3>Advanced Filters</h3>

        <div class="filter-group">
          <label for="genre-filter">Genre</label>
          <select id="genre-filter">
            <option value="">All Genres</option>
            <option value="fiction">Fiction</option>
            <option value="fantasy">Fantasy</option>
            <option value="science-fiction">Science Fiction</option>
            <option value="romance">Romance</option>
            <option value="dystopian">Dystopian</option>
            <option value="classic">Classic</option>
            <option value="gothic">Gothic</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="rating-filter">Minimum Rating</label>
          <select id="rating-filter">
            <option value="">Any Rating</option>
            <option value="4.5">4.5+ Stars</option>
            <option value="4">4+ Stars</option>
            <option value="3.5">3.5+ Stars</option>
            <option value="3">3+ Stars</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="year-filter">Publication Year</label>
          <select id="year-filter">
            <option value="">Any Year</option>
            <option value="2020">2020s</option>
            <option value="2010">2010s</option>
            <option value="2000">2000s</option>
            <option value="1900">20th Century</option>
            <option value="1800">19th Century & Earlier</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="pages-filter">Page Count</label>
          <select id="pages-filter">
            <option value="">Any Length</option>
            <option value="short">Under 200 pages</option>
            <option value="medium">200-400 pages</option>
            <option value="long">400-600 pages</option>
            <option value="epic">600+ pages</option>
          </select>
        </div>

        <button class="btn btn-primary btn-block mt-4" id="apply-filters">
          Apply Filters
        </button>

        <button class="btn btn-ghost btn-block mt-2" id="clear-filters">
          Clear All Filters
        </button>
      </aside>

      <div class="search-results" id="search-results-area">
        <div class="search-header" id="search-header"></div>
        <div id="results-container-wrapper"></div>
      </div>
    </div>
  `;

  // Get container elements
  const searchHeader = document.getElementById('search-header');
  const resultsWrapper = document.getElementById('results-container-wrapper');

  // Create and append search bar
  const searchBar = createSearchBar({
    initialQuery,
    placeholder: 'Search for books, authors, or ISBN...',
    helperText: 'Search by title, author name, genre, or ISBN number',
    autofocus: true,
    showFilters: true,
    onSearch: handleSearch,
    onFilterChange: handleQuickFilterChange,
  });
  searchHeader.appendChild(searchBar);

  // Create and append results container
  const resultsContainer = createResultsContainer({
    id: 'search-results',
    showStats: true,
  });
  resultsWrapper.appendChild(resultsContainer);

  // Get elements
  const resultsGrid = document.getElementById('results-grid');
  const pagination = document.getElementById('results-pagination');

  // Filter elements
  const genreFilter = document.getElementById('genre-filter');
  const ratingFilter = document.getElementById('rating-filter');
  const yearFilter = document.getElementById('year-filter');
  const pagesFilter = document.getElementById('pages-filter');
  const applyFiltersBtn = document.getElementById('apply-filters');
  const clearFiltersBtn = document.getElementById('clear-filters');
  const retryBtn = document.getElementById('retry-search');

  // Debounced search for live typing (300ms delay)
  const debouncedSearch = debounce((query) => {
    currentQuery = query;
    currentPage = 1;
    performSearch();
  }, 300);

  // Connect debounced search to input for live search as user types
  const searchInput = document.getElementById('search-bar-input');
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

      // Apply local filters (genre, rating, year, pages) since API doesn't support them
      const filteredBooks = applyLocalFilters(books);

      if (filteredBooks.length === 0) {
        updateResultsState(resultsContainer, {
          empty: true,
          count: 0,
          query: currentQuery,
        });
        return;
      }

      // Success - display books
      displayBooks(filteredBooks);

      updateResultsState(resultsContainer, {
        loading: false,
        empty: false,
        error: false,
        count: response.total || filteredBooks.length,
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
   * Apply local filters to API results (genre, rating, year, pages)
   */
  function applyLocalFilters(books) {
    const genre = genreFilter.value.toLowerCase();
    const minRating = parseFloat(ratingFilter.value) || 0;
    const yearRange = yearFilter.value;
    const pageRange = pagesFilter.value;

    return books.filter(book => {
      // Genre filter
      const bookGenre = (book.genre || '').toLowerCase();
      const matchesGenre = !genre || bookGenre.includes(genre);

      // Rating filter
      const matchesRating = (book.rating || 0) >= minRating;

      // Year filter
      let matchesYear = true;
      if (yearRange && book.published) {
        const pubYear = parseInt(book.published);
        if (!isNaN(pubYear)) {
          switch (yearRange) {
            case '2020':
              matchesYear = pubYear >= 2020;
              break;
            case '2010':
              matchesYear = pubYear >= 2010 && pubYear < 2020;
              break;
            case '2000':
              matchesYear = pubYear >= 2000 && pubYear < 2010;
              break;
            case '1900':
              matchesYear = pubYear >= 1900 && pubYear < 2000;
              break;
            case '1800':
              matchesYear = pubYear < 1900;
              break;
          }
        }
      }

      // Page count filter
      let matchesPages = true;
      if (pageRange && book.pages) {
        switch (pageRange) {
          case 'short':
            matchesPages = book.pages < 200;
            break;
          case 'medium':
            matchesPages = book.pages >= 200 && book.pages < 400;
            break;
          case 'long':
            matchesPages = book.pages >= 400 && book.pages < 600;
            break;
          case 'epic':
            matchesPages = book.pages >= 600;
            break;
        }
      }

      // Quick filter types
      let matchesType = true;
      if (currentFilters.types && currentFilters.types.length > 0) {
        const genreLower = bookGenre;
        matchesType = currentFilters.types.some(type => {
          switch (type) {
            case 'fiction':
              return genreLower.includes('fiction') && !genreLower.includes('non-fiction');
            case 'nonfiction':
              return genreLower.includes('non-fiction');
            case 'fantasy':
              return genreLower.includes('fantasy');
            case 'scifi':
              return genreLower.includes('science fiction') || genreLower.includes('sci-fi');
            case 'romance':
              return genreLower.includes('romance');
            default:
              return true;
          }
        });
      }

      return matchesGenre && matchesRating && matchesYear && matchesPages && matchesType;
    }).sort((a, b) => {
      // Sort based on current sort selection
      switch (currentFilters.sort) {
        case 'newest':
          return parseInt(b.published || 0) - parseInt(a.published || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0; // Keep original order for relevance
      }
    });
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

  /**
   * Clear all filters
   */
  function clearAllFilters() {
    genreFilter.value = '';
    ratingFilter.value = '';
    yearFilter.value = '';
    pagesFilter.value = '';

    // Reset quick filters
    const filterBtns = searchBar.querySelectorAll('.quick-filter-btn');
    filterBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.value === 'all') {
        btn.classList.add('active');
      }
    });

    const sortSelect = searchBar.querySelector('#quick-sort');
    if (sortSelect) {
      sortSelect.value = 'relevance';
    }

    currentFilters = { types: [], sort: 'relevance' };
    performSearch();
  }

  // Event listeners for sidebar filters
  applyFiltersBtn.addEventListener('click', () => performSearch());
  clearFiltersBtn.addEventListener('click', clearAllFilters);

  // Retry button for error state
  if (retryBtn) {
    retryBtn.addEventListener('click', () => performSearch());
  }

  // Allow filters to trigger search on change (optional - for immediate feedback)
  [genreFilter, ratingFilter, yearFilter, pagesFilter].forEach(filter => {
    filter.addEventListener('change', () => {
      // Optional: Auto-apply filters on change
      // performSearch();
    });
  });

  // Initial search
  performSearch();
}
