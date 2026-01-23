export function renderFooter() {
  const container = document.getElementById('footer-container');

  container.innerHTML = `
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-section">
          <h4>BookTracker</h4>
          <ul>
            <li><a href="#/">About Us</a></li>
            <li><a href="#/">Blog</a></li>
            <li><a href="#/">Careers</a></li>
            <li><a href="#/">Press</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h4>Features</h4>
          <ul>
            <li><a href="#/">Reading Lists</a></li>
            <li><a href="#/discover">Discover Books</a></li>
            <li><a href="#/stats">Statistics</a></li>
            <li><a href="#/">Reading Goals</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h4>Support</h4>
          <ul>
            <li><a href="#/">Help Center</a></li>
            <li><a href="#/">Contact Us</a></li>
            <li><a href="#/">FAQ</a></li>
            <li><a href="#/">Community</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h4>Legal</h4>
          <ul>
            <li><a href="#/">Privacy Policy</a></li>
            <li><a href="#/">Terms of Service</a></li>
            <li><a href="#/">Cookie Policy</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2024 BookTracker. All rights reserved.</p>
      </div>
    </footer>
  `;
}
