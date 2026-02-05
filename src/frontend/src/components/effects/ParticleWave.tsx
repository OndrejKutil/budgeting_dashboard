import { useEffect, useRef } from 'react';

interface GridPoint {
  baseX: number;
  baseZ: number;
  x: number;
  y: number;
  z: number;
  screenX: number;
  screenY: number;
  size: number;
  alpha: number;
  isAccent: boolean;
  phase: number;
}

interface ParticleWaveProps {
  className?: string;
}

export function ParticleWave({ className = '' }: ParticleWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const pointsRef = useRef<GridPoint[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const initPoints = () => {
      pointsRef.current = [];

      // Create a 2D grid that we'll project with perspective
      const cols = 35;
      const rows = 15;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Normalized coordinates (-1 to 1 for x, 0 to 1 for depth)
          const nx = (col / (cols - 1)) * 2 - 1;  // -1 to 1
          const nz = row / (rows - 1);             // 0 to 1 (0 = front, 1 = back)

          const isAccent = Math.random() < 0.06;

          pointsRef.current.push({
            baseX: nx,
            baseZ: nz,
            x: 0,
            y: 0,
            z: 0,
            screenX: 0,
            screenY: 0,
            size: isAccent ? 3.5 : 2,
            alpha: 1,
            isAccent,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      timeRef.current += 0.004;

      const points = pointsRef.current;
      const cols = 35;

      // Perspective parameters
      const horizonY = height * 0.35;      // Where the horizon line sits
      const groundY = height * 1.2;        // Where the "ground" plane starts (below screen)
      const vanishX = width * 0.5;         // Vanishing point X (center)
      const spreadNear = width * 1.3;      // How wide the grid is at the front
      const spreadFar = width * 0.1;       // How narrow at the horizon

      // Update each point
      points.forEach((point) => {
        const depth = point.baseZ;  // 0 = near, 1 = far

        // Wave motion - slow, organic movement
        const waveOffset = Math.sin(point.baseX * 3 + point.baseZ * 2 + timeRef.current) * 0.03
          + Math.sin(point.baseX * 1.5 - point.baseZ * 3 + timeRef.current * 0.6) * 0.02;

        // Calculate screen Y with perspective (interpolate from ground to horizon)
        const perspectiveY = groundY + (horizonY - groundY) * depth;
        point.screenY = perspectiveY + waveOffset * (1 - depth) * 100;

        // Calculate screen X with perspective (narrower as we go back)
        const currentSpread = spreadNear + (spreadFar - spreadNear) * depth;
        point.screenX = vanishX + point.baseX * currentSpread * 0.5;

        // Store depth for connections
        point.z = depth;

        // Size and alpha based on depth (smaller and fainter in distance)
        const depthFactor = 1 - depth * 0.85;
        point.size = (point.isAccent ? 4 : 2.2) * depthFactor;
        point.alpha = Math.pow(depthFactor, 1.3) * (point.isAccent ? 0.85 : 0.5);
      });

      // Draw connections first (behind points)
      ctx.lineWidth = 1;
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const col = i % cols;

        // Connect to right neighbor
        if (col < cols - 1) {
          const right = points[i + 1];
          drawConnection(ctx, point, right);
        }

        // Connect to next row (toward horizon)
        if (i + cols < points.length) {
          const back = points[i + cols];
          drawConnection(ctx, point, back);
        }
      }

      // Draw points (sorted by depth - far first)
      const sortedPoints = [...points].sort((a, b) => b.z - a.z);

      sortedPoints.forEach((point) => {
        if (point.alpha < 0.03) return;
        if (point.screenY < -20 || point.screenY > height + 20) return;
        if (point.screenX < -20 || point.screenX > width + 20) return;

        // Glow effect
        const glowRadius = point.size * 3.5;
        const gradient = ctx.createRadialGradient(
          point.screenX, point.screenY, 0,
          point.screenX, point.screenY, glowRadius
        );

        if (point.isAccent) {
          gradient.addColorStop(0, `rgba(255, 190, 80, ${point.alpha})`);
          gradient.addColorStop(0.35, `rgba(245, 158, 11, ${point.alpha * 0.35})`);
          gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
        } else {
          gradient.addColorStop(0, `rgba(255, 255, 255, ${point.alpha})`);
          gradient.addColorStop(0.35, `rgba(60, 190, 210, ${point.alpha * 0.3})`);
          gradient.addColorStop(1, 'rgba(60, 190, 210, 0)');
        }

        ctx.beginPath();
        ctx.arc(point.screenX, point.screenY, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Bright core
        ctx.beginPath();
        ctx.arc(point.screenX, point.screenY, point.size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = point.isAccent
          ? `rgba(255, 230, 160, ${Math.min(1, point.alpha * 1.3)})`
          : `rgba(255, 255, 255, ${Math.min(1, point.alpha * 1.1)})`;
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const drawConnection = (ctx: CanvasRenderingContext2D, p1: GridPoint, p2: GridPoint) => {
      const avgDepth = (p1.z + p2.z) / 2;
      const depthFade = 1 - avgDepth * 0.9;
      const alpha = depthFade * 0.2;

      if (alpha < 0.02) return;

      ctx.beginPath();
      ctx.moveTo(p1.screenX, p1.screenY);
      ctx.lineTo(p2.screenX, p2.screenY);
      ctx.strokeStyle = `rgba(50, 170, 190, ${alpha})`;
      ctx.lineWidth = Math.max(0.3, 1.2 * depthFade);
      ctx.stroke();
    };

    resizeCanvas();
    initPoints();

    const handleResize = () => {
      resizeCanvas();
      initPoints();
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}

export default ParticleWave;
