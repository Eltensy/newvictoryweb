// client/src/hooks/usePremium.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface PremiumStatus {
  tier: 'none' | 'basic' | 'gold' | 'platinum' | 'vip';
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  daysRemaining: number;
  autoRenew: boolean;
  source?: string;
}

export function usePremium() {
  const { user, getAuthToken } = useAuth();
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPremiumStatus = useCallback(async () => {
    if (!user?.id) {
      setPremiumStatus(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`/api/user/${user.id}/premium`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch premium status');
      }

      const status = await response.json();
      setPremiumStatus(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch premium status';
      setError(message);
      console.error('Failed to fetch premium status:', err);
      setPremiumStatus(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, getAuthToken]);

  useEffect(() => {
    fetchPremiumStatus();
  }, [fetchPremiumStatus]);

  const refetch = () => {
    setLoading(true);
    return fetchPremiumStatus();
  };

  const hasPremium = premiumStatus?.isActive || false;
  const tier = premiumStatus?.tier || 'none';
  const daysRemaining = premiumStatus?.daysRemaining || 0;
  const isExpiringSoon = hasPremium && daysRemaining <= 7;

  return {
    premiumStatus,
    hasPremium,
    tier,
    daysRemaining,
    isExpiringSoon,
    loading,
    refetch,
    error,
    refresh: fetchPremiumStatus
  };
}