document.addEventListener('DOMContentLoaded', () => {
  // Assign --stagger-index to direct .reveal children of .reveal-stagger parents
  document.querySelectorAll('.reveal-stagger').forEach((parent) => {
    parent.querySelectorAll(':scope > .reveal').forEach((child, index) => {
      child.style.setProperty('--stagger-index', index);
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  // Staggered list items — fires when the <ul data-stagger-list> enters viewport
  document.querySelectorAll('[data-stagger-list]').forEach((list) => {
    const items = [...list.querySelectorAll(':scope > li')];
    items.forEach((item) => item.classList.add('stagger-item'));

    const listObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            items.forEach((item, i) => {
              setTimeout(() => item.classList.add('revealed'), i * 75);
            });
            listObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -32px 0px' }
    );

    listObserver.observe(list);
  });
});
