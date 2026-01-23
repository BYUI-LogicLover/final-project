export function openBookModal(book) {
  const container = document.getElementById('modal-container');

  container.innerHTML = `
    <div class="modal-overlay" id="book-modal">
      <div class="modal">
        <button class="modal-close">&times;</button>
        <div class="modal-content">
          <div class="modal-cover">
            ${book.cover ? `<img src="${book.cover}" alt="${book.title}">` : '📚'}
          </div>
          <div class="modal-details">
            <h2>${book.title}</h2>
            <p class="author">by ${book.author}</p>
            <div class="modal-rating">
              <span class="stars">${getStars(book.rating)}</span>
              <span class="rating-value">${book.rating.toFixed(1)} / 5.0</span>
            </div>
            <p class="modal-description">${book.description || 'No description available.'}</p>
            <div class="modal-meta">
              <div class="meta-item">
                <strong>Pages:</strong> <span>${book.pages || 'N/A'}</span>
              </div>
              <div class="meta-item">
                <strong>Published:</strong> <span>${book.published || 'N/A'}</span>
              </div>
              <div class="meta-item">
                <strong>Genre:</strong> <span>${book.genre || 'N/A'}</span>
              </div>
              <div class="meta-item">
                <strong>ISBN:</strong> <span>${book.isbn || 'N/A'}</span>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn-primary">Add to Reading List</button>
              <button class="btn-secondary">Mark as Read</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const overlay = document.getElementById('book-modal');
  requestAnimationFrame(() => overlay.classList.add('active'));

  overlay.querySelector('.modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', handleEscape);
}

function closeModal() {
  const overlay = document.getElementById('book-modal');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);
  }
  document.removeEventListener('keydown', handleEscape);
}

function handleEscape(e) {
  if (e.key === 'Escape') closeModal();
}

function getStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  let stars = '★'.repeat(fullStars);
  if (hasHalf) stars += '½';
  stars += '☆'.repeat(5 - fullStars - (hasHalf ? 1 : 0));
  return stars;
}
