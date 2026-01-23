import { sampleBooks } from '../data/books.js';
import { createBookCard } from '../components/BookCard.js';

export function renderDiscover(container) {
  container.innerHTML = `
    <div class="discover-page">
      <h1>Discover Books</h1>

      <section class="discover-section">
        <h2>
          Trending Now
          <a href="#/search">View All →</a>
        </h2>
        <div class="book-grid" id="trending-grid"></div>
      </section>

      <section class="discover-section">
        <h2>
          Top Rated
          <a href="#/search">View All →</a>
        </h2>
        <div class="book-grid" id="top-rated-grid"></div>
      </section>

      <section class="discover-section">
        <h2>
          New Releases
          <a href="#/search">View All →</a>
        </h2>
        <div class="book-grid" id="new-releases-grid"></div>
      </section>
    </div>
  `;

  // Populate trending (random selection)
  const trendingGrid = document.getElementById('trending-grid');
  const shuffled = [...sampleBooks].sort(() => 0.5 - Math.random());
  shuffled.slice(0, 4).forEach(book => {
    trendingGrid.appendChild(createBookCard(book));
  });

  // Populate top rated (sorted by rating)
  const topRatedGrid = document.getElementById('top-rated-grid');
  const topRated = [...sampleBooks].sort((a, b) => b.rating - a.rating);
  topRated.slice(0, 4).forEach(book => {
    topRatedGrid.appendChild(createBookCard(book));
  });

  // Populate new releases (using a different sort for variety)
  const newReleasesGrid = document.getElementById('new-releases-grid');
  const newReleases = [...sampleBooks].sort((a, b) =>
    parseInt(b.published) - parseInt(a.published)
  );
  newReleases.slice(0, 4).forEach(book => {
    newReleasesGrid.appendChild(createBookCard(book));
  });
}
