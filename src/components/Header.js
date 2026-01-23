export function renderHeader() {
  const container = document.getElementById('header-container');
  const currentHash = window.location.hash.slice(1) || '/';

  container.innerHTML = `
    <header class="header">
      <div class="header-content">
        <a href="#/" class="logo">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          BookTracker
        </a>
        <nav class="nav">
          <a href="#/" class="nav-link ${currentHash === '/' ? 'active' : ''}">Home</a>
          <a href="#/lists" class="nav-link ${currentHash === '/lists' ? 'active' : ''}">My Lists</a>
          <a href="#/discover" class="nav-link ${currentHash === '/discover' ? 'active' : ''}">Discover</a>
          <a href="#/stats" class="nav-link ${currentHash === '/stats' ? 'active' : ''}">Stats</a>
        </nav>
      </div>
    </header>
  `;

  // Update active state on hash change
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1) || '/';
    container.querySelectorAll('.nav-link').forEach(link => {
      const linkHash = link.getAttribute('href').slice(1);
      link.classList.toggle('active', linkHash === hash);
    });
  });
}
