import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Wallet, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  username: string;
  displayName: string;
  balance: number;
  isAdmin: boolean;
}

interface HeaderProps {
  user: User;
  onPremiumClick: () => void;
  onBalanceClick: () => void;
  onProfileClick: () => void;
  onRefreshUser: () => Promise<void>;
  isRefreshing: boolean;
}

export default function Header({ 
  user, 
  onPremiumClick, 
  onBalanceClick, 
  onProfileClick, 
  onRefreshUser, 
  isRefreshing 
}: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold font-gaming">ContestGG</span>
          
          {/* Premium Button */}
          <Button
            onClick={onPremiumClick}
            className="ml-6 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover: text-black font-gaming font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0"
            size="sm"
            data-testid="button-premium"
          >
            <Crown className="h-4 w-4 mr-2" />
            Премиум
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* Clickable Balance */}
            <button
              onClick={onBalanceClick}
              className="flex items-center gap-2 hover:bg-muted/50 rounded-lg px-3 py-1 transition-colors duration-200 group"
              title="Открыть баланс"
              data-testid="button-balance"
            >
              <Badge variant="secondary" className="font-gaming group-hover:bg-primary/10 transition-colors">
                Баланс: {user.balance} ₽
              </Badge>
              <Wallet className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
            
            {/* Refresh Balance Button */}
            <Button
              onClick={onRefreshUser}
              disabled={isRefreshing}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              title="Обновить баланс"
            >
              <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
            </Button>
          </div>
          
          <span className="text-sm text-muted-foreground">
            Привет, {user.displayName}!
          </span>

          {user.isAdmin && (
            <Button
              variant="outline"
              onClick={() => window.location.href = "/admin"}
              className="font-gaming"
              data-testid="button-admin"
            >
              Панель админа
            </Button>
          )}
          
          <button 
            onClick={onProfileClick}
            className="w-8 h-8 rounded-full bg-primary hover:scale-110 transition-transform duration-200 hover-elevate"
            data-testid="button-profile"
          >
            <span className="sr-only">Открыть профиль</span>
          </button>
        </div>
      </div>
    </header>
  );
}