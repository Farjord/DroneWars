import React, { useEffect, useRef } from 'react';

const SpaceBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Create stars with varying properties and colors
    const stars = Array.from({ length: 500 }, () => {
      const rand = Math.random();
      let color;
      
      if (rand < 0.90) {
        color = 'rgba(255, 255, 255, ';
      } else if (rand < 0.94) {
        color = 'rgba(100, 150, 255, ';
      } else if (rand < 0.98) {
        color = 'rgba(255, 200, 100, ';
      } else {
        color = 'rgba(255, 100, 100, ';
      }
      
      return {
        x: 0,
        y: 0,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
        twinkleSpeed: 0.005 + Math.random() * 0.01,
        twinklePhase: Math.random() * Math.PI * 2,
        color: color
      };
    });

    // Create nebulae with random colors
    const nebulaColors = [
      'rgba(147, 51, 234, ',
      'rgba(59, 130, 246, ',
      'rgba(236, 72, 153, ',
      'rgba(16, 185, 129, ',
      'rgba(6, 182, 212, ',
      'rgba(139, 92, 246, ',
      'rgba(34, 211, 238, '
    ];

    const nebulae = Array.from({ length: 4 }, () => ({
      x: 0,
      y: 0,
      radius: 180 + Math.random() * 150,
      color: nebulaColors[Math.floor(Math.random() * nebulaColors.length)],
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.004 + Math.random() * 0.003
    }));

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      stars.forEach(star => {
        star.x = Math.random() * canvas.width;
        star.y = Math.random() * canvas.height;
      });
      
      nebulae.forEach(nebula => {
        nebula.x = Math.random() * canvas.width;
        nebula.y = Math.random() * canvas.height;
      });
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw nebulae with cloud effect
      nebulae.forEach(nebula => {
        nebula.pulsePhase += nebula.pulseSpeed;
        const baseOpacity = 0.08 + Math.sin(nebula.pulsePhase) * 0.04;
        
        for (let layer = 0; layer < 3; layer++) {
          const offsetX = Math.sin(nebula.pulsePhase * 0.5 + layer) * 30;
          const offsetY = Math.cos(nebula.pulsePhase * 0.3 + layer) * 30;
          const layerOpacity = baseOpacity * (0.4 + layer * 0.3);
          
          const gradient = ctx.createRadialGradient(
            nebula.x + offsetX, nebula.y + offsetY, 0,
            nebula.x + offsetX, nebula.y + offsetY, nebula.radius * (0.7 + layer * 0.15)
          );
          gradient.addColorStop(0, nebula.color + layerOpacity + ')');
          gradient.addColorStop(0.3, nebula.color + (layerOpacity * 0.6) + ')');
          gradient.addColorStop(0.7, nebula.color + (layerOpacity * 0.2) + ')');
          gradient.addColorStop(1, nebula.color + '0)');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      });

      // Draw stars
      stars.forEach(star => {
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = 0.3 + Math.sin(star.twinklePhase) * 0.7;
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = star.color + (star.opacity * twinkle) + ')';
        ctx.fill();
        
        if (star.radius > 1) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 2, 0, Math.PI * 2);
          ctx.fillStyle = star.color + (star.opacity * twinkle * 0.1) + ')';
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ background: '#0a0a1a' }}
    />
  );
};

export default SpaceBackground;