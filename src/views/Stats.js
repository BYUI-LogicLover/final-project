import { userStats } from '../data/books.js';

export function renderStats(container) {
  container.innerHTML = `
    <div class="stats-page">
      <h1>Reading Statistics</h1>

      <div class="stats-cards">
        <div class="stats-card">
          <div class="stats-card-icon books">📚</div>
          <div class="stats-card-value">${userStats.booksRead}</div>
          <div class="stats-card-label">Books Read</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-icon pages">📄</div>
          <div class="stats-card-value">${userStats.pagesRead.toLocaleString()}</div>
          <div class="stats-card-label">Pages Read</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-icon rating">⭐</div>
          <div class="stats-card-value">${userStats.avgRating}</div>
          <div class="stats-card-label">Average Rating</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-icon time">🔥</div>
          <div class="stats-card-value">${userStats.readingStreak}</div>
          <div class="stats-card-label">Day Streak</div>
        </div>
      </div>

      <div class="charts-row">
        <div class="chart-container">
          <h3>Books Read Per Month</h3>
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

        <div class="chart-container">
          <h3>Genre Distribution</h3>
          <div class="pie-chart"></div>
          <div class="pie-legend">
            <div class="legend-item">
              <div class="legend-color" style="background: #6366f1;"></div>
              <span>Fiction (35%)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #0ea5e9;"></div>
              <span>Fantasy (25%)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #f59e0b;"></div>
              <span>Sci-Fi (20%)</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #10b981;"></div>
              <span>Non-Fiction (20%)</span>
            </div>
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
    </div>
  `;

  // Populate bar chart
  const lineChart = document.getElementById('line-chart');
  const maxBooks = Math.max(...userStats.monthlyData);

  userStats.monthlyData.forEach((books, index) => {
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${(books / maxBooks) * 100}%`;
    bar.title = `${books} books`;
    lineChart.appendChild(bar);
  });

  // Populate authors table
  const authorsTbody = document.getElementById('authors-tbody');
  userStats.favoriteAuthors.forEach(author => {
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
