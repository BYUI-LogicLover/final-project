import { createBookCard } from '../components/BookCard.js';
import { getBestsellerList } from '../services/apiService.js';

/**
 * Render a loading skeleton for a book carousel
 * @param {number} count - Number of skeleton cards to show
 * @returns {string} HTML string
 */
function renderLoadingSkeleton(count = 5) {
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
 * Set up carousel navigation
 * @param {HTMLElement} carousel - The carousel container element
 */
function setupCarouselNavigation(carousel) {
  const track = carousel.querySelector('.carousel-track');
  const prevBtn = carousel.querySelector('.carousel-btn-prev');
  const nextBtn = carousel.querySelector('.carousel-btn-next');

  if (!track || !prevBtn || !nextBtn) return;

  const updateButtonStates = () => {
    const scrollLeft = track.scrollLeft;
    const maxScroll = track.scrollWidth - track.clientWidth;

    prevBtn.disabled = scrollLeft <= 0;
    nextBtn.disabled = scrollLeft >= maxScroll - 1;
  };

  const scrollAmount = () => {
    // Scroll by approximately 3 book cards
    const cardWidth = track.querySelector('.book-card')?.offsetWidth || 200;
    return (cardWidth + 24) * 3; // card width + gap
  };

  prevBtn.addEventListener('click', () => {
    track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
  });

  nextBtn.addEventListener('click', () => {
    track.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
  });

  track.addEventListener('scroll', updateButtonStates);
  updateButtonStates();

  // Update on resize
  window.addEventListener('resize', updateButtonStates);
}

/**
 * Fetch and render a bestseller list section
 * @param {string} listName - NYT list name slug
 * @param {string} carouselId - DOM element ID for the carousel
 */
async function loadBestsellerSection(listName, carouselId) {
  const carousel = document.getElementById(carouselId);
  if (!carousel) return;

  const track = carousel.querySelector('.carousel-track');
  if (!track) return;

  // Show loading state
  track.innerHTML = renderLoadingSkeleton(5);

  try {
    const list = await getBestsellerList(listName);
    track.innerHTML = '';

    if (list.books && list.books.length > 0) {
      list.books.slice(0, 10).forEach(book => {
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
        track.appendChild(createBookCard(bookData));
      });

      // Set up carousel navigation after content loads
      setupCarouselNavigation(carousel);
    } else {
      track.innerHTML = '<p class="no-results">No books found</p>';
    }
  } catch (error) {
    console.error(`Error loading ${listName}:`, error);
    track.innerHTML = renderError('Failed to load bestsellers');

    // Add retry functionality
    const retryBtn = track.querySelector('.retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => loadBestsellerSection(listName, carouselId));
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
        <div class="book-carousel" id="fiction-carousel">
          <button class="carousel-btn carousel-btn-prev" aria-label="Previous books">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div class="carousel-track"></div>
          <button class="carousel-btn carousel-btn-next" aria-label="Next books">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
      </section>

      <section class="discover-section">
        <h2>
          Hardcover Nonfiction
          <span class="list-badge">NYT Bestsellers</span>
        </h2>
        <div class="book-carousel" id="nonfiction-carousel">
          <button class="carousel-btn carousel-btn-prev" aria-label="Previous books">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div class="carousel-track"></div>
          <button class="carousel-btn carousel-btn-next" aria-label="Next books">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
      </section>

      <section class="discover-section">
        <h2>
          Young Adult Hardcover
          <span class="list-badge">NYT Bestsellers</span>
        </h2>
        <div class="book-carousel" id="ya-carousel">
          <button class="carousel-btn carousel-btn-prev" aria-label="Previous books">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div class="carousel-track"></div>
          <button class="carousel-btn carousel-btn-next" aria-label="Next books">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
      </section>
    </div>
  `;

  // Load all bestseller sections in parallel
  loadBestsellerSection('hardcover-fiction', 'fiction-carousel');
  loadBestsellerSection('hardcover-nonfiction', 'nonfiction-carousel');
  loadBestsellerSection('young-adult-hardcover', 'ya-carousel');
}
