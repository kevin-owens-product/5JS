/** Lightweight recorded scenes: never create extra WebGL contexts for discovery. */
export function bindPreviewMotion(root: ParentNode = document): () => void {
  const videos = [...root.querySelectorAll<HTMLVideoElement>('video[data-preview-src]')];
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-preview-motion]')];
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let enabled = !preference.matches;
  let disposed = false;
  const visible = new Set<HTMLVideoElement>();
  function update() {
    for (const button of buttons) {
      button.textContent = enabled ? 'Pause previews' : 'Play previews';
      button.setAttribute('aria-pressed', String(enabled));
    }
    for (const video of videos) {
      if (enabled && visible.has(video) && !document.hidden && !video.dataset.failed) {
        if (!video.src) video.src = video.dataset.previewSrc!;
        video.muted = true;
        void video.play().catch(() => { video.classList.remove('is-playing'); });
      } else video.pause();
    }
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const video = entry.target as HTMLVideoElement;
      if (entry.isIntersecting) visible.add(video); else visible.delete(video);
    }
    update();
  }, { threshold: 0.15 });
  const onToggle = () => { enabled = !enabled; update(); };
  const onPreference = () => {
    enabled = !preference.matches;
    if (!enabled) for (const video of videos) video.classList.remove('is-playing');
    update();
  };
  const onPlaying = (event: Event) => { const video = event.currentTarget as HTMLVideoElement; if (!disposed) video.classList.add('is-playing'); };
  const onError = (event: Event) => { const video = event.currentTarget as HTMLVideoElement; video.dataset.failed = 'true'; video.classList.remove('is-playing'); };
  for (const video of videos) {
    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onError);
    observer.observe(video);
  }
  for (const button of buttons) button.addEventListener('click', onToggle);
  preference.addEventListener('change', onPreference);
  document.addEventListener('visibilitychange', update);
  update();
  return () => {
    disposed = true; observer.disconnect();
    for (const video of videos) {
      video.removeEventListener('playing', onPlaying); video.removeEventListener('error', onError);
      video.pause(); video.removeAttribute('src'); video.load();
    }
    for (const button of buttons) button.removeEventListener('click', onToggle);
    preference.removeEventListener('change', onPreference);
    document.removeEventListener('visibilitychange', update);
  };
}
