import { openBookModal } from './BookModal.js';
import { addToList, getBookListStatus, LIST_TYPES } from '../services/readingListService.js';

// Open Library covers API
const COVERS_API = 'https://covers.openlibrary.org/b';

/**
 * Get cover URL for a book
 * Priority: existing cover URL > ISBN lookup > placeholder
 */
function getBookCoverUrl(book) {
  // Use existing cover URL if available
  if (book.cover) {
    return book.cover;
  }
  if (book.coverUrl) {
    return book.coverUrl;
  }

  // Try ISBN lookup via Open Library
  if (book.isbn) {
    // Clean ISBN (remove dashes and spaces)
    const cleanIsbn = book.isbn.replace(/[-\s]/g, '');
    return `${COVERS_API}/isbn/${cleanIsbn}-M.jpg`;
  }

  // Try Open Library ID
  if (book.olid) {
    return `${COVERS_API}/olid/${book.olid}-M.jpg`;
  }

  // Return null to trigger placeholder
  return null;
}

/**
 * Generate SVG placeholder for missing book covers
 */
function getPlaceholderCover() {
  return `
    <svg viewBox="0 0 120 180" class="placeholder-cover">
      <rect width="120" height="180" fill="#e5e7eb"/>
      <!-- Book body -->
      <rect x="30" y="40" width="60" height="80" rx="3" fill="#9ca3af"/>
      <!-- Spine -->
      <rect x="30" y="40" width="8" height="80" rx="2" fill="#6b7280"/>
      <!-- Page edges -->
      <rect x="38" y="44" width="48" height="72" rx="1" fill="#f3f4f6"/>
      <!-- Cover front -->
      <rect x="40" y="44" width="46" height="72" rx="1" fill="#9ca3af"/>
      <!-- Title lines on cover -->
      <rect x="48" y="58" width="30" height="3" rx="1.5" fill="rgba(255,255,255,0.5)"/>
      <rect x="48" y="65" width="22" height="3" rx="1.5" fill="rgba(255,255,255,0.35)"/>
      <!-- Author line -->
      <rect x="48" y="96" width="18" height="2" rx="1" fill="rgba(255,255,255,0.3)"/>
      <!-- Label -->
      <text x="60" y="148" text-anchor="middle" fill="#9ca3af" font-size="10" font-family="system-ui, sans-serif">No Cover</text>
    </svg>
  `;
}

/**
 * Truncate description text
 */
function truncateDescription(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function createBookCard(book) {
  const card = document.createElement('div');
  card.className = 'book-card';

  const safeTitle = escapeHtml(book.title || 'Untitled');
  const safeAuthor = escapeHtml(book.author || 'Unknown Author');
  const safeDescription = escapeHtml(book.description || '');
  const truncatedDesc = truncateDescription(safeDescription, 100);
  const hasFullDescription = safeDescription.length > 100;
  const rating = typeof book.rating === 'number' ? book.rating : 0;

  // Check if book is already in a list
  const { inList } = getBookListStatus(book.id);
  const buttonText = inList ? '✓ In List' : '+ Add to List';
  const buttonClass = inList ? 'add-to-list-btn in-list' : 'add-to-list-btn';

  // Get cover URL (from API, ISBN, or placeholder)
  const coverUrl = getBookCoverUrl(book);

  const coverContainer = document.createElement('div');
  coverContainer.className = 'book-card-cover';

  if (coverUrl) {
    const img = document.createElement('img');
    img.src = coverUrl;
    img.alt = `Cover for ${safeTitle}`;
    img.loading = 'lazy';
    img.className = 'book-card-image';
    // Fallback to placeholder if image fails to load
    img.onerror = () => {
      img.remove();
      coverContainer.innerHTML = getPlaceholderCover();
    };
    coverContainer.appendChild(img);
  } else {
    coverContainer.innerHTML = getPlaceholderCover();
  }

  const infoContainer = document.createElement('div');
  infoContainer.className = 'book-card-info';
  infoContainer.innerHTML = `
      <h4 class="book-card-title">${safeTitle}</h4>
      <p class="book-card-author">${safeAuthor}</p>
      ${truncatedDesc ? `
        <p class="book-card-description">
          ${truncatedDesc}
          ${hasFullDescription ? '<span class="read-more">Read more</span>' : ''}
        </p>
      ` : ''}
      <div class="book-card-rating">
        <span class="stars">${getStars(rating)}</span>
        <span class="rating-value">${rating.toFixed(1)}</span>
      </div>
      <button class="${buttonClass}" data-book-id="${book.id}">${buttonText}</button>
  `;

  card.appendChild(coverContainer);
  card.appendChild(infoContainer);

  card.addEventListener('click', (e) => {
    if (!e.target.classList.contains('add-to-list-btn')) {
      openBookModal(book);
    }
  });

  card.querySelector('.add-to-list-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    showAddToListMenu(e.target, book);
  });

  return card;
}

function getStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  let stars = '★'.repeat(fullStars);
  if (hasHalf) stars += '½';
  stars += '☆'.repeat(5 - fullStars - (hasHalf ? 1 : 0));
  return stars;
}

function showAddToListMenu(button, book) {
  const existingMenu = document.querySelector('.add-menu');
  if (existingMenu) existingMenu.remove();

  // Check current list status
  const { inList, listType: currentList } = getBookListStatus(book.id);

  const menu = document.createElement('div');
  menu.className = 'add-menu';
  menu.style.cssText = `
    position: absolute;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 8px 0;
    min-width: 170px;
    z-index: 100;
  `;

  const menuItems = [
    { list: LIST_TYPES.READING, icon: '📖', label: 'Currently Reading' },
    { list: LIST_TYPES.TO_READ, icon: '📚', label: 'Want to Read' },
    { list: LIST_TYPES.COMPLETED, icon: '✅', label: 'Completed' },
  ];

  menu.innerHTML = menuItems.map(item => {
    const isCurrentList = currentList === item.list;
    const checkmark = isCurrentList ? ' ✓' : '';
    const style = isCurrentList
      ? 'padding: 8px 16px; cursor: pointer; font-size: 0.875rem; background: #f0fdf4; color: #16a34a; font-weight: 500;'
      : 'padding: 8px 16px; cursor: pointer; font-size: 0.875rem;';
    return `<div style="${style}" class="menu-item" data-list="${item.list}">${item.icon} ${item.label}${checkmark}</div>`;
  }).join('');

  button.style.position = 'relative';
  button.parentElement.style.position = 'relative';
  button.parentElement.appendChild(menu);

  menu.querySelectorAll('.menu-item').forEach(item => {
    const listType = item.dataset.list;
    const isCurrentList = currentList === listType;

    item.addEventListener('mouseenter', () => {
      if (!isCurrentList) {
        item.style.background = '#f3f4f6';
      }
    });
    item.addEventListener('mouseleave', () => {
      if (!isCurrentList) {
        item.style.background = 'white';
      } else {
        item.style.background = '#f0fdf4';
      }
    });
    item.addEventListener('click', () => {
      // Add to list using service
      const result = addToList(book, listType);

      if (result.success) {
        // Update button appearance
        button.textContent = '✓ Added';
        button.style.background = '#10b981';
        button.style.color = 'white';
        button.style.borderColor = '#10b981';

        // Show toast notification
        showToast(`Added to ${item.textContent.replace(' ✓', '')}`);
      } else {
        showToast(result.error || 'Failed to add book', 'error');
      }

      menu.remove();
    });
  });

  document.addEventListener('click', function closeMenu(e) {
    if (!menu.contains(e.target) && e.target !== button) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  });
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'success') {
  // Remove existing toast
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 12px 24px;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-size: 0.875rem;
    font-weight: 500;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;

  // Add animation styles if not present
  if (!document.querySelector('#toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
