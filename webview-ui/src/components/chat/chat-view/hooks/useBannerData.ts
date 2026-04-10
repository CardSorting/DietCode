/**
 * [LAYER: UI]
 * [SUB-ZONE: chat/hooks]
 * Principle: Custom hooks for UI interaction patterns
 */

import { useState } from "react";

export type BannerType = 'info' | 'warning' | 'error' | 'success';

export interface Banner {
  id: string;
  type: BannerType;
  message: string;
  duration?: number;
  onClose?: () => void;
}

export function useBannerData() {
  const [banners, setBanners] = useState<Banner[]>([]);

  const addBanner = (type: BannerType, message: string, duration?: number, onClose?: () => void) => {
    const id = `banner-${Date.now()}-${Math.random()}`;
    const newBanner: Banner = { id, type, message, duration, onClose };
    
    setBanners((prev) => [...prev, newBanner]);
    
    if (duration) {
      setTimeout(() => {
        removeBanner(id);
      }, duration);
    }
    
    return id;
  };

  const removeBanner = (id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  const clearAllBanners = () => {
    setBanners([]);
  };

  const getBannerTypeStyle = (type: BannerType) => {
    switch (type) {
      case 'info':
        return 'info';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'success':
        return 'success';
      default:
        return 'info';
    }
  };

  return {
    banners,
    addBanner,
    removeBanner,
    clearAllBanners,
    getBannerTypeStyle
  };
}
