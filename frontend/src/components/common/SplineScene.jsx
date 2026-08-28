import React, { Suspense } from 'react';
import Spline from '@splinetool/react-spline';

export default function SplineScene({ scene, className, onLoad }) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center bg-[#050816]">
          <span className="text-[#00f0ff] font-mono text-xs animate-pulse">Loading 3D Spline Scene...</span>
        </div>
      }
    >
      <Spline scene={scene} className={className} onLoad={onLoad} />
    </Suspense>
  );
}
