import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  User, 
  LogOut, 
  Trophy, 
  Target, 
  Clock, 
  Wallet,
  MessageSquare,
  CheckCircle2,
  TrendingUp,
  Loader2,
  Copy,
  ExternalLink,
  X,
  Eye
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { PremiumStatusCard } from './PremiumBadge';
import { usePremium } from "@/hooks/usePremium";
import { useToast } from "@/hooks/use-toast";

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { user, getAuthToken, logout, refreshProfile } = useAuth();
  const { premiumStatus, loading: premiumLoading } = usePremium();
  const { toast } = useToast();
  
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    approvedSubmissions: 0,
    pendingSubmissions: 0,
    totalEarnings: 0,
    isAdmin: false,
    goldKills: 0,
    silverKills: 0,
    bronzeKills: 0,
    totalKills: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Kill stats state
  const [killStats, setKillStats] = useState({
    goldKills: 0,
    silverKills: 0,
    bronzeKills: 0,
    totalKills: 0,
    lastKillDate: null as Date | null,
  });
  const [loadingKills, setLoadingKills] = useState(false);
  
  const [linkedTelegram, setLinkedTelegram] = useState<string | null>(null);
  const [linkedDiscord, setLinkedDiscord] = useState<string | null>(null);
  
  const [isLinkingTelegram, setIsLinkingTelegram] = useState(false);
  const [isLinkingDiscord, setIsLinkingDiscord] = useState(false);
  
  const [telegramLinkData, setTelegramLinkData] = useState<{
    botLink: string;
    verificationCode: string;
    expiresAt: string;
  } | null>(null);
  const [isCheckingTelegramStatus, setIsCheckingTelegramStatus] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    setLinkedTelegram(user.telegramUsername || null);
    setLinkedDiscord(user.discordUsername || null);
    
    const fetchData = async () => {
      try {
        const t = getAuthToken();

        // Загружаем статистику сабмишинов
        setLoadingStats(true);
        const statsRes = await fetch(`/api/user/${user.id}/stats`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        const statsData = await statsRes.json();
        setStats(statsData);
        setLoadingStats(false);

        // Загружаем статистику киллов
        setLoadingKills(true);
        const killStatsRes = await fetch(`/api/user/${user.id}/kill-stats`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (killStatsRes.ok) {
          const killStatsData = await killStatsRes.json();
          setKillStats(killStatsData);
        }
        setLoadingKills(false);
      } catch (err) {
        console.error(err);
        setLoadingStats(false);
        setLoadingKills(false);
      }
    };
    fetchData();
  }, [user?.id, user?.telegramUsername, user?.discordUsername, getAuthToken]);

  // Telegram bot authorization flow
  const handleLinkTelegram = async () => {
    if (!user) return;
    setIsLinkingTelegram(true);
    
    try {
      const t = getAuthToken();
      if (!t) throw new Error("Нет токена авторизации");

      const initRes = await fetch('/api/auth/telegram/init', {
        headers: { Authorization: `Bearer ${t}` }
      });
      
      if (!initRes.ok) {
        const error = await initRes.json();
        throw new Error(error.error || "Не удалось инициализировать привязку");
      }
      
      const data = await initRes.json();
      setTelegramLinkData(data);
      
      setIsCheckingTelegramStatus(true);
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `/api/auth/telegram/status?verificationCode=${data.verificationCode}`,
            { headers: { Authorization: `Bearer ${t}` } }
          );
          
          if (!statusRes.ok) {
            clearInterval(pollInterval);
            setIsCheckingTelegramStatus(false);
            return;
          }
          
          const status = await statusRes.json();
          
          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setIsCheckingTelegramStatus(false);
            setIsLinkingTelegram(false);
            setTelegramLinkData(null);
            setLinkedTelegram(status.telegramUsername);
            await refreshProfile();
            
            toast({
              title: "Успешно",
              description: "Telegram аккаунт привязан",
            });
          } else if (status.status === 'expired') {
            clearInterval(pollInterval);
            setIsCheckingTelegramStatus(false);
            setIsLinkingTelegram(false);
            setTelegramLinkData(null);
            
            toast({
              title: "Время истекло",
              description: "Код верификации истек. Попробуйте снова.",
              variant: "destructive"
            });
          }
        } catch (err) {
          console.error('Status check error:', err);
        }
      }, 3000);
      
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsCheckingTelegramStatus(false);
        if (telegramLinkData) {
          setIsLinkingTelegram(false);
          setTelegramLinkData(null);
        }
      }, 5 * 60 * 1000);
      
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Ошибка",
        description: err.message,
        variant: "destructive"
      });
      setIsLinkingTelegram(false);
      setTelegramLinkData(null);
    }
  };

  const handleCancelTelegramLink = () => {
    setIsLinkingTelegram(false);
    setIsCheckingTelegramStatus(false);
    setTelegramLinkData(null);
  };

  const handleCopyCode = () => {
    if (telegramLinkData) {
      navigator.clipboard.writeText(telegramLinkData.verificationCode);
      toast({
        title: "Скопировано",
        description: "Код верификации скопирован в буфер обмена",
      });
    }
  };

  const handleUnlinkTelegram = async () => {
    try {
      const t = getAuthToken();
      await fetch(`/api/user/${user!.id}/telegram`, { 
        method: "DELETE", 
        headers: { Authorization: `Bearer ${t}` } 
      });
      setLinkedTelegram(null);
      await refreshProfile();
      
      toast({
        title: "Отвязано",
        description: "Telegram аккаунт отвязан",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Ошибка",
        description: "Не удалось отвязать Telegram",
        variant: "destructive"
      });
    }
  };

  const handleLinkDiscord = async () => {
    if (!user) return;
    setIsLinkingDiscord(true);
    
    try {
      const t = getAuthToken();
      if (!t) throw new Error("Нет токена авторизации");

      const res = await fetch('/api/auth/discord/login', {
        headers: { Authorization: `Bearer ${t}` }
      });
      
      if (!res.ok) throw new Error("Не удалось инициализировать Discord авторизацию");
      
      const { authUrl } = await res.json();
      
      const width = 500;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      
      const popup = window.open(
        authUrl,
        'discord_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!popup) {
        throw new Error("Всплывающее окно заблокировано. Разрешите всплывающие окна для этого сайта.");
      }

      const checkInterval = setInterval(async () => {
        if (popup.closed) {
          clearInterval(checkInterval);
          setIsLinkingDiscord(false);
          
          await refreshProfile();
          const updatedUser = await fetch(`/api/auth/me`, {
            headers: { Authorization: `Bearer ${t}` }
          }).then(r => r.json());
          
          if (updatedUser.discordUsername) {
            setLinkedDiscord(updatedUser.discordUsername);
            toast({
              title: "Успешно",
              description: "Discord аккаунт привязан",
            });
          }
        }
      }, 1000);
      
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Ошибка",
        description: err.message,
        variant: "destructive"
      });
      setIsLinkingDiscord(false);
    }
  };

  const handleUnlinkDiscord = async () => {
    try {
      const t = getAuthToken();
      await fetch(`/api/user/${user!.id}/discord`, { 
        method: "DELETE", 
        headers: { Authorization: `Bearer ${t}` } 
      });
      setLinkedDiscord(null);
      await refreshProfile();
      
      toast({
        title: "Отвязано",
        description: "Discord аккаунт отвязан",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Ошибка",
        description: "Не удалось отвязать Discord",
        variant: "destructive"
      });
    }
  };

  const handleLogout = async () => {
    try {
      const t = getAuthToken();
      if (t) await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${t}` } });
    } catch (err) {
      console.error(err);
    }
    logout();
    onClose();
    window.location.href = "/";
  };

  if (!isOpen || !user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-hidden rounded-3xl p-0 border-0 bg-gradient-to-b from-background to-background/95">
        
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
        
        {/* Header */}
        <div className="relative border-b border-border/50 bg-background/60 backdrop-blur-2xl">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-background" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-0.5">{user.displayName}</h2>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
              </div>
            </div>

            {/* Balance Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-500/20 p-4">
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-green-600/80 font-medium">Баланс</div>
                    <div className="text-2xl font-bold tabular-nums">{user.balance.toLocaleString()} ₽</div>
                  </div>
                </div>
                <TrendingUp className="h-6 w-6 text-green-600/40" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative overflow-y-auto max-h-[calc(90vh-220px)] p-6 space-y-6">
          
          {/* Premium Status */}
          {!premiumLoading && premiumStatus && premiumStatus.tier !== 'none' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <PremiumStatusCard
                tier={premiumStatus.tier}
                startDate={premiumStatus.startDate}
                endDate={premiumStatus.endDate}
                daysRemaining={premiumStatus.daysRemaining}
                isActive={premiumStatus.isActive}
              />
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-green-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-16 w-16 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-colors" />
              <Trophy className="h-5 w-5 text-green-600 mb-2" />
              <div className="text-2xl font-bold tabular-nums mb-1">{loadingStats ? "..." : stats.approvedSubmissions}</div>
              <div className="text-xs text-muted-foreground">Одобрено</div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-yellow-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-16 w-16 bg-yellow-500/5 rounded-full blur-2xl group-hover:bg-yellow-500/10 transition-colors" />
              <Clock className="h-5 w-5 text-yellow-600 mb-2" />
              <div className="text-2xl font-bold tabular-nums mb-1">{loadingStats ? "..." : stats.pendingSubmissions}</div>
              <div className="text-xs text-muted-foreground">Ожидают</div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-blue-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
              <Target className="h-5 w-5 text-blue-600 mb-2" />
              <div className="text-2xl font-bold tabular-nums mb-1">{loadingStats ? "..." : stats.totalSubmissions}</div>
              <div className="text-xs text-muted-foreground">Всего</div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-purple-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-16 w-16 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
              <Wallet className="h-5 w-5 text-purple-600 mb-2" />
              <div className="text-2xl font-bold tabular-nums mb-1">{loadingStats ? "..." : stats.totalEarnings}</div>
              <div className="text-xs text-muted-foreground">Заработано</div>
            </div>
          </div>

          {/* Kill Stats Section */}
          {!loadingKills && killStats.totalKills > 0 && (
            <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-sm font-medium text-muted-foreground">Статистика киллов</h3>
              
              {/* Total Kills Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 border border-yellow-500/20 p-4">
                <div className="absolute top-0 right-0 h-32 w-32 bg-yellow-500/10 rounded-full blur-3xl" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <div className="text-xs text-yellow-600/80 font-medium">Всего киллов</div>
                      <div className="text-3xl font-bold tabular-nums">{killStats.totalKills}</div>
                    </div>
                  </div>
                  {killStats.lastKillDate && (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Последний</div>
                      <div className="text-xs font-medium">
                        {new Date(killStats.lastKillDate).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Individual Kill Types */}
              <div className="grid grid-cols-3 gap-3">
                {/* Gold Kills */}
                <div className="group relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all duration-300">
                  <div className="absolute top-0 right-0 h-16 w-16 bg-yellow-500/10 rounded-full blur-2xl" />
                  <div className="relative z-10 text-center">
                    <div className="text-4xl mb-2">🥇</div>
                    <div className="text-2xl font-bold tabular-nums mb-1">{killStats.goldKills}</div>
                    <div className="text-xs text-yellow-700 font-medium">Gold Kill</div>
                  </div>
                </div>

                {/* Silver Kills */}
                <div className="group relative overflow-hidden rounded-2xl border border-gray-400/30 bg-gray-400/5 p-4 hover:border-gray-400/50 hover:bg-gray-400/10 transition-all duration-300">
                  <div className="absolute top-0 right-0 h-16 w-16 bg-gray-400/10 rounded-full blur-2xl" />
                  <div className="relative z-10 text-center">
                    <div className="text-4xl mb-2">🥈</div>
                    <div className="text-2xl font-bold tabular-nums mb-1">{killStats.silverKills}</div>
                    <div className="text-xs text-gray-700 font-medium">Silver Kill</div>
                  </div>
                </div>

                {/* Bronze Kills */}
                <div className="group relative overflow-hidden rounded-2xl border border-orange-600/30 bg-orange-600/5 p-4 hover:border-orange-600/50 hover:bg-orange-600/10 transition-all duration-300">
                  <div className="absolute top-0 right-0 h-16 w-16 bg-orange-600/10 rounded-full blur-2xl" />
                  <div className="relative z-10 text-center">
                    <div className="text-4xl mb-2">🥉</div>
                    <div className="text-2xl font-bold tabular-nums mb-1">{killStats.bronzeKills}</div>
                    <div className="text-xs text-orange-700 font-medium">Bronze Kill</div>
                  </div>
                </div>
              </div>

              {/* Kill Progress Info */}
              <div className="rounded-2xl border border-border/50 p-4 bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Как получить киллы?</p>
                    <p>Киллы выдаются автоматически при одобрении заявок категорий Gold Kill, Silver Kill и Bronze Kill. Используйте их для участия в специальных турнирах и розыгрышах!</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Social Integrations */}
          <div className="space-y-3">
            {/* Telegram Bot Link */}
            <div className="rounded-2xl border border-border/50 p-4 space-y-3 hover:border-blue-500/30 transition-colors">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Telegram</span>
              </div>
              
              {linkedTelegram ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">{linkedTelegram}</span>
                  </div>
                  <button
                    onClick={handleUnlinkTelegram}
                    className="h-7 px-3 rounded-lg hover:bg-red-500/10 text-xs text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    Отвязать
                  </button>
                </div>
              ) : telegramLinkData ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-600 font-medium">Код верификации</span>
                      <button
                        onClick={handleCancelTelegramLink}
                        className="h-6 w-6 rounded-lg hover:bg-blue-500/20 flex items-center justify-center text-blue-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 p-3 rounded-lg bg-background/50 border border-blue-500/30">
                        <div className="text-2xl font-mono font-bold text-center text-blue-700 tracking-widest">
                          {telegramLinkData.verificationCode}
                        </div>
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className="h-12 w-12 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-600 transition-colors"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>1. Откройте Telegram бот по кнопке ниже</p>
                      <p>2. Отправьте команду: <code className="px-1 py-0.5 bg-background/50 rounded">/start {telegramLinkData.verificationCode}</code></p>
                      <p>3. Дождитесь подтверждения</p>
                    </div>
                  </div>
                  
                  {isCheckingTelegramStatus && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 animate-pulse">
                      <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
                      <span className="text-xs text-yellow-700 font-medium">Ожидание подтверждения от бота...</span>
                    </div>
                  )}
                  
                  <Button
                    onClick={() => window.open(telegramLinkData.botLink, '_blank')}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Открыть Telegram бот
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleLinkTelegram}
                  disabled={isLinkingTelegram}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
                >
                  {isLinkingTelegram ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Подключение...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Привязать Telegram
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Discord OAuth */}
            <div className="rounded-2xl border border-border/50 p-4 space-y-3 hover:border-indigo-500/30 transition-colors">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-indigo-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span className="text-sm font-medium">Discord</span>
              </div>
              
              {linkedDiscord ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">{linkedDiscord}</span>
                  </div>
                  <button
                    onClick={handleUnlinkDiscord}
                    className="h-7 px-3 rounded-lg hover:bg-red-500/10 text-xs text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    Отвязать
                  </button>
                </div>
              ) : (
                <Button 
                  onClick={handleLinkDiscord}
                  disabled={isLinkingDiscord}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
                >
                  {isLinkingDiscord ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Подключение...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      Привязать Discord
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Logout Button */}
          <Button 
            variant="outline" 
            className="w-full h-11 rounded-xl border-border/50 hover:bg-red-500/5 hover:border-red-500/30 hover:text-red-600 transition-all" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Выйти из аккаунта
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}