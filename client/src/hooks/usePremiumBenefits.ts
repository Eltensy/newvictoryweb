// client/src/hooks/usePremiumBenefits.ts
// Hook to check and apply premium benefits throughout the app

import { usePremium } from './usePremium';

export interface PremiumBenefits {
  hasAccess: boolean;
  tier: 'none' | 'basic' | 'gold' | 'platinum' | 'vip';
  goldBonus: number; // Percentage bonus for gold exchange
  canSkipQualification: boolean;
  hasEarlyAccess: boolean;
  hasVipStatus: boolean;
  canAccessPrivateTournaments: boolean;
  displayBadge: boolean;
}

export function usePremiumBenefits(): PremiumBenefits {
  const { premiumStatus, hasPremium, tier } = usePremium();

  // Calculate benefits based on tier
  const goldBonus = (() => {
    if (!hasPremium) return 0;
    switch (tier) {
      case 'basic': return 10;    // +10%
      case 'gold': return 15;      // +15%
      case 'platinum': return 20;  // +20%
      case 'vip': return 25;       // +25%
      default: return 0;
    }
  })();

  const canSkipQualification = hasPremium && ['gold', 'platinum', 'vip'].includes(tier);
  const hasEarlyAccess = hasPremium;
  const hasVipStatus = tier === 'vip';
  const canAccessPrivateTournaments = hasPremium;
  const displayBadge = hasPremium && tier !== 'none';

  return {
    hasAccess: hasPremium,
    tier,
    goldBonus,
    canSkipQualification,
    hasEarlyAccess,
    hasVipStatus,
    canAccessPrivateTournaments,
    displayBadge
  };
}

// Helper to format gold with bonus
export function formatGoldWithBonus(baseAmount: number, bonusPercent: number): {
  base: number;
  bonus: number;
  total: number;
} {
  const bonus = Math.floor((baseAmount * bonusPercent) / 100);
  return {
    base: baseAmount,
    bonus,
    total: baseAmount + bonus
  };
}