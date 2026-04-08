import { useContext } from 'react';
import { SovereignContext } from '../context/SovereignContextDefinition';
import type { SovereignContextType } from '../context/SovereignContextDefinition';

export const useSovereign = (): SovereignContextType => {
  const context = useContext(SovereignContext);
  if (context === undefined) {
    throw new Error('useSovereign must be used within a SovereignProvider');
  }
  return context;
};
