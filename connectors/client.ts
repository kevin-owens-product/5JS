import './style.css';

const status = document.getElementById('copy-status');
document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach(button => {
  button.hidden = false;
  button.addEventListener('click', async () => {
    const code = document.getElementById(button.dataset.copy!);
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.textContent ?? '');
      if (status) status.textContent = 'Code copied to clipboard.';
      button.textContent = 'Copied ✓';
      setTimeout(() => { button.textContent = 'Copy code'; }, 2000);
    } catch {
      button.textContent = 'Copy code';
      const selection = window.getSelection(), range = document.createRange();
      range.selectNodeContents(code); selection?.removeAllRanges(); selection?.addRange(range);
      code.closest<HTMLElement>('pre')?.focus();
      if (status) status.textContent = 'Clipboard access is unavailable. Code is selected; use your usual copy shortcut.';
    }
  });
});
document.querySelectorAll<HTMLButtonElement>('[data-download]').forEach(button => {
  button.hidden = false;
  button.addEventListener('click', () => {
    const code = document.getElementById(button.dataset.download!);
    if (!code) return;
    const url = URL.createObjectURL(new Blob([code.textContent ?? ''], { type: 'text/typescript;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = button.dataset.filename ?? 'motif-example.ts'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (status) status.textContent = 'Code sample downloaded. Configure its prerequisites before running it.';
  });
});

const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
if (tabs.length) {
  const activate = (tab: HTMLButtonElement) => {
    for (const candidate of tabs) {
      const selected = candidate === tab;
      candidate.setAttribute('aria-selected', String(selected)); candidate.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(candidate.getAttribute('aria-controls')!);
      if (panel) panel.hidden = !selected;
    }
    if (status) status.textContent = '';
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      let next: number;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault(); activate(tabs[next]); tabs[next].focus();
    });
  });
  document.getElementById('sample-tabs')!.hidden = false;
  activate(tabs[0]);
}

const search = document.querySelector<HTMLInputElement>('#source-search');
if (search) {
  const cards = [...document.querySelectorAll<HTMLElement>('[data-source-card]')];
  const filters = [...document.querySelectorAll<HTMLButtonElement>('[data-category]')];
  const count = document.getElementById('source-count')!, empty = document.getElementById('no-results')!;
  let category = 'All sources';
  function update(writeUrl: boolean) {
    const query = search!.value.trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      card.hidden = !((category === 'All sources' || card.dataset.categoryName === category) && card.dataset.search!.includes(query));
      if (!card.hidden) visible++;
    }
    for (const button of filters) button.setAttribute('aria-pressed', String(button.dataset.category === category));
    count.textContent = `${visible} ${visible === 1 ? 'connector guide' : 'connector guides'}`;
    empty.hidden = visible > 0;
    if (writeUrl) {
      const url = new URL(location.href);
      if (query) url.searchParams.set('q', search!.value.trim()); else url.searchParams.delete('q');
      if (category !== 'All sources') url.searchParams.set('category', category); else url.searchParams.delete('category');
      history.replaceState(null, '', url);
    }
  }
  function restore() {
    const url = new URL(location.href); search!.value = url.searchParams.get('q') ?? '';
    const requested = url.searchParams.get('category'); category = filters.some(button => button.dataset.category === requested) ? requested! : 'All sources';
    update(false);
  }
  filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.category!; update(true); }));
  search.addEventListener('input', () => update(true));
  document.getElementById('reset-sources')?.addEventListener('click', () => { search.value = ''; category = 'All sources'; update(true); search.focus(); });
  window.addEventListener('popstate', restore);
  document.getElementById('source-controls')!.hidden = false; restore();
}

document.documentElement.dataset.connectorReady = 'true';
