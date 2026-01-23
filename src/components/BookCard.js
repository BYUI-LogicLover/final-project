import { openBookModal } from './BookModal.js';

export function createBookCard(book) {
  const card = document.createElement('div');
  card.className = 'book-card';
  card.innerHTML = `
    <div class="book-card-cover">
      ${book.cover ? `<img src="${book.cover}" alt="${book.title}">` : '📚'}
    </div>
    <div class="book-card-info">
      <h4>${book.title}</h4>
      <p class="author">${book.author}</p>
      <div class="book-card-rating">
        <span class="stars">${getStars(book.rating)}</span>
        <span class="rating-value">${book.rating.toFixed(1)}</span>
      </div>
      <button class="add-to-list-btn" data-book-id="${book.id}">+ Add to List</button>
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

  const menu = document.createElement('div');
  menu.className = 'add-menu';
  menu.style.cssText = `
    position: absolute;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 8px 0;
    min-width: 150px;
    z-index: 100;
  `;
  menu.innerHTML = `
    <div style="padding: 8px 16px; cursor: pointer; font-size: 0.875rem;" class="menu-item" data-list="reading">📖 Currently Reading</div>
    <div style="padding: 8px 16px; cursor: pointer; font-size: 0.875rem;" class="menu-item" data-list="toread">📚 Want to Read</div>
    <div style="padding: 8px 16px; cursor: pointer; font-size: 0.875rem;" class="menu-item" data-list="completed">✅ Completed</div>
  `;

  button.style.position = 'relative';
  button.parentElement.style.position = 'relative';
  button.parentElement.appendChild(menu);

  menu.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('mouseenter', () => item.style.background = '#f3f4f6');
    item.addEventListener('mouseleave', () => item.style.background = 'white');
    item.addEventListener('click', () => {
      button.textContent = '✓ Added';
      button.style.background = '#10b981';
      button.style.color = 'white';
      button.style.borderColor = '#10b981';
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
