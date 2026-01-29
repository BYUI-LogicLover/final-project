import { addToList, getBookListStatus, LIST_TYPES } from '../services/readingListService.js';

// Open Library covers API
const COVERS_API = 'https://covers.openlibrary.org/b';

/**
 * Get cover URL for a book
 */
function getBookCoverUrl(book) {
  if (book.cover || book.coverUrl) {
    return book.cover || book.coverUrl;
  }
  if (book.isbn) {
    const cleanIsbn = book.isbn.replace(/[-\s]/g, '');
    return `${COVERS_API}/isbn/${cleanIsbn}-L.jpg`;
  }
  return null;
}

export function openBookModal(book) {
  const container = document.getElementById('modal-container');

  // Get cover URL
  const coverUrl = getBookCoverUrl(book);

  // Check list status
  const { inList, listType } = getBookListStatus(book.id);
  const rating = typeof book.rating === 'number' ? book.rating : 0;

  // Determine button states based on current list
  const readingBtnClass = listType === LIST_TYPES.READING ? 'btn-success' : 'btn-primary';
  const readingBtnText = listType === LIST_TYPES.READING ? '✓ Currently Reading' : 'Start Reading';
  const completedBtnClass = listType === LIST_TYPES.COMPLETED ? 'btn-success' : 'btn-secondary';
  const completedBtnText = listType === LIST_TYPES.COMPLETED ? '✓ Completed' : 'Mark as Read';
  const wantBtnClass = listType === LIST_TYPES.TO_READ ? 'btn-success' : 'btn-ghost';
  const wantBtnText = listType === LIST_TYPES.TO_READ ? '✓ Want to Read' : 'Want to Read';

  container.innerHTML = `
    <div class="modal-overlay" id="book-modal">
      <div class="modal">
        <button class="modal-close">&times;</button>
        <div class="modal-content">
          <div class="modal-cover">
            ${coverUrl
              ? `<img src="${coverUrl}" alt="${book.title}" onerror="this.onerror=null; this.parentElement.innerHTML='📚'">`
              : '📚'
            }
          </div>
          <div class="modal-details">
            <h2>${book.title}</h2>
            <p class="author">by ${book.author}</p>
            <div class="modal-rating">
              <span class="stars">${getStars(rating)}</span>
              <span class="rating-value">${rating.toFixed(1)} / 5.0</span>
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
              <button class="${readingBtnClass}" id="btn-reading">${readingBtnText}</button>
              <button class="${completedBtnClass}" id="btn-completed">${completedBtnText}</button>
              <button class="${wantBtnClass}" id="btn-want">${wantBtnText}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const overlay = document.getElementById('book-modal');
  requestAnimationFrame(() => overlay.classList.add('active'));

  // Close handlers
  overlay.querySelector('.modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', handleEscape);

  // Action button handlers
  overlay.querySelector('#btn-reading').addEventListener('click', () => {
    const result = addToList(book, LIST_TYPES.READING);
    if (result.success) {
      showToast('Added to Currently Reading');
      closeModal();
    }
  });

  overlay.querySelector('#btn-completed').addEventListener('click', () => {
    const result = addToList(book, LIST_TYPES.COMPLETED);
    if (result.success) {
      showToast('Marked as Completed');
      closeModal();
    }
  });

  overlay.querySelector('#btn-want').addEventListener('click', () => {
    const result = addToList(book, LIST_TYPES.TO_READ);
    if (result.success) {
      showToast('Added to Want to Read');
      closeModal();
    }
  });
}

/**
 * Show toast notification
 */
function showToast(message) {
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 12px 24px;
    background: #10b981;
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-size: 0.875rem;
    font-weight: 500;
    z-index: 1001;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
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
