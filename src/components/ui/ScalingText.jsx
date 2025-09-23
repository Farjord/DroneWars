// ========================================
// SCALING TEXT COMPONENT
// ========================================
// Automatically scales text to fit within container bounds
// Prevents text overflow in responsive card layouts

import React, { useRef, useEffect } from 'react';

/**
 * SCALING TEXT COMPONENT
 * Automatically adjusts font size to fit text within container bounds.
 * Prevents text overflow in responsive card layouts.
 * @param {string} text - The text content to display
 * @param {string} className - CSS classes to apply to the text element
 */
const ScalingText = ({ text, className }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl || container.clientHeight === 0) return;

    const resizeText = () => {
      let min, max;
      if (className.includes("font-orbitron")) {
        min = 8;
        max = 16;
      } else {
        min = 8;
        max = 12;
      }

      let fontSize = max;
      textEl.style.fontSize = fontSize + 'px';

      while ((textEl.scrollWidth > container.clientWidth || textEl.scrollHeight > container.clientHeight) && fontSize > min) {
        fontSize -= 0.5;
        textEl.style.fontSize = fontSize + 'px';
      }
    };

    resizeText();
    window.addEventListener('resize', resizeText);
    return () => window.removeEventListener('resize', resizeText);
  }, [text, className]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden flex items-center justify-center">
      <span ref={textRef} className={className}>
        {text}
      </span>
    </div>
  );
};

export default ScalingText;