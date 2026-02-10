const modules = [
  'introduction', 'installation', 'core-concepts', 'pipelines', 'integration',
  'advanced', 'architecture', 'security', 'labs', 'interview'
];

function initTheme() {
  const saved = localStorage.getItem('jenkins-theme');
  if (saved === 'dark') document.body.classList.add('dark');
  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('jenkins-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });
}

function initSearch() {
  const input = document.querySelector('[data-search]');
  if (!input) return;
  input.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.search-item').forEach((item) => {
      const text = item.textContent.toLowerCase();
      item.classList.toggle('hidden', q && !text.includes(q));
    });
  });
}

function initCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const code = btn.closest('.code-wrap')?.querySelector('code')?.innerText || '';
      await navigator.clipboard.writeText(code);
      const old = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => (btn.textContent = old), 900);
    });
  });
}

function initProgress() {
  const current = document.body.dataset.module;
  const completeBtn = document.querySelector('[data-complete]');
  let progress = JSON.parse(localStorage.getItem('jenkins-progress') || '[]');
  if (completeBtn && current) {
    completeBtn.addEventListener('click', () => {
      if (!progress.includes(current)) progress.push(current);
      localStorage.setItem('jenkins-progress', JSON.stringify(progress));
      renderProgress(progress);
      completeBtn.textContent = 'Completed ✓';
    });
  }
  renderProgress(progress);
}

function renderProgress(progress) {
  const done = progress.filter((x) => modules.includes(x)).length;
  const total = modules.length;
  const pct = Math.round((done / total) * 100);
  const bar = document.querySelector('.progress-track span');
  const txt = document.querySelector('.progress-text');
  if (bar) bar.style.width = `${pct}%`;
  if (txt) txt.textContent = `${done}/${total} modules completed (${pct}%)`;
}

function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-list a').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
}

initTheme();
initSearch();
initCopyButtons();
initProgress();
setActiveNav();
