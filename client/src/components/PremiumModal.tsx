import { Button } from "@/components/ui/button";
import { Crown, X, ExternalLink } from "lucide-react";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      {/* Скроллируемая карточка */}
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
                  Премиум подписка
                </h2>
                <p className="text-sm text-muted-foreground">
                  Раскрой полный потенциал заработка
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
          {/* Сравнение тарифов */}
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
              {[
                { text: "🏆 Закрытые турниры", color: "yellow" },
                { text: "💰 +10% к обмену золота", color: "green" },
                { text: "🎯 Пропуск квалификаций", color: "purple" },
                { text: "🚀 Ранний доступ", color: "blue" },
                { text: "👑 VIP статус и чат", color: "orange" },
              ].map((feature, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg border border-${feature.color}-500/20 bg-gradient-to-r from-${feature.color}-500/10 to-${feature.color}-600/10 p-3`}
                >
                  <div
                    className={`h-2 w-2 rounded-full bg-${feature.color}-500 shadow-lg shadow-${feature.color}-500/50`}
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
                Выберите платформу для подписки:
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
            Premium статус активируется автоматически в течение 5 минут после оплаты
          </p>
        </div>
      </div>
    </div>
  );
}
