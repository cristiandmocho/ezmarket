// Renders the price history chart on the product detail page.
// Expects window.__priceHistory = [{ price, captured_at }]

const canvas = document.getElementById('priceChart');
if (!canvas || !window.__priceHistory?.length) return;

const history = window.__priceHistory;
const labels = history.map(p => new Date(p.captured_at).toLocaleDateString('pt-PT', { month: 'short', day: 'numeric' }));
const prices = history.map(p => p.price);

const style = getComputedStyle(document.documentElement);
const primary = style.getPropertyValue('--primary-container').trim();
const surface = style.getPropertyValue('--surface-container-lowest').trim();

const { Chart, registerables } = await import('https://cdn.jsdelivr.net/npm/chart.js@4/+esm');
Chart.register(...registerables);

new Chart(canvas, {
  type: 'line',
  data: {
    labels,
    datasets: [{
      data: prices,
      borderColor: primary,
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.3,
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
      y: {
        ticks: { callback: v => v.toFixed(2) + '€' },
        grid: { color: style.getPropertyValue('--outline-variant').trim() },
      },
    },
  },
});
