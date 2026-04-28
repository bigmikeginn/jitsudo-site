// Fixed: removed markdown link artifacts ([rect.top](http://...) → rect.top etc.)
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.tilt-card');
  const maxTilt = 8;

  cards.forEach((card) => {
    let frameId = null;
    let pointerX = 0;
    let pointerY = 0;

    const updateTilt = () => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const relX = (pointerX - centerX) / (rect.width / 2);
      const relY = (pointerY - centerY) / (rect.height / 2);
      const rotX = Math.max(-maxTilt, Math.min(maxTilt, -relY * maxTilt));
      const rotY = Math.max(-maxTilt, Math.min(maxTilt, relX * maxTilt));

      card.style.transition = 'transform 0.08s ease-out';
      card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      frameId = null;
    };

    card.addEventListener('mousemove', (e) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
      if (frameId === null) frameId = requestAnimationFrame(updateTilt);
    });

    card.addEventListener('mouseleave', () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      card.style.transition = 'transform 0.4s ease';
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
    });
  });
});
