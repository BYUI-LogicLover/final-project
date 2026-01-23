import { sampleBooks } from '../data/books.js';
import { createBookCard } from '../components/BookCard.js';

export function renderSearch(container) {
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const query = urlParams.get('q') || '';

  container.innerHTML = `
    <div class="search-page">
      <aside class="filters-sidebar">
        <h3>Filters</h3>

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
            <option value="200">Under 200 pages</option>
            <option value="400">200-400 pages</option>
            <option value="600">400-600 pages</option>
            <option value="1000">600+ pages</option>
          </select>
        </div>

        <button class="btn-primary" style="width: 100%; margin-top: 16px;" id="apply-filters">
          Apply Filters
        </button>
      </aside>

      <div class="search-results">
        <div class="search-header">
          <div class="search-header-bar">
            <input type="text" placeholder="Search books..." id="search-input" value="${query}">
            <button id="search-btn">Search</button>
          </div>
          <p class="results-info">Showing <strong id="results-count">0</strong> results${query ? ` for "${query}"` : ''}</p>
        </div>

        <div class="book-grid" id="book-grid"></div>

        <div class="pagination" id="pagination"></div>
      </div>
    </div>
  `;

  const bookGrid = document.getElementById('book-grid');
  const resultsCount = document.getElementById('results-count');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const pagination = document.getElementById('pagination');

  let currentPage = 1;
  const booksPerPage = 8;

  function filterBooks() {
    const searchQuery = searchInput.value.toLowerCase();
    return sampleBooks.filter(book =>
      book.title.toLowerCase().includes(searchQuery) ||
      book.author.toLowerCase().includes(searchQuery) ||
      book.genre.toLowerCase().includes(searchQuery)
    );
  }

  function displayBooks(books, page = 1) {
    bookGrid.innerHTML = '';
    const start = (page - 1) * booksPerPage;
    const end = start + booksPerPage;
    const pageBooks = books.slice(start, end);

    pageBooks.forEach(book => {
      bookGrid.appendChild(createBookCard(book));
    });

    resultsCount.textContent = books.length;
    renderPagination(books.length, page);
  }

  function renderPagination(totalBooks, currentPage) {
    const totalPages = Math.ceil(totalBooks / booksPerPage);
    pagination.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Prev';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => displayBooks(filterBooks(), currentPage - 1));
    pagination.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.textContent = i;
      pageBtn.classList.toggle('active', i === currentPage);
      pageBtn.addEventListener('click', () => displayBooks(filterBooks(), i));
      pagination.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => displayBooks(filterBooks(), currentPage + 1));
    pagination.appendChild(nextBtn);
  }

  const doSearch = () => {
    displayBooks(filterBooks(), 1);
  };

  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  document.getElementById('apply-filters').addEventListener('click', doSearch);

  // Initial display
  displayBooks(filterBooks(), 1);
}
