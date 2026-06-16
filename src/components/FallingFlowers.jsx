import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function FallingFlowers() {
  const canvasRef = useRef(null);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId;
    let petals = [];
    const maxPetals = 15; // Reduced from 35 for a very sparse and subtle look

    // Handle screen resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Dark vs Light color choices - softer tones
    const colors = isDarkMode
      ? [
          'rgba(194, 26, 91, 0.45)',   // Brand pink #c21a5b
          'rgba(87, 20, 119, 0.4)',    // Brand purple #571477
          'rgba(236, 72, 153, 0.4)',   // Pink-500
          'rgba(244, 114, 182, 0.35)',  // Pink-400
          'rgba(251, 207, 232, 0.4)',   // Pink-200
          'rgba(239, 68, 68, 0.35)'     // Red-500
        ]
      : [
          'rgba(194, 26, 91, 0.35)',   // Brand pink #c21a5b (softer for light mode)
          'rgba(87, 20, 119, 0.25)',   // Brand purple #571477
          'rgba(244, 114, 182, 0.3)',   // Pink-400
          'rgba(251, 207, 232, 0.35)',  // Pink-200
          'rgba(244, 143, 177, 0.3)',   // Rose-400
          'rgba(253, 164, 175, 0.35)'   // Rose-300
        ];

    class Petal {
      constructor() {
        this.reset(true);
      }

      reset(init = false) {
        this.x = Math.random() * canvas.width;
        // If initializing, scatter vertically; else start just off-screen top
        this.y = init ? Math.random() * canvas.height : -20;
        this.size = Math.random() * 10 + 6; // Petal size (6px to 16px)
        this.speedY = Math.random() * 0.4 + 0.4; // Reduced speed (0.4px to 0.8px per frame)
        this.swayAngle = Math.random() * Math.PI * 2;
        this.swaySpeed = Math.random() * 0.008 + 0.004; // Slower sway
        this.swayWidth = Math.random() * 10 + 8; // Sway amplitude
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.008; // Slower rotation
        this.scaleAngle = Math.random() * Math.PI * 2;
        this.scaleSpeed = Math.random() * 0.015 + 0.01; // Slower 3D flip
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.opacity = isDarkMode ? (Math.random() * 0.3 + 0.3) : (Math.random() * 0.25 + 0.35); // Softer opacities
      }

      update() {
        this.y += this.speedY;
        this.swayAngle += this.swaySpeed;
        // Sway sideways using sine wave
        this.x += Math.sin(this.swayAngle) * 0.5;
        this.rotation += this.rotationSpeed;
        this.scaleAngle += this.scaleSpeed;

        // If it goes off-screen (bottom or sides), reset it
        if (
          this.y > canvas.height + 20 ||
          this.x < -20 ||
          this.x > canvas.width + 20
        ) {
          this.reset(false);
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Simulates 3D flipping/fluttering by scaling horizontally using cosine
        const scaleX = Math.cos(this.scaleAngle);
        ctx.scale(scaleX, 1);
        
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;

        // Draw curved cherry blossom petal shape using quadratic curves
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-this.size / 2, this.size / 3, 0, this.size);
        ctx.quadraticCurveTo(this.size / 2, this.size / 3, 0, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }

    // Initialize petals list
    for (let i = 0; i < maxPetals; i++) {
      petals.push(new Petal());
    }

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw each petal
      for (let i = 0; i < petals.length; i++) {
        petals[i].update();
        petals[i].draw();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [isDarkMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999, // Overlay on top of everything
        pointerEvents: 'none', // Allow clicking/interacting with layers underneath
        mixBlendMode: isDarkMode ? 'screen' : 'normal', // Standard blend on light mode to prevent fading
      }}
    />
  );
}
