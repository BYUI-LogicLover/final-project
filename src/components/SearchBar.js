/**
 * SearchBar Component
 * A reusable search bar with icon, filters, and responsive design
 */

/**
 * Create a search bar component
 * @param {Object} options - Configuration options
 * @param {string} options.initialQuery - Initial search query
 * @param {string} options.placeholder - Input placeholder text
 * @param {string} options.helperText - Helper text below input
 * @param {boolean} options.autofocus - Whether to autofocus the input
 * @param {boolean} options.showFilters - Whether to show inline filters
 * @param {Function} options.onSearch - Callback when search is triggered
 * @param {Function} options.onFilterChange - Callback when filters change
 * @returns {HTMLElement} Search bar element
 */
export function createSearchBar(options = {}) {
  const {
    initialQuery = '',
    placeholder = 'Search for books, authors, or ISBN...',
    helperText = 'Try searching by title, author name, or ISBN number',
    autofocus = true,
    showFilters = true,
    onSearch = () => {},
    onFilterChange = () => {},
  } = options;

  const wrapper = document.createElement('div');
  wrapper.className = 'search-bar-wrapper';

  wrapper.innerHTML = `
    <div class="search-bar">
      <div class="search-input-container">
        <span class="search-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
        </span>
        <input
          type="search"
          class="search-input"
          id="search-bar-input"
          placeholder="${placeholder}"
          value="${escapeHtml(initialQuery)}"
          aria-label="Search books"
          autocomplete="off"
          spellcheck="false"
        />
        <button type="button" class="search-clear-btn ${initialQuery ? 'visible' : ''}" id="search-clear" aria-label="Clear search">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>
      </div>
      <button type="button" class="search-btn btn btn-primary" id="search-submit">
        <span class="search-btn-text">Search</span>
        <span class="search-btn-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
        </span>
      </button>
    </div>
    ${helperText ? `<p class="search-helper-text">${helperText}</p>` : ''}
    ${showFilters ? createQuickFiltersHTML() : ''}
  `;

  // Get elements
  const input = wrapper.querySelector('#search-bar-input');
  const clearBtn = wrapper.querySelector('#search-clear');
  const submitBtn = wrapper.querySelector('#search-submit');

  // Autofocus
  if (autofocus) {
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      input.focus();
      // Move cursor to end of input
      const len = input.value.length;
      input.setSelectionRange(len, len);
    }, 100);
  }

  // Event handlers
  const handleSearch = () => {
    const query = input.value.trim();
    onSearch(query, getSelectedFilters(wrapper));
  };

  const handleClear = () => {
    input.value = '';
    clearBtn.classList.remove('visible');
    input.focus();
    onSearch('', getSelectedFilters(wrapper));
  };

  const handleInput = () => {
    if (input.value.length > 0) {
      clearBtn.classList.add('visible');
    } else {
      clearBtn.classList.remove('visible');
    }
  };

  const handleKeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  // Attach events
  submitBtn.addEventListener('click', handleSearch);
  clearBtn.addEventListener('click', handleClear);
  input.addEventListener('input', handleInput);
  input.addEventListener('keydown', handleKeydown);

  // Filter events
  if (showFilters) {
    const filterBtns = wrapper.querySelectorAll('.quick-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Toggle active state
        if (btn.dataset.value === 'all') {
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        } else {
          wrapper.querySelector('[data-value="all"]')?.classList.remove('active');
          btn.classList.toggle('active');
        }
        onFilterChange(getSelectedFilters(wrapper));
      });
    });

    const sortSelect = wrapper.querySelector('#quick-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        onFilterChange(getSelectedFilters(wrapper));
      });
    }
  }

  return wrapper;
}

/**
 * Create quick filters HTML
 * @returns {string} HTML string for quick filters
 */
function createQuickFiltersHTML() {
  return `
    <div class="search-quick-filters">
      <div class="quick-filters-group">
        <span class="quick-filters-label">Quick filters:</span>
        <div class="quick-filter-buttons">
          <button type="button" class="quick-filter-btn active" data-filter="type" data-value="all">All</button>
          <button type="button" class="quick-filter-btn" data-filter="type" data-value="fiction">Fiction</button>
          <button type="button" class="quick-filter-btn" data-filter="type" data-value="nonfiction">Non-Fiction</button>
          <button type="button" class="quick-filter-btn" data-filter="type" data-value="fantasy">Fantasy</button>
          <button type="button" class="quick-filter-btn" data-filter="type" data-value="scifi">Sci-Fi</button>
          <button type="button" class="quick-filter-btn" data-filter="type" data-value="romance">Romance</button>
        </div>
      </div>
      <div class="quick-sort-group">
        <label for="quick-sort" class="quick-sort-label">Sort by:</label>
        <select id="quick-sort" class="quick-sort-select">
          <option value="relevance">Relevance</option>
          <option value="newest">Newest First</option>
          <option value="rating">Highest Rated</option>
          <option value="title">Title A-Z</option>
        </select>
      </div>
    </div>
  `;
}

/**
 * Get selected filters from the search bar
 * @param {HTMLElement} wrapper - Search bar wrapper element
 * @returns {Object} Selected filter values
 */
function getSelectedFilters(wrapper) {
  const activeFilters = wrapper.querySelectorAll('.quick-filter-btn.active:not([data-value="all"])');
  const sortSelect = wrapper.querySelector('#quick-sort');

  return {
    types: Array.from(activeFilters).map(btn => btn.dataset.value),
    sort: sortSelect?.value || 'relevance',
  };
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Create a compact search bar (for header)
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} Compact search bar element
 */
export function createCompactSearchBar(options = {}) {
  const {
    initialQuery = '',
    placeholder = 'Search books...',
    onSearch = () => {},
  } = options;

  const wrapper = document.createElement('div');
  wrapper.className = 'search-bar-compact';

  wrapper.innerHTML = `
    <div class="search-bar-compact-inner">
      <span class="search-icon-compact">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </svg>
      </span>
      <input
        type="search"
        class="search-input-compact"
        placeholder="${placeholder}"
        value="${escapeHtml(initialQuery)}"
        aria-label="Search books"
      />
    </div>
  `;

  const input = wrapper.querySelector('.search-input-compact');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch(input.value.trim());
    }
  });

  return wrapper;
}

/**
 * Create search results container
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} Results container element
 */
export function createResultsContainer(options = {}) {
  const {
    id = 'search-results',
    showStats = true,
  } = options;

  const container = document.createElement('div');
  container.className = 'search-results-container';
  container.id = id;

  container.innerHTML = `
    ${showStats ? `
      <div class="search-results-header">
        <div class="results-stats">
          <span class="results-count">
            Showing <strong id="results-count-num">0</strong> results
          </span>
          <span class="results-query" id="results-query-text"></span>
        </div>
        <div class="results-view-toggle">
          <button type="button" class="view-toggle-btn active" data-view="grid" aria-label="Grid view">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="7" height="7" x="3" y="3" rx="1"></rect>
              <rect width="7" height="7" x="14" y="3" rx="1"></rect>
              <rect width="7" height="7" x="14" y="14" rx="1"></rect>
              <rect width="7" height="7" x="3" y="14" rx="1"></rect>
            </svg>
          </button>
          <button type="button" class="view-toggle-btn" data-view="list" aria-label="List view">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" x2="21" y1="6" y2="6"></line>
              <line x1="3" x2="21" y1="12" y2="12"></line>
              <line x1="3" x2="21" y1="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    ` : ''}

    <div class="search-results-loading" id="results-loading" style="display: none;">
      <div class="loading-spinner"></div>
      <p class="loading-text">Searching for books...</p>
    </div>

    <div class="search-results-empty" id="results-empty" style="display: none;">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
          <path d="M8 8l6 6"></path>
          <path d="M14 8l-6 6"></path>
        </svg>
      </div>
      <h3 class="empty-title">No books found</h3>
      <p class="empty-text">Try adjusting your search or filters to find what you're looking for.</p>
    </div>

    <div class="search-results-error" id="results-error" style="display: none;">
      <div class="error-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" x2="12" y1="8" y2="12"></line>
          <line x1="12" x2="12.01" y1="16" y2="16"></line>
        </svg>
      </div>
      <h3 class="error-title">Something went wrong</h3>
      <p class="error-text" id="error-message">Unable to load search results. Please try again.</p>
      <button type="button" class="btn btn-primary" id="retry-search">Try Again</button>
    </div>

    <div class="search-results-grid" id="results-grid"></div>

    <div class="search-results-pagination" id="results-pagination"></div>
  `;

  // View toggle functionality
  const viewBtns = container.querySelectorAll('.view-toggle-btn');
  const resultsGrid = container.querySelector('#results-grid');

  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const view = btn.dataset.view;
      resultsGrid.classList.remove('grid-view', 'list-view');
      resultsGrid.classList.add(`${view}-view`);
    });
  });

  return container;
}

/**
 * Update results container state
 * @param {HTMLElement} container - Results container element
 * @param {Object} state - State to set
 */
export function updateResultsState(container, state) {
  const loading = container.querySelector('#results-loading');
  const empty = container.querySelector('#results-empty');
  const error = container.querySelector('#results-error');
  const grid = container.querySelector('#results-grid');
  const pagination = container.querySelector('#results-pagination');
  const countEl = container.querySelector('#results-count-num');
  const queryEl = container.querySelector('#results-query-text');

  // Hide all states first
  loading.style.display = 'none';
  empty.style.display = 'none';
  error.style.display = 'none';
  grid.style.display = 'none';
  if (pagination) pagination.style.display = 'none';

  if (state.loading) {
    loading.style.display = 'flex';
  } else if (state.error) {
    error.style.display = 'flex';
    const errorMsg = container.querySelector('#error-message');
    if (errorMsg && state.errorMessage) {
      errorMsg.textContent = state.errorMessage;
    }
  } else if (state.empty) {
    empty.style.display = 'flex';
  } else {
    grid.style.display = 'grid';
    if (pagination && state.showPagination) {
      pagination.style.display = 'flex';
    }
  }

  // Update count and query text
  if (countEl && state.count !== undefined) {
    countEl.textContent = state.count.toLocaleString();
  }
  if (queryEl && state.query) {
    queryEl.textContent = `for "${state.query}"`;
  } else if (queryEl) {
    queryEl.textContent = '';
  }
}
