import { readingLists, userStats } from '../data/books.js';
import { openBookModal } from '../components/BookModal.js';

export function renderHome(container) {
  container.innerHTML = `
    <section class="hero">
      <h1>Track Your Reading Journey</h1>
      <p>Discover new books, organize your reading lists, and track your progress</p>
      <div class="search-container">
        <input type="text" class="search-input" placeholder="Search for books, authors, or genres..." id="hero-search">
        <button class="search-btn" id="hero-search-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </button>
      </div>
    </section>

    <div class="dashboard">
      <div class="reading-lists">
        <div class="list-column">
          <div class="list-header">
            <span>📖 Currently Reading</span>
            <span class="list-count">${readingLists.reading.length}</span>
          </div>
          <div class="list-items" id="reading-list"></div>
        </div>

        <div class="list-column">
          <div class="list-header">
            <span>📚 Want to Read</span>
            <span class="list-count">${readingLists.toRead.length}</span>
          </div>
          <div class="list-items" id="toread-list"></div>
        </div>

        <div class="list-column">
          <div class="list-header">
            <span>✅ Completed</span>
            <span class="list-count">${readingLists.completed.length}</span>
          </div>
          <div class="list-items" id="completed-list"></div>
        </div>
      </div>

      <aside class="sidebar">
        <div class="stats-widget">
          <h3>Quick Stats</h3>
          <div class="stat-items">
            <div class="stat-item">
              <div class="stat-icon books">📚</div>
              <div>
                <div class="stat-value">${userStats.booksRead}</div>
                <div class="stat-label">Books Read</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon pages">📄</div>
              <div>
                <div class="stat-value">${userStats.pagesRead.toLocaleString()}</div>
                <div class="stat-label">Pages Read</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon rating">⭐</div>
              <div>
                <div class="stat-value">${userStats.avgRating}</div>
                <div class="stat-label">Avg Rating</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon streak">🔥</div>
              <div>
                <div class="stat-value">${userStats.readingStreak}</div>
                <div class="stat-label">Day Streak</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  `;

  // Populate reading lists
  populateList('reading-list', readingLists.reading, true);
  populateList('toread-list', readingLists.toRead);
  populateList('completed-list', readingLists.completed);

  // Setup search
  const searchInput = document.getElementById('hero-search');
  const searchBtn = document.getElementById('hero-search-btn');

  const doSearch = () => {
    const query = searchInput.value.trim();
    if (query) {
      window.location.hash = `/search?q=${encodeURIComponent(query)}`;
    }
  };

  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doSearch();
  });
}

function populateList(containerId, books, showProgress = false) {
  const container = document.getElementById(containerId);

  books.forEach(book => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div class="list-item-cover">📚</div>
      <div class="list-item-info">
        <h4>${book.title}</h4>
        <p>${book.author}</p>
        ${showProgress && book.progress ? `<p style="color: #6366f1; font-weight: 500;">${book.progress}% complete</p>` : ''}
      </div>
    `;
    item.addEventListener('click', () => openBookModal(book));
    container.appendChild(item);
  });
}
