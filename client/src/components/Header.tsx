import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Trophy, Crown, Wallet, RefreshCw, Menu, User, LogOut } from "lucide-react";
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
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        
        {/* Левая часть */}
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          <span className="text-lg sm:text-xl font-bold font-gaming">ContestGG</span>

          {/* Premium Button — всегда видна */}
          <Button
            onClick={onPremiumClick}
            className="ml-2 sm:ml-6 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black font-gaming font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 px-2 sm:px-4"
            size="sm"
            data-testid="button-premium"
          >
            <Crown className="h-4 w-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Премиум</span>
          </Button>
        </div>

        {/* Десктоп */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* Баланс */}
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

            {/* Обновление */}
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
              onClick={() => (window.location.href = "/admin")}
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

        {/* Мобилка */}
        <div className="sm:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-4 flex flex-col gap-4">
              <div className="font-gaming text-lg mb-2">Меню</div>
              
              {/* Баланс */}
              <button
                onClick={onBalanceClick}
                className="flex items-center justify-between w-full px-3 py-2 bg-muted/50 rounded-lg hover:bg-muted transition"
              >
                <span className="font-gaming">Баланс</span>
                <span className="flex items-center gap-1">
                  {user.balance} ₽
                  <Wallet className="h-4 w-4" />
                </span>
              </button>

              {/* Обновление */}
              <Button
                onClick={onRefreshUser}
                disabled={isRefreshing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                Обновить
              </Button>

              {user.isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/admin")}
                  className="font-gaming"
                >
                  Панель админа
                </Button>
              )}

              {/* Профиль */}
              <Button
                onClick={onProfileClick}
                className="flex items-center gap-2 bg-primary text-white font-gaming"
              >
                <User className="h-4 w-4" />
                Профиль
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
