import { Button } from "@/components/ui/button";
import { Crown, X, ExternalLink } from "lucide-react";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-card via-card to-card/95 rounded-2xl border border-yellow-500/20 shadow-2xl shadow-yellow-500/10 max-w-2xl w-full animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-yellow-400/10 via-yellow-500/15 to-yellow-600/10 border-b border-yellow-500/30">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
                <Crown className="h-6 w-6 text-black" />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-gaming bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                  Премиум подписка
                </h2>
                <p className="text-sm text-muted-foreground">Раскрой полный потенциал заработка</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="hover:bg-muted rounded-full w-9 h-9 p-0"
              data-testid="button-close-premium"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Two Column Comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Features */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground text-center pb-2">Бесплатно</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-500/10 to-slate-600/10 rounded-lg border border-slate-500/20">
                  <div className="w-2 h-2 rounded-full bg-slate-500 shadow-lg shadow-slate-500/50"></div>
                  <span className="text-sm font-medium text-muted-foreground">Базовый заработок золота</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-500/10 to-slate-600/10 rounded-lg border border-slate-500/20">
                  <div className="w-2 h-2 rounded-full bg-slate-500 shadow-lg shadow-slate-500/50"></div>
                  <span className="text-sm font-medium text-muted-foreground">Призовые лобби</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-500/10 to-slate-600/10 rounded-lg border border-slate-500/20">
                  <div className="w-2 h-2 rounded-full bg-slate-500 shadow-lg shadow-slate-500/50"></div>
                  <span className="text-sm font-medium text-muted-foreground">Еженедельные ивенты</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-500/10 to-slate-600/10 rounded-lg border border-slate-500/20">
                  <div className="w-2 h-2 rounded-full bg-slate-500 shadow-lg shadow-slate-500/50"></div>
                  <span className="text-sm font-medium text-muted-foreground">Обычные турниры</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-500/10 to-slate-600/10 rounded-lg border border-slate-500/20">
                  <div className="w-2 h-2 rounded-full bg-slate-500 shadow-lg shadow-slate-500/50"></div>
                  <span className="text-sm font-medium text-muted-foreground">Публичные лидерборды</span>
                </div>
              </div>
            </div>

            {/* Premium Features */}
            <div className="space-y-3 relative">
              <div className="relative">
                <div className="flex items-center justify-center gap-2 pb-2 mb-3">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <h3 className="font-semibold bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent text-center">
                    Premium
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 rounded-lg border border-yellow-500/20">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 shado    w-lg shadow-yellow-500/50"></div>
                    <span className="text-sm font-medium text-foreground">🏆 Закрытые турниры</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-lg border border-green-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
                    <span className="text-sm font-medium text-foreground">💰 +10% к обмену золота</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-500/10 to-purple-600/10 rounded-lg border border-purple-500/20">
                    <div className="w-2 h-2 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50"></div>
                    <span className="text-sm font-medium text-foreground">🎯 Пропуск квалификаций</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-lg border border-blue-500/20">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></div>
                    <span className="text-sm font-medium text-foreground">🚀 Ранний доступ</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-500/10 to-orange-600/10 rounded-lg border border-orange-500/20">
                    <div className="w-2 h-2 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50"></div>
                    <span className="text-sm font-medium text-foreground">👑 VIP статус и чат</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="text-center p-4 bg-gradient-to-r from-yellow-400/15 to-yellow-600/15 rounded-xl border border-yellow-500/30">
            <div className="text-3xl font-bold font-gaming bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-1">
              430₽
            </div>
            <div className="text-sm text-muted-foreground">в месяц</div>
          </div>

          {/* Platform Buttons */}
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Выберите платформу для подписки:</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <a
                href="https://boosty.to/cistournaments"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button 
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-gaming group transition-all duration-300 hover:scale-[1.02] py-3"
                  data-testid="button-boosty"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Boosty</span>
                    <ExternalLink className="h-3 w-3 group-hover:scale-110 transition-transform" />
                  </div>
                </Button>
              </a>

              <a
                href="https://patreon.com/cistournaments"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-red-500 hover:from-blue-700 hover:to-red-600 text-white font-gaming group transition-all duration-300 hover:scale-[1.02] py-3"
                  data-testid="button-patreon"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Patreon</span>
                    <ExternalLink className="h-3 w-3 group-hover:scale-110 transition-transform" />
                  </div>
                </Button>
              </a>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground text-center">
            Premium статус активируется автоматически в течение 5 минут после оплаты
          </p>
        </div>
      </div>
    </div>
  );
}