import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Trophy, 
  Crown, 
  Wallet, 
  RefreshCw, 
  Menu, 
  User, 
  Bell, 
  X, 
  MapPin,
  Clock,
  Shield,
  Home,
  CheckCircle2,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import PremiumBadge from './PremiumBadge';

interface User {
  id: string;
  username: string;
  displayName: string;
  balance: number;
  isAdmin: boolean;
  premiumTier?: 'none' | 'basic' | 'gold' | 'platinum' | 'vip';
  premiumEndDate?: Date | string;
}

interface TerritoryStats {
  currentTerritories: number;
  queueEntries: number;
  totalClaims: number;
  territoriesRevoked: number;
}

interface Notification {
  id: string;
  type: 'territory_claimed' | 'territory_lost' | 'territory_assigned' | 'territory_revoked' | 'queue_approved' | 'queue_rejected' | 'queue_expired';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  territoryId?: string;
  territory?: { name: string } | null;
}

interface HeaderProps {
  user: User;
  onPremiumClick: () => void;
  onBalanceClick: () => void;
  onProfileClick: () => void;
  onRefreshUser: () => Promise<void>;
  isRefreshing: boolean;
  onMySubmissionsClick?: () => void;
  
  territoryStats?: TerritoryStats;
  notifications?: Notification[];
  onNotificationClick?: (notificationId: string) => void;
  onMarkAllNotificationsRead?: () => void;
  showTerritoryFeatures?: boolean;
  authToken?: string;
}

export default function EnhancedHeader({ 
  user, 
  onPremiumClick, 
  onBalanceClick, 
  onProfileClick, 
  onRefreshUser, 
  isRefreshing,
  onMySubmissionsClick,
  territoryStats,
  notifications = [],
  onNotificationClick,
  onMarkAllNotificationsRead,
  showTerritoryFeatures = false,
  authToken
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'territory_claimed': 
      case 'territory_assigned': 
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'territory_lost': 
      case 'territory_revoked': 
        return <MapPin className="h-4 w-4 text-red-500" />;
      case 'queue_approved': 
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'queue_rejected': 
      case 'queue_expired': 
        return <X className="h-4 w-4 text-red-500" />;
      default: 
        return <Bell className="h-4 w-4" />;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read && authToken) {
      setLoadingNotifications(true);
      try {
        await fetch(`/api/territory/notifications/${notification.id}/read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (onNotificationClick) {
          onNotificationClick(notification.id);
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      } finally {
        setLoadingNotifications(false);
      }
    }
  };

  const handleMarkAllRead = async () => {
    if (authToken && onMarkAllNotificationsRead) {
      setLoadingNotifications(true);
      try {
        await fetch('/api/territory/notifications/read-all', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        onMarkAllNotificationsRead();
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
      } finally {
        setLoadingNotifications(false);
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Только что';
    if (diffInMinutes < 60) return `${diffInMinutes} мин назад`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ч назад`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Вчера';
    return `${diffInDays} дн назад`;
  };

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isInTournamentsSection = currentPath.includes('/tournament');
  const isInTerritorySection = currentPath.includes('/territory');
  const isInMySubmissions = currentPath.includes('/my-submissions');
  const hasSubscription = user?.premiumTier && user.premiumTier !== 'none';

  return (
    <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        
        {/* Left side - Logo & Nav */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight hidden sm:inline">ContestGG</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <Button
              onClick={() => window.location.href = '/'}
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 text-sm font-medium transition-colors",
                !isInTerritorySection && !isInTournamentsSection && !isInMySubmissions
                  ? "text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Home className="h-3.5 w-3.5 mr-1.5" />
              Загрузка
            </Button>
            
            <Button
              onClick={onMySubmissionsClick || (() => window.location.href = '/my-submissions')}
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 text-sm font-medium transition-colors",
                isInMySubmissions
                  ? "text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Мои заявки
            </Button>
            
            <Button
              onClick={() => window.location.href = '/dropmap'}
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 text-sm font-medium transition-colors",
                currentPath.includes('/dropmap') || currentPath.includes('/territory')
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MapPin className="h-3.5 w-3.5 mr-1.5" />
              Карты
            </Button>

            <Button
              onClick={() => window.location.href = '/tournaments'}
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 text-sm font-medium transition-colors",
                isInTournamentsSection
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Trophy className="h-3.5 w-3.5 mr-1.5" />
              Турниры
            </Button>
          </nav>
        </div>

        {/* Right side - Desktop */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Territory Stats - Ultra Compact */}
          {showTerritoryFeatures && territoryStats && hasSubscription && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                <Crown className="h-3.5 w-3.5 text-yellow-600" />
                <span className="text-xs font-medium tabular-nums">{territoryStats.currentTerritories}</span>
              </div>
              
              {territoryStats.queueEntries > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-medium tabular-nums text-blue-600">{territoryStats.queueEntries}</span>
                </div>
              )}
            </div>
          )}

          {/* Notifications - Minimal */}
          {showTerritoryFeatures && hasSubscription && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                disabled={loadingNotifications}
                className="relative h-8 w-8 rounded-full hover:bg-muted/80 transition-colors flex items-center justify-center group"
              >
                <Bell className={cn("h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors", loadingNotifications && "animate-pulse")} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Уведомления</h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleMarkAllRead}
                          disabled={loadingNotifications}
                          className="text-xs h-7 px-2"
                        >
                          Прочитать все
                        </Button>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(notification => (
                        <div 
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            "p-4 border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors",
                            !notification.read && 'bg-primary/5'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={cn(
                                "text-sm font-medium mb-1",
                                !notification.read ? 'text-foreground' : 'text-muted-foreground'
                              )}>
                                {notification.title}
                              </div>
                              <div className="text-xs text-muted-foreground line-clamp-2">
                                {notification.message}
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-[11px] text-muted-foreground">
                                  {formatTimeAgo(notification.createdAt)}
                                </span>
                                {notification.territory && (
                                  <span className="text-[11px] text-primary font-medium">
                                    {notification.territory.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            {!notification.read && (
                              <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0 mt-2" />
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Нет уведомлений</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Balance - Minimal */}
          <button
            onClick={onBalanceClick}
            className="h-8 px-3 rounded-full hover:bg-muted/80 transition-colors flex items-center gap-2 group"
            data-testid="button-balance"
          >
            <Wallet className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-sm font-medium tabular-nums">{user.balance.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">₽</span>
          </button>

          {/* Premium Button - Sleek */}
          <Button
            onClick={onPremiumClick}
            size="sm"
            className="h-8 px-4 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-medium shadow-sm hover:shadow-md transition-all"
            data-testid="button-premium"
          >
            <Crown className="h-3.5 w-3.5 mr-1.5" />
            Премиум
          </Button>

          {/* Refresh - Icon only */}
          <button
            onClick={onRefreshUser}
            disabled={isRefreshing}
            className="h-8 w-8 rounded-full hover:bg-muted/80 transition-colors flex items-center justify-center group"
            title="Обновить"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors", isRefreshing && "animate-spin")} />
          </button>

          {/* Admin */}
          {user.isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = "/admin")}
              className="h-8 px-3"
              data-testid="button-admin"
            >
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Admin
            </Button>
          )}

          {/* Profile Avatar */}
          <div className="relative">
            <button 
              onClick={onProfileClick}
              className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 hover:scale-105 transition-transform flex items-center justify-center relative"
              data-testid="button-profile"
            >
              <User className="h-4 w-4 text-white" />
            </button>
            {user.premiumTier && user.premiumTier !== 'none' && (
              <div className="absolute -bottom-1 -right-1 pointer-events-none">
                <PremiumBadge tier={user.premiumTier} size="sm" />
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="lg:hidden flex items-center gap-2">
          <Button
            onClick={onPremiumClick}
            size="sm"
            className="h-8 px-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-medium"
            data-testid="button-premium"
          >
            <Crown className="h-3.5 w-3.5" />
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <button className="h-8 w-8 rounded-full hover:bg-muted/80 transition-colors flex items-center justify-center relative">
                <Menu className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center">
                    {unreadCount > 9 ? '9' : unreadCount}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <div className="p-6 border-b">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    {user.premiumTier && user.premiumTier !== 'none' && (
                      <div className="absolute -bottom-1 -right-1">
                        <PremiumBadge tier={user.premiumTier} size="sm" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.displayName}</span>
                      {user.premiumTier && user.premiumTier !== 'none' && (
                        <PremiumBadge tier={user.premiumTier} size="sm" showLabel />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{user.balance.toLocaleString()} ₽</div>
                  </div>
                </div>
                
                {user.premiumTier && user.premiumTier !== 'none' && user.premiumEndDate && (
                  (() => {
                    const daysRemaining = Math.ceil((new Date(user.premiumEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    if (daysRemaining <= 7 && daysRemaining > 0) {
                      return (
                        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <p className="text-xs text-yellow-600 dark:text-yellow-400">
                            ⚠️ Premium истекает через {daysRemaining} {daysRemaining === 1 ? 'день' : daysRemaining < 5 ? 'дня' : 'дней'}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()
                )}
              </div>

              <div className="p-4 space-y-1">
                <Button
                  onClick={() => window.location.href = '/'}
                  variant={!isInTerritorySection && !isInTournamentsSection && !isInMySubmissions ? "default" : "ghost"}
                  className="w-full justify-start h-10"
                >
                  <Home className="h-4 w-4 mr-3" />
                  Загрузка
                </Button>
                
                <Button
                  onClick={onMySubmissionsClick || (() => window.location.href = '/my-submissions')}
                  variant={isInMySubmissions ? "default" : "ghost"}
                  className="w-full justify-start h-10"
                >
                  <FileText className="h-4 w-4 mr-3" />
                  Мои заявки
                </Button>
                
                <Button
                  onClick={() => window.location.href = '/dropmap'}
                  variant={currentPath.includes('/dropmap') || currentPath.includes('/territory') ? "default" : "ghost"}
                  className="w-full justify-start h-10"
                >
                  <MapPin className="h-4 w-4 mr-3" />
                  Карты
                </Button>

                <Button
                  onClick={() => window.location.href = '/tournaments'}
                  variant={isInTournamentsSection ? "default" : "ghost"}
                  className="w-full justify-start h-10"
                >
                  <Trophy className="h-4 w-4 mr-3" />
                  Турниры
                </Button>
              </div>

              {showTerritoryFeatures && territoryStats && hasSubscription && (
                <div className="p-4 border-t">
                  <div className="text-xs font-medium text-muted-foreground mb-3">Территории</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                      <Crown className="h-4 w-4 text-yellow-600 mb-2" />
                      <div className="text-lg font-semibold">{territoryStats.currentTerritories}</div>
                      <div className="text-xs text-muted-foreground">Владею</div>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <Clock className="h-4 w-4 text-blue-600 mb-2" />
                      <div className="text-lg font-semibold">{territoryStats.queueEntries}</div>
                      <div className="text-xs text-muted-foreground">Очередь</div>
                    </div>
                  </div>
                </div>
              )}

              {showTerritoryFeatures && hasSubscription && notifications.length > 0 && (
                <div className="p-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-medium text-muted-foreground">Уведомления</div>
                    {unreadCount > 0 && (
                      <span className="text-xs font-medium text-red-500">{unreadCount} новых</span>
                    )}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {notifications.slice(0, 4).map(notification => (
                      <div 
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          "p-3 rounded-xl border cursor-pointer transition-colors",
                          !notification.read ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-transparent'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium line-clamp-1">{notification.title}</div>
                            <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{notification.message}</div>
                            <div className="text-[10px] text-muted-foreground mt-1">{formatTimeAgo(notification.createdAt)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {unreadCount > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleMarkAllRead}
                      disabled={loadingNotifications}
                      className="w-full mt-3 h-8 text-xs"
                    >
                      Прочитать все
                    </Button>
                  )}
                </div>
              )}

              <div className="p-4 border-t space-y-2">
                <Button
                  onClick={onBalanceClick}
                  variant="outline"
                  className="w-full justify-between h-10"
                  data-testid="button-balance"
                >
                  <span className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Баланс
                  </span>
                  <span className="font-medium">{user.balance.toLocaleString()} ₽</span>
                </Button>

                <Button
                  onClick={onRefreshUser}
                  disabled={isRefreshing}
                  variant="outline"
                  className="w-full h-10"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
                  Обновить
                </Button>

                {user.isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = "/admin")}
                    className="w-full h-10"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Панель администратора
                  </Button>
                )}

                <Button
                  onClick={onProfileClick}
                  className="w-full h-10"
                >
                  <User className="h-4 w-4 mr-2" />
                  Профиль
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {showNotifications && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowNotifications(false)}
        />
      )}
    </header>
  );
}