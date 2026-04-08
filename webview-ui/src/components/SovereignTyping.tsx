import { useState, useEffect } from 'react';

export function SovereignTyping({ text, speed = 15 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setComplete(false);
    
    let i = 0;
    const artifacts = ['$', '#', '%', '&', '@', '?', '!', '0', '1', '█', '▓', '▒', '░'];
    
    const interval = setInterval(() => {
      // Scramble phase: momentary flicker of random artifacts at the leading edge
      if (Math.random() > 0.7 && i < text.length) {
        const scramble = text.slice(0, i) + artifacts[Math.floor(Math.random() * artifacts.length)];
        setDisplayed(scramble);
      } else {
        setDisplayed(text.slice(0, i + 1));
        i++;
      }

      if (i >= text.length) {
        clearInterval(interval);
        setComplete(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  if (complete) {
    return <span className="shimmer-text cinematic-entry decryption-settle">{text}</span>;
  }

  return (
    <span className="typing-flicker">
      {displayed}
      <span className="blinking-cursor neon-cyan">_</span>
    </span>
  );
}


