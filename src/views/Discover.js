import { createBookCard } from '../components/BookCard.js';
import { getBestsellerList } from '../services/apiService.js';

/**
 * Render a loading skeleton for a book grid
 * @param {number} count - Number of skeleton cards to show
 * @returns {string} HTML string
 */
function renderLoadingSkeleton(count = 4) {
  return Array(count)
    .fill('')
    .map(() => `
      <div class="book-card skeleton">
        <div class="skeleton-cover"></div>
        <div class="skeleton-title"></div>
        <div class="skeleton-author"></div>
      </div>
    `)
    .join('');
}

/**
 * Render an error message for a section
 * @param {string} message - Error message
 * @returns {string} HTML string
 */
function renderError(message) {
  return `
    <div class="discover-error">
      <p>${message}</p>
      <button class="btn btn-secondary retry-btn">Retry</button>
    </div>
  `;
}

/**
 * Fetch and render a bestseller list section
 * @param {string} listName - NYT list name slug
 * @param {string} gridId - DOM element ID for the grid
 */
async function loadBestsellerSection(listName, gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  // Show loading state
  grid.innerHTML = renderLoadingSkeleton(4);

  try {
    const list = await getBestsellerList(listName);
    grid.innerHTML = '';

    if (list.books && list.books.length > 0) {
      list.books.slice(0, 4).forEach(book => {
        // Map NYT book format to BookCard format
        const bookData = {
          id: book.isbn13 || book.isbn || book.id,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          rating: null, // NYT doesn't provide ratings
          description: book.description,
          publisher: book.publisher,
          rank: book.rank,
          weeksOnList: book.weeksOnList,
          source: 'nytimes',
        };
        grid.appendChild(createBookCard(bookData));
      });
    } else {
      grid.innerHTML = '<p class="no-results">No books found</p>';
    }
  } catch (error) {
    console.error(`Error loading ${listName}:`, error);
    grid.innerHTML = renderError('Failed to load bestsellers');

    // Add retry functionality
    const retryBtn = grid.querySelector('.retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => loadBestsellerSection(listName, gridId));
    }
  }
}

export function renderDiscover(container) {
  container.innerHTML = `
    <div class="discover-page">
      <h1>Discover Books</h1>
      <p class="discover-subtitle">New York Times Bestseller Lists</p>

      <section class="discover-section">
        <h2>
          Hardcover Fiction
          <span class="list-badge">NYT Bestsellers</span>
        </h2>
        <div class="book-grid" id="fiction-grid"></div>
      </section>

      <section class="discover-section">
        <h2>
          Hardcover Nonfiction
          <span class="list-badge">NYT Bestsellers</span>
        </h2>
        <div class="book-grid" id="nonfiction-grid"></div>
      </section>

      <section class="discover-section">
        <h2>
          Young Adult Hardcover
          <span class="list-badge">NYT Bestsellers</span>
        </h2>
        <div class="book-grid" id="ya-grid"></div>
      </section>
    </div>
  `;

  // Load all bestseller sections in parallel
  loadBestsellerSection('hardcover-fiction', 'fiction-grid');
  loadBestsellerSection('hardcover-nonfiction', 'nonfiction-grid');
  loadBestsellerSection('young-adult-hardcover', 'ya-grid');
}
