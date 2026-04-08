import { useEffect, useState } from 'react';

export function BiometricScan({ onComplete }: { onComplete?: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="biometric-scan-overlay">
      <div className="laser-sweep" />
      <div className="scan-data-grid">
         <div className="scan-node top-left">IDENTITY_VERIFYING...</div>
         <div className="scan-node bottom-right">LINK_COHERENCE_STABLE</div>
      </div>
      <div className="scan-pulse" />
    </div>
  );
}
