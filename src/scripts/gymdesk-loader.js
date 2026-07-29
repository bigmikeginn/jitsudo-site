// @ts-nocheck — window.trackEvent is a dynamic global set by tracking.js.
function loadGymdesk() {
  const widget = document.querySelector('.gymdesk-schedule');
  if (!widget) return;

  const titleFrames = () => {
    widget.querySelectorAll('iframe:not([title])').forEach((frame) => {
      frame.setAttribute('title', 'Jitsu-Do class schedule and trial booking');
    });
  };
  const observer = new MutationObserver(titleFrames);
  observer.observe(widget, { childList: true, subtree: true });
  titleFrames();

  const fallback = document.getElementById('gymdesk-fallback');
  const showFallback = () => {
    if (fallback && !widget.querySelector('iframe')) fallback.hidden = false;
  };

  // Gymdesk's loader intentionally switches to gymdesk.test on local hosts.
  // Avoid a guaranteed DNS error during local previews while keeping production live.
  if (['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) {
    showFallback();
    return;
  }

  const start = () => {
    if (window.trackEvent) window.trackEvent('gymdesk_widget_loaded', { page: window.location.pathname });
    const jquery = document.createElement('script');
    jquery.src = '/js/jquery-3.7.1.min.js';
    jquery.onload = () => {
      const script = document.createElement('script');
      script.src = 'https://app.gymdesk.com/js/widgets.js';
      script.async = true;
      script.onerror = showFallback;
      document.body.appendChild(script);
    };
    jquery.onerror = showFallback;
    document.body.appendChild(jquery);
    window.setTimeout(showFallback, 8000);
  };

  if ('IntersectionObserver' in window) {
    const nearViewport = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        nearViewport.disconnect();
        start();
      }
    }, { rootMargin: '600px' });
    nearViewport.observe(widget);
  } else {
    start();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadGymdesk, { once: true });
} else {
  loadGymdesk();
}
