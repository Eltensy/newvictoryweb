import { Crown, Star, Gem, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumBadgeProps {
  tier: 'none' | 'basic' | 'gold' | 'platinum' | 'vip';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export default function PremiumBadge({ tier, size = 'md', showLabel = false, className }: PremiumBadgeProps) {
  if (tier === 'none') return null;

  const configs = {
    basic: {
      icon: Crown,
      label: 'Premium',
      colors: 'from-blue-400 to-blue-600 text-white',
      bgGlow: 'shadow-blue-500/50',
      iconColor: 'text-white'
    },
    gold: {
      icon: Star,
      label: 'Gold',
      colors: 'from-yellow-400 to-yellow-600 text-black',
      bgGlow: 'shadow-yellow-500/50',
      iconColor: 'text-black'
    },
    platinum: {
      icon: Gem,
      label: 'Platinum',
      colors: 'from-purple-400 to-purple-600 text-white',
      bgGlow: 'shadow-purple-500/50',
      iconColor: 'text-white'
    },
    vip: {
      icon: Zap,
      label: 'VIP',
      colors: 'from-red-500 to-pink-600 text-white',
      bgGlow: 'shadow-red-500/50',
      iconColor: 'text-white'
    }
  };

  const config = configs[tier];
  const Icon = config.icon;

  const sizes = {
    sm: {
      badge: 'h-5 px-1.5 gap-1',
      icon: 'h-3 w-3',
      text: 'text-[10px]'
    },
    md: {
      badge: 'h-6 px-2 gap-1.5',
      icon: 'h-3.5 w-3.5',
      text: 'text-xs'
    },
    lg: {
      badge: 'h-8 px-3 gap-2',
      icon: 'h-4 w-4',
      text: 'text-sm'
    }
  };

  const sizeConfig = sizes[size];

  return (
    <div 
      className={cn(
        'inline-flex items-center rounded-full bg-gradient-to-r font-bold shadow-lg',
        config.colors,
        config.bgGlow,
        sizeConfig.badge,
        'animate-in fade-in duration-300',
        className
      )}
    >
      <Icon className={cn(sizeConfig.icon, config.iconColor)} />
      {showLabel && (
        <span className={sizeConfig.text}>{config.label}</span>
      )}
    </div>
  );
}

interface PremiumUsernameProps {
  username: string;
  displayName: string;
  tier: 'none' | 'basic' | 'gold' | 'platinum' | 'vip';
  showBadge?: boolean;
  className?: string;
}

export function PremiumUsername({ username, displayName, tier, showBadge = true, className }: PremiumUsernameProps) {
  const premiumStyles = {
    none: '',
    basic: 'bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent font-semibold',
    gold: 'bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent font-bold',
    platinum: 'bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent font-bold',
    vip: 'bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent font-bold'
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className={tier !== 'none' ? premiumStyles[tier] : ''}>
        {displayName}
      </span>
      {showBadge && tier !== 'none' && (
        <PremiumBadge tier={tier} size="sm" />
      )}
    </div>
  );
}

interface PremiumStatusCardProps {
  tier: 'none' | 'basic' | 'gold' | 'platinum' | 'vip';
  startDate?: Date | string;
  endDate?: Date | string;
  daysRemaining?: number;
  isActive: boolean;
}

export function PremiumStatusCard({ tier, startDate, endDate, daysRemaining, isActive }: PremiumStatusCardProps) {
  if (tier === 'none' || !isActive) {
    return (
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <div className="text-sm text-muted-foreground text-center">
          У вас нет активной премиум подписки
        </div>
      </div>
    );
  }

  const configs = {
    basic: {
      gradient: 'from-blue-500/10 to-blue-600/10',
      border: 'border-blue-500/20',
      icon: Crown
    },
    gold: {
      gradient: 'from-yellow-500/10 to-yellow-600/10',
      border: 'border-yellow-500/20',
      icon: Star
    },
    platinum: {
      gradient: 'from-purple-500/10 to-purple-600/10',
      border: 'border-purple-500/20',
      icon: Gem
    },
    vip: {
      gradient: 'from-red-500/10 to-pink-600/10',
      border: 'border-red-500/20',
      icon: Zap
    }
  };

  const config = configs[tier];
  const Icon = config.icon;

  const expirationWarning = daysRemaining !== undefined && daysRemaining <= 7;

  return (
    <div className={cn(
      'p-4 rounded-lg border bg-gradient-to-br',
      config.gradient,
      config.border
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <span className="font-bold font-gaming">Premium подписка</span>
        </div>
        <PremiumBadge tier={tier} showLabel />
      </div>

      <div className="space-y-2 text-sm">
        {startDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Начало:</span>
            <span className="font-medium">
              {new Date(startDate).toLocaleDateString('ru-RU')}
            </span>
          </div>
        )}
        
        {endDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Окончание:</span>
            <span className={cn(
              'font-medium',
              expirationWarning && 'text-yellow-600 dark:text-yellow-400'
            )}>
              {new Date(endDate).toLocaleDateString('ru-RU')}
            </span>
          </div>
        )}
        
        {daysRemaining !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Осталось:</span>
            <span className={cn(
              'font-bold',
              expirationWarning ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
            )}>
              {daysRemaining} {daysRemaining === 1 ? 'день' : daysRemaining < 5 ? 'дня' : 'дней'}
            </span>
          </div>
        )}
      </div>

      {expirationWarning && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
            ⚠️ Скоро истечет! Продлите подписку
          </p>
        </div>
      )}
    </div>
  );
}