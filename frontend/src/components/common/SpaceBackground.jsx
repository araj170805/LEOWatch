import React from 'react';
import CursorGrid from './CursorGrid.jsx';

export default function SpaceBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none bg-[#050816] overflow-hidden">
      <CursorGrid
        cellSize={70}
        color="#00F0FF"
        radius={140}
        falloff="smooth"
        holdTime={90}
        fadeDuration={240}
        lineWidth={1.2}
        maxOpacity={0.8}
        fillOpacity={0}
        gridOpacity={0.03}
        cellRadius={0}
        clickPulse={true}
        pulseSpeed={600}
      />
    </div>
  );
}
