import React from 'react';

export function VisualEqualizer({ active = false }: { active?: boolean }) {
  const bars = [1, 2, 3, 4, 5, 6, 7, 8];
  
  return (
    <div className={`visual-equalizer ${active ? 'active' : 'idle'}`}>
      {bars.map(i => (
        <div 
          key={i} 
          className="eq-bar" 
          style={{ 
            animationDelay: `${i * 0.15}s`,
            height: active ? `${((i * 3) % 8) + 4}px` : '2px'
          }} 
        />
      ))}
    </div>
  );
}
