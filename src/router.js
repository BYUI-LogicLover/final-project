import { renderHome } from './views/Home.js';
import { renderSearch } from './views/Search.js';
import { renderStats } from './views/Stats.js';
import { renderDiscover } from './views/Discover.js';

const routes = {
  '/': renderHome,
  '/search': renderSearch,
  '/stats': renderStats,
  '/discover': renderDiscover,
  '/lists': renderHome,
};

export const router = {
  init() {
    window.addEventListener('hashchange', this.handleRoute.bind(this));
    this.handleRoute();
  },

  handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const route = routes[hash] || routes['/'];
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '';
    route(mainContent);
  },

  navigate(path) {
    window.location.hash = path;
  }
};
