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
function getPlaceholderCover(title) {
  const initials = title
    .split(' ')
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');

  // Generate a consistent color based on title
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];
  const colorIndex = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const bgColor = colors[colorIndex];

  return `
    <svg viewBox="0 0 120 180" class="placeholder-cover">
      <rect width="120" height="180" fill="${bgColor}"/>
      <text x="60" y="95" text-anchor="middle" fill="white" font-size="32" font-weight="600" font-family="system-ui, sans-serif">${initials}</text>
      <rect x="15" y="140" width="90" height="4" rx="2" fill="rgba(255,255,255,0.3)"/>
      <rect x="25" y="150" width="70" height="4" rx="2" fill="rgba(255,255,255,0.2)"/>
      <rect x="35" y="160" width="50" height="4" rx="2" fill="rgba(255,255,255,0.15)"/>
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
  const { inList, listType } = getBookListStatus(book.id);
  const buttonText = inList ? '✓ In List' : '+ Add to List';
  const buttonClass = inList ? 'add-to-list-btn in-list' : 'add-to-list-btn';

  // Get cover URL (from API, ISBN, or placeholder)
  const coverUrl = getBookCoverUrl(book);
  const placeholderSvg = getPlaceholderCover(book.title || 'Book').replace(/'/g, "\\'").replace(/\n/g, '');

  card.innerHTML = `
    <div class="book-card-cover">
      ${coverUrl
        ? `<img src="${coverUrl}" alt="${safeTitle}" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='${placeholderSvg}'">`
        : getPlaceholderCover(book.title || 'Book')
      }
    </div>
    <div class="book-card-info">
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
    </div>
  `;

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
