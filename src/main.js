import './styles/main.css';
import { router } from './router.js';
import { renderHeader } from './components/Header.js';
import { renderFooter } from './components/Footer.js';

function init() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div id="header-container"></div>
    <main id="main-content"></main>
    <div id="footer-container"></div>
    <div id="modal-container"></div>
  `;

  renderHeader();
  renderFooter();
  router.init();
}

document.addEventListener('DOMContentLoaded', init);
