// client/src/services/premiumApiService.ts

export interface PremiumStatus {
  tier: 'none' | 'basic' | 'gold' | 'platinum' | 'vip';
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  daysRemaining: number;
  autoRenew: boolean;
  source?: string;
}

export interface PremiumUser {
  id: string;
  username: string;
  displayName: string;
  premiumTier: 'basic' | 'gold' | 'platinum' | 'vip';
  premiumStartDate: string;
  premiumEndDate: string;
  premiumSource?: string;
  premiumAutoRenew: boolean;
  isExpired: boolean;
  daysRemaining: number;
  balance: number;
}

export interface PremiumHistory {
  id: string;
  userId: string;
  tier: string;
  startDate: string;
  endDate: string;
  source: string;
  grantedBy?: string;
  reason?: string;
  autoRenewed: boolean;
  createdAt: string;
}

export class PremiumApiService {
  async getPremiumStatus(userId: string, token: string): Promise<PremiumStatus> {
    const response = await fetch(`/api/user/${userId}/premium`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch premium status');
    }

    return response.json();
  }

  async checkPremiumAccess(userId: string, token: string): Promise<boolean> {
    try {
      const status = await this.getPremiumStatus(userId, token);
      return status.isActive;
    } catch (error) {
      console.error('Failed to check premium access:', error);
      return false;
    }
  }

  // Admin only
  async grantPremium(
  userId: string,
  tier: 'basic' | 'gold' | 'platinum' | 'vip',
  durationDays: number,
  reason: string,
  source: 'admin' | 'manual' | 'boosty' | 'patreon',
  token: string
) {
  const response = await fetch(`/api/admin/user/${userId}/premium`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      tier,
      durationDays: Number(durationDays), // Преобразуем в число
      reason,
      source
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to grant premium');
  }

  return response.json();
}

  // Admin only
  async revokePremium(userId: string, reason: string, token: string) {
    const response = await fetch(`/api/admin/user/${userId}/premium`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to revoke premium');
    }

    return response.json();
  }

  // Admin only
  async getPremiumUsers(token: string): Promise<PremiumUser[]> {
    const response = await fetch('/api/admin/premium-users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch premium users');
    }

    return response.json();
  }

  // Admin only
  async getPremiumHistory(userId: string, token: string): Promise<PremiumHistory[]> {
    const response = await fetch(`/api/admin/user/${userId}/premium-history`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch premium history');
    }

    return response.json();
  }

  // Admin only - manual expiration check
  async checkPremiumExpiration(token: string) {
    const response = await fetch('/api/admin/check-premium-expiration', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to check premium expiration');
    }

    return response.json();
  }
}

export const premiumApiService = new PremiumApiService();