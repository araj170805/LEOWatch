import React, { useEffect, useRef } from 'react';

export default function CursorGrid({
  cellSize = 70,
  color = '#00F0FF',
  radius = 140,
  falloff = 'smooth',
  holdTime = 400,
  fadeDuration = 800,
  lineWidth = 1.2,
  maxOpacity = 1,
  fillOpacity = 0,
  gridOpacity = 0.05,
  cellRadius = 0,
  clickPulse = true,
  pulseSpeed = 600,
  className = '',
  style = {},
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let width = 0;
    let height = 0;

    // Track active cells that have been highlighted
    // Key: "col_row", Value: { lastSeenTime: number, clickTime?: number }
    const activeCells = new Map();
    const pulses = [];

    // Smoothed cursor position that the grid actually reacts to, plus the raw
    // target it eases toward. A small deadzone + per-frame lerp stops tiny or
    // accidental pointer movements from snapping the highlight around.
    const OFFSCREEN = -9999;
    const MOVE_DEADZONE = 6; // px — ignore pointer jitter below this
    const SMOOTHING = 0.14; // 0..1 per frame — lower = smoother/heavier
    let mouseX = OFFSCREEN;
    let mouseY = OFFSCREEN;
    let targetX = OFFSCREEN;
    let targetY = OFFSCREEN;
    let lastRawX = OFFSCREEN;
    let lastRawY = OFFSCREEN;

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth || window.innerWidth;
      height = parent.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    }

    resize();
    window.addEventListener('resize', resize);

    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      const rx = e.clientX - rect.left;
      const ry = e.clientY - rect.top;
      // Deadzone: drop sub-threshold jitter so a resting/twitching pointer
      // doesn't keep re-triggering the grid.
      if (
        lastRawX !== OFFSCREEN &&
        Math.hypot(rx - lastRawX, ry - lastRawY) < MOVE_DEADZONE
      ) {
        return;
      }
      lastRawX = rx;
      lastRawY = ry;
      targetX = rx;
      targetY = ry;
    }

    function onMouseLeave() {
      targetX = OFFSCREEN;
      targetY = OFFSCREEN;
      lastRawX = OFFSCREEN;
      lastRawY = OFFSCREEN;
    }

    function onClick(e) {
      if (!clickPulse) return;
      const rect = canvas.getBoundingClientRect();
      pulses.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        startTime: performance.now(),
      });
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('click', onClick);

    function render(now) {
      animId = requestAnimationFrame(render);
      ctx.clearRect(0, 0, width, height);

      // Ease the reactive position toward the raw target so movement glides
      // instead of jumping. Snap on enter/leave to avoid a sweep from offscreen.
      if (targetX === OFFSCREEN) {
        mouseX = OFFSCREEN;
        mouseY = OFFSCREEN;
      } else if (mouseX === OFFSCREEN) {
        mouseX = targetX;
        mouseY = targetY;
      } else {
        mouseX += (targetX - mouseX) * SMOOTHING;
        mouseY += (targetY - mouseY) * SMOOTHING;
      }

      const cols = Math.ceil(width / cellSize) + 1;
      const rows = Math.ceil(height / cellSize) + 1;

      // Update active cells under cursor
      if (mouseX >= 0 && mouseY >= 0) {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const cellCenterX = c * cellSize + cellSize / 2;
            const cellCenterY = r * cellSize + cellSize / 2;
            const dist = Math.hypot(cellCenterX - mouseX, cellCenterY - mouseY);

            if (dist <= radius) {
              const key = `${c}_${r}`;
              let factor = 1 - dist / radius;
              if (falloff === 'smooth') {
                factor = factor * factor * (3 - 2 * factor);
              }
              activeCells.set(key, {
                col: c,
                row: r,
                intensity: factor,
                time: now,
              });
            }
          }
        }
      }

      // Process click pulses
      const activePulses = [];
      for (const p of pulses) {
        const elapsed = now - p.startTime;
        if (elapsed < pulseSpeed) {
          activePulses.push(p);
          const currentRadius = (elapsed / pulseSpeed) * (radius * 2);
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const cellCenterX = c * cellSize + cellSize / 2;
              const cellCenterY = r * cellSize + cellSize / 2;
              const dist = Math.hypot(cellCenterX - p.x, cellCenterY - p.y);
              if (Math.abs(dist - currentRadius) < cellSize * 0.8) {
                const key = `${c}_${r}`;
                const pulseFactor = 1 - Math.abs(dist - currentRadius) / (cellSize * 0.8);
                const existing = activeCells.get(key);
                activeCells.set(key, {
                  col: c,
                  row: r,
                  intensity: Math.max(existing?.intensity || 0, pulseFactor),
                  time: now,
                });
              }
            }
          }
        }
      }
      pulses.length = 0;
      pulses.push(...activePulses);

      // Base grid drawing if gridOpacity > 0
      if (gridOpacity > 0) {
        ctx.strokeStyle = color;
        ctx.globalAlpha = gridOpacity;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        for (let c = 0; c <= cols; c++) {
          const x = c * cellSize;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let r = 0; r <= rows; r++) {
          const y = r * cellSize;
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();
      }

      // Draw highlighted cells
      ctx.lineWidth = lineWidth;

      activeCells.forEach((cell, key) => {
        const timePassed = now - cell.time;
        let cellAlpha = cell.intensity;

        if (timePassed > holdTime) {
          const fadeProgress = (timePassed - holdTime) / fadeDuration;
          if (fadeProgress >= 1) {
            activeCells.delete(key);
            return;
          }
          cellAlpha *= 1 - fadeProgress;
        }

        const opacity = Math.min(cellAlpha * maxOpacity, 1);
        if (opacity <= 0.001) return;

        const x = cell.col * cellSize;
        const y = cell.row * cellSize;

        if (fillOpacity > 0) {
          ctx.fillStyle = color;
          ctx.globalAlpha = opacity * fillOpacity;
          if (cellRadius > 0) {
            ctx.beginPath();
            ctx.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, cellRadius);
            ctx.fill();
          } else {
            ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          }
        }

        ctx.strokeStyle = color;
        ctx.globalAlpha = opacity;
        if (cellRadius > 0) {
          ctx.beginPath();
          ctx.roundRect(x, y, cellSize, cellSize, cellRadius);
          ctx.stroke();
        } else {
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
      });
    }

    render(performance.now());

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('click', onClick);
    };
  }, [
    cellSize,
    color,
    radius,
    falloff,
    holdTime,
    fadeDuration,
    lineWidth,
    maxOpacity,
    fillOpacity,
    gridOpacity,
    cellRadius,
    clickPulse,
    pulseSpeed,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-0 ${className}`}
      style={style}
    />
  );
}
