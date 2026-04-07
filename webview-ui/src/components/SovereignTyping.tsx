/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { useState, useEffect } from 'react';

export function SovereignTyping({ text, speed = 15 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setComplete(false);
    
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setComplete(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  if (complete) {
    return <span className="shimmer-text">{text}</span>;
  }

  return (
    <span>
      {displayed}
      <span className="blinking-cursor">_</span>
    </span>
  );
}
