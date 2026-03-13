import { useRef, useEffect, useCallback } from 'react';

/**
 * Applies 3D tilt parallax to a card element during hover and drag.
 * Sets --sheen CSS variable for a sliding sheen overlay.
 * Uses direct DOM manipulation via refs + rAF for performance (no React re-renders).
 * @param {boolean} isDragging - Whether the card is currently being dragged
 * @param {Object} [options]
 * @param {number} [options.maxTiltDrag=15] - Max tilt degrees during drag
 * @param {number} [options.maxTiltHover=8] - Max tilt degrees during hover
 * @param {string|null} [options.glowShadow=null] - CSS box-shadow value for hover glow (applied on wrapper, avoids bitmap rasterization)
 * @param {Function|null} [options.externalRef=null] - Callback ref to also receive the DOM element
 * @returns {Function} callback ref to attach to the card's outer div
 */
export default function useCardTilt(isDragging, { maxTiltDrag = 15, maxTiltHover = 8, glowShadow = null, externalRef = null } = {}) {
  const cardRef = useRef(null);
  const rafId = useRef(null);
  const isFirstFrame = useRef(true);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    // Preserve any existing scale (e.g. from scaleStyle prop) so tilt composes with it
    const raw = el.style.transform || '';
    const scaleMatch = raw.match(/scale\(([^)]+)\)/);
    const baseScale = scaleMatch ? `scale(${scaleMatch[1]}) ` : '';

    if (isDragging) {
      // Drag mode — document-level mousemove with stronger tilt
      isFirstFrame.current = true;
      if (glowShadow) el.style.boxShadow = glowShadow;
      const handleMouseMove = (e) => {
        if (rafId.current) cancelAnimationFrame(rafId.current);

        rafId.current = requestAnimationFrame(() => {
          if (!cardRef.current) return;

          const rect = cardRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const normX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2)));
          const normY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)));

          const rotateY = normX * maxTiltDrag;
          const rotateX = -normY * maxTiltDrag;

          if (isFirstFrame.current) {
            cardRef.current.style.transition = 'transform 300ms ease-out';
            isFirstFrame.current = false;
            setTimeout(() => {
              if (cardRef.current) {
                cardRef.current.style.transition = 'none';
              }
            }, 300);
          }

          cardRef.current.style.transform = `${baseScale}rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
          cardRef.current.style.setProperty('--sheen', `${normX * 50}%`);
        });
      };

      document.addEventListener('mousemove', handleMouseMove);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        if (rafId.current) cancelAnimationFrame(rafId.current);
        if (cardRef.current) {
          cardRef.current.style.boxShadow = '';
        }
      };
    }

    // Hover mode — card-level mousemove with gentle tilt
    el.style.transition = 'transform 300ms ease-out, box-shadow 200ms ease';
    el.style.transform = `${baseScale}rotateX(0deg) rotateY(0deg)`;
    el.style.setProperty('--sheen', '-100%');
    el.style.boxShadow = '';

    const handleHoverEnter = () => {
      if (!cardRef.current || !glowShadow) return;
      cardRef.current.style.boxShadow = glowShadow;
    };

    const handleHoverMove = (e) => {
      if (rafId.current) cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const normX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2)));
        const normY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)));

        const rotateY = normX * maxTiltHover;
        const rotateX = -normY * maxTiltHover;

        cardRef.current.style.transition = 'none';
        cardRef.current.style.transform = `${baseScale}rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        cardRef.current.style.setProperty('--sheen', `${normX * 50}%`);
      });
    };

    const handleHoverLeave = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (!cardRef.current) return;

      cardRef.current.style.transition = 'transform 300ms ease-out, box-shadow 200ms ease';
      cardRef.current.style.transform = `${baseScale}rotateX(0deg) rotateY(0deg)`;
      cardRef.current.style.setProperty('--sheen', '-100%');
      cardRef.current.style.boxShadow = '';
    };

    el.addEventListener('mouseenter', handleHoverEnter);
    el.addEventListener('mousemove', handleHoverMove);
    el.addEventListener('mouseleave', handleHoverLeave);

    return () => {
      el.removeEventListener('mouseenter', handleHoverEnter);
      el.removeEventListener('mousemove', handleHoverMove);
      el.removeEventListener('mouseleave', handleHoverLeave);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isDragging, maxTiltDrag, maxTiltHover, glowShadow]);

  const setRef = useCallback((el) => {
    cardRef.current = el;
    if (typeof externalRef === 'function') externalRef(el);
  }, [externalRef]);

  return setRef;
}
