import { clearAllLists, getReadingLists, getListStats } from '../services/readingListService.js';

export function renderStats(container) {
  // Get actual data from reading lists
  const lists = getReadingLists();
  const stats = getListStats();

  // Compute statistics from actual data
  const booksRead = stats.completed;
  const currentlyReading = stats.reading;

  // Calculate pages read from completed books
  const completedPagesRead = stats.totalPagesRead;

  // Calculate pages read from currently reading books (based on progress)
  const currentlyReadingPagesRead = lists.reading.reduce((sum, book) => {
    const totalPages = book.pages || 0;
    const progress = book.progress || 0;
    const pagesRead = book.pagesRead || Math.round((progress / 100) * totalPages);
    return sum + pagesRead;
  }, 0);

  // Total pages read = completed + currently reading progress
  const pagesRead = completedPagesRead + currentlyReadingPagesRead;

  const avgRating = stats.averageRating || 0;

  // Compute genre distribution from completed books
  const genreCount = {};
  lists.completed.forEach(book => {
    const genre = book.genre || 'Unknown';
    genreCount[genre] = (genreCount[genre] || 0) + 1;
  });

  // Convert to percentages
  const totalGenreBooks = lists.completed.length || 1;
  const genreDistribution = Object.entries(genreCount)
    .map(([genre, count]) => ({
      genre,
      count,
      percentage: Math.round((count / totalGenreBooks) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // Compute favorite authors from completed books
  const authorStats = {};
  lists.completed.forEach(book => {
    const author = book.author || 'Unknown';
    if (!authorStats[author]) {
      authorStats[author] = { books: 0, totalRating: 0 };
    }
    authorStats[author].books++;
    authorStats[author].totalRating += (book.userRating || book.rating || 0);
  });

  const favoriteAuthors = Object.entries(authorStats)
    .map(([name, data]) => ({
      name,
      books: data.books,
      avgRating: data.books > 0 ? data.totalRating / data.books : 0
    }))
    .sort((a, b) => b.books - a.books || b.avgRating - a.avgRating)
    .slice(0, 5);

  // Compute monthly reading data from completed books (last 12 months)
  const monthlyData = new Array(12).fill(0);
  const now = new Date();
  lists.completed.forEach(book => {
    if (book.completedDate) {
      const completedDate = new Date(book.completedDate);
      const monthsAgo = (now.getFullYear() - completedDate.getFullYear()) * 12 +
                        (now.getMonth() - completedDate.getMonth());
      if (monthsAgo >= 0 && monthsAgo < 12) {
        monthlyData[11 - monthsAgo]++;
      }
    }
  });

  // Genre colors for pie chart
  const genreColors = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];

  container.innerHTML = `
    <div class="stats-page">
      <h1>Reading Statistics</h1>

      <div class="stats-cards">
        <div class="stats-card">
          <div class="stats-card-icon books">📚</div>
          <div class="stats-card-value">${booksRead}</div>
          <div class="stats-card-label">Books Completed</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-icon pages">📄</div>
          <div class="stats-card-value">${pagesRead.toLocaleString()}</div>
          <div class="stats-card-label">Pages Read</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-icon rating">⭐</div>
          <div class="stats-card-value">${avgRating.toFixed(1)}</div>
          <div class="stats-card-label">Average Rating</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-icon time">📖</div>
          <div class="stats-card-value">${currentlyReading}</div>
          <div class="stats-card-label">Currently Reading</div>
        </div>
      </div>

      <div class="charts-row">
        <div class="chart-container">
          <h3>Books Read Per Month</h3>
          <div style="display: flex; gap: 8px;">
            <div id="y-axis" style="display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; padding: 20px 0; font-size: 0.75rem; color: #6b7280; min-width: 24px;">
            </div>
            <div style="flex: 1;">
              <div class="line-chart" id="line-chart"></div>
              <div style="display: flex; justify-content: space-between; padding: 0 8px; margin-top: 8px;">
                <span style="font-size: 0.75rem; color: #6b7280;">Jan</span>
                <span style="font-size: 0.75rem; color: #6b7280;">Feb</span>
                <span style="font-size: 0.75rem; color: #6b7280;">Mar</span>
                <span style="font-size: 0.75rem; color: #6b7280;">Apr</span>
                <span style="font-size: 0.75rem; color: #6b7280;">May</span>
                <span style="font-size: 0.75rem; color: #6b7280;">Jun</span>
                <span style="font-size: 0.75rem; color: #6b7280;">Jul</span>
                <span style="font-size: 0.75rem; color: #6b7280;">Aug</span>
                <span style="font-size: 0.75rem; color: #6b7280;">Sep</span>
                <span style="font-size: 0.75rem; color: #6b7280;">Oct</span>
                <span style="font-size: 0.75rem; color: #6b7280;">Nov</span>
                <span style="font-size: 0.75rem; color: #6b7280;">Dec</span>
              </div>
            </div>
          </div>
        </div>

        <div class="chart-container">
          <h3>Genre Distribution</h3>
          <div class="pie-chart" id="pie-chart"></div>
          <div class="pie-legend" id="genre-legend">
          </div>
        </div>
      </div>

      <div class="authors-table">
        <h3>Favorite Authors</h3>
        <table>
          <thead>
            <tr>
              <th>Author</th>
              <th>Books Read</th>
              <th>Average Rating</th>
            </tr>
          </thead>
          <tbody id="authors-tbody">
          </tbody>
        </table>
      </div>

      <div class="data-management" style="margin-top: 48px; padding: 24px; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <h3 style="margin-bottom: 16px; color: #374151;">Data Management</h3>
        <p style="margin-bottom: 16px; color: #6b7280; font-size: 0.875rem;">
          Clear all your reading list data. This action cannot be undone.
        </p>
        <button id="btn-clear-data" style="background: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 1rem;">
          🗑️ Clear All Book Data
        </button>
      </div>
    </div>
  `;

  // Populate bar chart
  const lineChart = document.getElementById('line-chart');
  const yAxis = document.getElementById('y-axis');
  const maxBooks = Math.max(...monthlyData, 1);

  // Create Y-axis labels (show max, mid, and 0)
  const yAxisSteps = maxBooks <= 5 ? maxBooks : 5;
  for (let i = yAxisSteps; i >= 0; i--) {
    const value = Math.round((i / yAxisSteps) * maxBooks);
    const label = document.createElement('span');
    label.textContent = value;
    yAxis.appendChild(label);
  }

  monthlyData.forEach((books) => {
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${(books / maxBooks) * 100}%`;
    bar.title = `${books} books`;
    lineChart.appendChild(bar);
  });

  // Populate genre legend
  const genreLegend = document.getElementById('genre-legend');
  if (genreDistribution.length === 0) {
    genreLegend.innerHTML = '<span style="color: #6b7280; font-size: 0.875rem;">No completed books yet</span>';
  } else {
    genreDistribution.forEach((genre, index) => {
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      legendItem.innerHTML = `
        <div class="legend-color" style="background: ${genreColors[index % genreColors.length]};"></div>
        <span>${genre.genre} (${genre.percentage}%)</span>
      `;
      genreLegend.appendChild(legendItem);
    });
  }

  // Populate authors table
  const authorsTbody = document.getElementById('authors-tbody');
  if (favoriteAuthors.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="3" style="text-align: center; color: #6b7280;">No completed books yet</td>';
    authorsTbody.appendChild(row);
  } else {
    favoriteAuthors.forEach(author => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${author.name}</td>
        <td>${author.books}</td>
        <td>
          <span style="color: #f59e0b;">★</span> ${author.avgRating.toFixed(1)}
        </td>
      `;
      authorsTbody.appendChild(row);
    });
  }

  // Clear all data button handler
  const clearDataBtn = document.getElementById('btn-clear-data');
  clearDataBtn.addEventListener('click', () => {
    // Show confirmation dialog
    const confirmed = confirm(
      'Are you sure you want to clear all book data?\n\n' +
      'This will remove all books from:\n' +
      '• Currently Reading\n' +
      '• Want to Read\n' +
      '• Completed\n\n' +
      'This action cannot be undone.'
    );

    if (confirmed) {
      const result = clearAllLists();
      if (result.success) {
        showToast('All book data has been cleared');
        // Refresh the page to show updated stats
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        showToast('Failed to clear data: ' + (result.error || 'Unknown error'), 'error');
      }
    }
  });
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
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

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
