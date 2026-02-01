export function renderFooter() {
  const container = document.getElementById('footer-container');

  container.innerHTML = `
    <footer class="footer">
      <div class="footer-content">
      <div class="footer-bottom">
        <p>&copy; 2026 BookTracker. All rights reserved.</p>
      </div>
    </footer>
  `;
}
