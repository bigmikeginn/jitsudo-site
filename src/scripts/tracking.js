// @ts-nocheck — window.plausible/trackEvent are dynamic globals from the Plausible snippet.
// Sends a custom event to Plausible if it has loaded, else queues it via the
// standard Plausible snippet convention so no events are dropped before init.
export function trackEvent(name, props) {
  window.plausible = window.plausible || function () {
    (window.plausible.q = window.plausible.q || []).push(arguments);
  };
  window.plausible(name, props ? { props } : undefined);
}

// Exposed for the inline, non-module chat widget script in Layout.astro.
window.trackEvent = trackEvent;

function propsFromDataset(dataset) {
  const props = {};
  for (const key in dataset) {
    if (key === 'track' || !key.startsWith('track')) continue;
    const propKey = key.slice('track'.length);
    const normalized = propKey.charAt(0).toLowerCase() + propKey.slice(1);
    props[normalized] = dataset[key];
  }
  return props;
}

// Best-effort classification for links we didn't get to hand-annotate —
// explicit data-track always takes priority over this fallback.
function fallbackEventName(link) {
  const href = link.getAttribute('href') || '';
  if (href.startsWith('tel:')) return 'phone_click';
  if (href.startsWith('mailto:')) return 'email_click';
  if (href.includes('gymdesk.com')) return 'gymdesk_start';
  if (href === '/trial' || href.startsWith('/trial#') || href.startsWith('/trial?')) return 'trial_cta_click';
  if (href === '/schedule' || href.startsWith('/schedule#') || href.startsWith('/schedule?')) return 'schedule_cta_click';
  return null;
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-track]');
  if (el) {
    trackEvent(el.dataset.track, propsFromDataset(el.dataset));
    return;
  }

  const link = e.target.closest('a[href]');
  if (!link) return;
  const name = fallbackEventName(link);
  if (name) trackEvent(name, { href: link.getAttribute('href'), page: window.location.pathname });
});
