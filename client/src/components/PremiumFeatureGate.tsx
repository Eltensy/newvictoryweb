import { ReactNode } from 'react';
import { usePremiumBenefits } from '@/hooks/usePremiumBenefits';
import { Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PremiumFeatureGateProps {
  children: ReactNode;
  requiredTier?: 'basic' | 'gold' | 'platinum' | 'vip';
  fallback?: ReactNode;
  showUpgrade?: boolean;
  onUpgradeClick?: () => void;
  feature?: string;
}

export function PremiumFeatureGate({
  children,
  requiredTier = 'basic',
  fallback,
  showUpgrade = true,
  onUpgradeClick,
  feature = 'эта функция'
}: PremiumFeatureGateProps) {
  const benefits = usePremiumBenefits();

  const tierLevels = {
    none: 0,
    basic: 1,
    gold: 2,
    platinum: 3,
    vip: 4
  };

  const hasAccess = tierLevels[benefits.tier] >= tierLevels[requiredTier];

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgrade) {
    return null;
  }

  return (
    <div className="p-6 rounded-xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-full bg-yellow-500/20">
          <Lock className="h-6 w-6 text-yellow-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-600" />
            Premium функция
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Для доступа к {feature} необходима подписка уровня {requiredTier} или выше
          </p>
          <Button
            onClick={onUpgradeClick}
            className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-semibold"
          >
            <Crown className="h-4 w-4 mr-2" />
            Получить Premium
          </Button>
        </div>
      </div>
    </div>
  );
}