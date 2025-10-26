import { Button } from "@/components/ui/button";
import { Crown, X, ExternalLink, Check } from "lucide-react";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPremiumTier?: 'none' | 'basic' | 'gold' | 'platinum' | 'vip';
  daysRemaining?: number;
}

export default function PremiumModal({ isOpen, onClose, userPremiumTier = 'none', daysRemaining }: PremiumModalProps) {
  if (!isOpen) return null;

  const hasPremium = userPremiumTier !== 'none';
  const isExpiringSoon = hasPremium && daysRemaining !== undefined && daysRemaining <= 7;

  const features = [
    { 
      text: "🏆 Закрытые турниры", 
      borderClass: "border-yellow-500/20",
      bgClass: "bg-gradient-to-r from-yellow-500/10 to-yellow-600/10",
      dotClass: "bg-yellow-500 shadow-yellow-500/50"
    },
    { 
      text: "💰 +10% к обмену золота", 
      borderClass: "border-green-500/20",
      bgClass: "bg-gradient-to-r from-green-500/10 to-green-600/10",
      dotClass: "bg-green-500 shadow-green-500/50"
    },
    { 
      text: "🎯 Пропуск квалификаций", 
      borderClass: "border-purple-500/20",
      bgClass: "bg-gradient-to-r from-purple-500/10 to-purple-600/10",
      dotClass: "bg-purple-500 shadow-purple-500/50"
    },
    { 
      text: "🚀 Ранний доступ", 
      borderClass: "border-blue-500/20",
      bgClass: "bg-gradient-to-r from-blue-500/10 to-blue-600/10",
      dotClass: "bg-blue-500 shadow-blue-500/50"
    },
    { 
      text: "👑 VIP статус и чат", 
      borderClass: "border-orange-500/20",
      bgClass: "bg-gradient-to-r from-orange-500/10 to-orange-600/10",
      dotClass: "bg-orange-500 shadow-orange-500/50"
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-card via-card to-card/95 shadow-2xl shadow-yellow-500/10 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-yellow-500/30 bg-gradient-to-r from-yellow-400/10 via-yellow-500/15 to-yellow-600/10">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-lg">
                <Crown className="h-6 w-6 text-black" />
              </div>
              <div>
                <h2 className="font-gaming bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-2xl font-bold text-transparent">
                  {hasPremium ? 'Управление подпиской' : 'Премиум подписка'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {hasPremium 
                    ? isExpiringSoon 
                      ? `⚠️ Истекает через ${daysRemaining} ${daysRemaining === 1 ? 'день' : daysRemaining! < 5 ? 'дня' : 'дней'}`
                      : 'Активна'
                    : 'Раскрой полный потенциал заработка'
                  }
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-9 w-9 rounded-full p-0 hover:bg-muted"
              data-testid="button-close-premium"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {hasPremium && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-600">У вас активная подписка!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Ваша {userPremiumTier} подписка активна. Продлите её, чтобы не потерять преимущества.
              </p>
            </div>
          )}

          {/* Comparison */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Free */}
            <div className="space-y-3">
              <h3 className="pb-2 text-center font-semibold text-foreground">
                Бесплатно
              </h3>
              {[
                "Базовый заработок золота",
                "Призовые лобби",
                "Еженедельные ивенты",
                "Обычные турниры",
                "Публичные лидерборды",
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-slate-500/20 bg-gradient-to-r from-slate-500/10 to-slate-600/10 p-3"
                >
                  <div className="h-2 w-2 rounded-full bg-slate-500 shadow-lg shadow-slate-500/50"></div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            {/* Premium */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 pb-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                <h3 className="bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-center font-semibold text-transparent">
                  Premium
                </h3>
              </div>
              {features.map((feature, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg border ${feature.borderClass} ${feature.bgClass} p-3`}
                >
                  <div
                    className={`h-2 w-2 rounded-full ${feature.dotClass} shadow-lg`}
                  ></div>
                  <span className="text-sm font-medium text-foreground">
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-400/15 to-yellow-600/15 p-4 text-center">
            <div className="mb-1 font-gaming bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-3xl font-bold text-transparent">
              430₽
            </div>
            <div className="text-sm text-muted-foreground">в месяц</div>
          </div>

          {/* Buttons */}
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                {hasPremium ? 'Продлите подписку:' : 'Выберите платформу для подписки:'}
              </h4>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <a
                href="https://boosty.to/cistournaments"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button
                  className="group w-full bg-gradient-to-r from-orange-500 to-orange-600 py-3 font-gaming text-white transition-all duration-300 hover:scale-[1.02] hover:from-orange-600 hover:to-orange-700"
                  data-testid="button-boosty"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    Boosty <ExternalLink className="h-3 w-3 transition-transform group-hover:scale-110" />
                  </span>
                </Button>
              </a>
              <a
                href="https://patreon.com/cistournaments"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button
                  className="group w-full bg-gradient-to-r from-blue-600 to-red-500 py-3 font-gaming text-white transition-all duration-300 hover:scale-[1.02] hover:from-blue-700 hover:to-red-600"
                  data-testid="button-patreon"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    Patreon <ExternalLink className="h-3 w-3 transition-transform group-hover:scale-110" />
                  </span>
                </Button>
              </a>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            После оплаты привяжите свой Discord к сайту и дождитесь автоматической выдачи Premium. Если статус не выдан, убедитесь в наличии роли Премиум в Discord сервере ContestGG и нажмите кнопку перепроверки в профиле на сайте.
          </p>
        </div>
      </div>
    </div>
  );
}