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
  Loader2
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
  });
  const [loadingStats, setLoadingStats] = useState(false);
  
  const [linkedTelegram, setLinkedTelegram] = useState<string | null>(null);
  const [linkedDiscord, setLinkedDiscord] = useState<string | null>(null);
  
  const [isLinkingTelegram, setIsLinkingTelegram] = useState(false);
  const [isLinkingDiscord, setIsLinkingDiscord] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    setLinkedTelegram(user.telegramUsername || null);
    setLinkedDiscord(user.discordUsername || null);
    
    const fetchData = async () => {
      try {
        const t = getAuthToken();

        setLoadingStats(true);
        const statsRes = await fetch(`/api/user/${user.id}/stats`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        const statsData = await statsRes.json();
        setStats(statsData);
        setLoadingStats(false);

        const telegramRes = await fetch(`/api/user/${user.id}/telegram`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        const telegramData = await telegramRes.json();
        if (!telegramData.error) {
          setLinkedTelegram(telegramData.telegramUsername || null);
        }

        const discordRes = await fetch(`/api/user/${user.id}/discord`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        const discordData = await discordRes.json();
        if (!discordData.error) {
          setLinkedDiscord(discordData.discordUsername || null);
        }
      } catch (err) {
        console.error(err);
        setLoadingStats(false);
      }
    };
    fetchData();
  }, [user?.id, user?.telegramUsername, user?.discordUsername, getAuthToken]);

  // Handle Telegram OAuth linking
  const handleLinkTelegram = async () => {
    if (!user) return;
    setIsLinkingTelegram(true);
    
    try {
      const t = getAuthToken();
      if (!t) throw new Error("No auth token");

      // Open Telegram Widget in popup
      const width = 600;
      const height = 600;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      
      const popup = window.open(
        '',
        'telegram_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      // Get bot info for Login Widget
      const initRes = await fetch('/api/auth/telegram/login', {
        headers: { Authorization: `Bearer ${t}` }
      });
      
      if (!initRes.ok) throw new Error("Failed to initialize Telegram login");
      
      const { botUsername } = await initRes.json();
      
      // Create Telegram Login Widget HTML
      popup.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Telegram Account</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              background: rgba(255,255,255,0.1);
              padding: 2rem;
              border-radius: 1rem;
              backdrop-filter: blur(10px);
            }
            h1 { margin-bottom: 1rem; }
            p { margin-bottom: 2rem; opacity: 0.9; }
          </style>
          <script async src="https://telegram.org/js/telegram-widget.js?22"></script>
        </head>
        <body>
          <div class="container">
            <h1>🔗 Link Telegram Account</h1>
            <p>Click the button below to authenticate with Telegram</p>
            <script>
              function onTelegramAuth(user) {
                window.opener.postMessage({ type: 'telegram_auth', data: user }, '*');
                window.close();
              }
            </script>
            <script async
              src="https://telegram.org/js/telegram-widget.js?22"
              data-telegram-login="${botUsername}"
              data-size="large"
              data-onauth="onTelegramAuth(user)"
              data-request-access="write">
            </script>
          </div>
        </body>
        </html>
      `);

      // Listen for message from popup
      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'telegram_auth') {
          try {
            const res = await fetch('/api/auth/telegram/callback', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${t}`
              },
              body: JSON.stringify(event.data.data)
            });
            
            if (!res.ok) {
              const error = await res.json();
              throw new Error(error.error || "Failed to link Telegram");
            }
            
            const data = await res.json();
            setLinkedTelegram(data.telegramUsername);
            await refreshProfile();
            
            toast({
              title: "✅ Success",
              description: "Telegram account linked successfully",
            });
          } catch (err: any) {
            console.error(err);
            toast({
              title: "❌ Error",
              description: err.message,
              variant: "destructive"
            });
          } finally {
            setIsLinkingTelegram(false);
            window.removeEventListener('message', handleMessage);
          }
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Cleanup if popup is closed without auth
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsLinkingTelegram(false);
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);
      
    } catch (err: any) {
      console.error(err);
      toast({
        title: "❌ Error",
        description: err.message,
        variant: "destructive"
      });
      setIsLinkingTelegram(false);
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
        title: "✅ Unlinked",
        description: "Telegram account unlinked",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "❌ Error",
        description: "Failed to unlink Telegram",
        variant: "destructive"
      });
    }
  };

  // Handle Discord OAuth linking
  const handleLinkDiscord = async () => {
    if (!user) return;
    setIsLinkingDiscord(true);
    
    try {
      const t = getAuthToken();
      if (!t) throw new Error("No auth token");

      const res = await fetch('/api/auth/discord/login', {
        headers: { Authorization: `Bearer ${t}` }
      });
      
      if (!res.ok) throw new Error("Failed to initialize Discord login");
      
      const { authUrl } = await res.json();
      
      // Open Discord OAuth in popup
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
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      // Poll for popup closure and check if linked
      const checkInterval = setInterval(async () => {
        if (popup.closed) {
          clearInterval(checkInterval);
          setIsLinkingDiscord(false);
          
          // Refresh user data to check if Discord was linked
          await refreshProfile();
          const updatedUser = await fetch(`/api/user/${user.id}/discord`, {
            headers: { Authorization: `Bearer ${t}` }
          }).then(r => r.json());
          
          if (updatedUser.discordUsername) {
            setLinkedDiscord(updatedUser.discordUsername);
            toast({
              title: "✅ Success",
              description: "Discord account linked successfully",
            });
          }
        }
      }, 1000);
      
    } catch (err: any) {
      console.error(err);
      toast({
        title: "❌ Error",
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
        title: "✅ Unlinked",
        description: "Discord account unlinked",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "❌ Error",
        description: "Failed to unlink Discord",
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

        <div className="relative overflow-y-auto max-h-[calc(90vh-180px)] p-6 pb-8 space-y-6 -mt-[20px]">
          
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

          <div className="grid grid-cols-2 gap-3">
            <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-green-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/5">
              <div className="absolute top-0 right-0 h-16 w-16 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-colors" />
              <Trophy className="h-5 w-5 text-green-600 mb-2" />
              <div className="text-2xl font-bold tabular-nums mb-1">{loadingStats ? "..." : stats.approvedSubmissions}</div>
              <div className="text-xs text-muted-foreground">Одобрено</div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-yellow-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/5">
              <div className="absolute top-0 right-0 h-16 w-16 bg-yellow-500/5 rounded-full blur-2xl group-hover:bg-yellow-500/10 transition-colors" />
              <Clock className="h-5 w-5 text-yellow-600 mb-2" />
              <div className="text-2xl font-bold tabular-nums mb-1">{loadingStats ? "..." : stats.pendingSubmissions}</div>
              <div className="text-xs text-muted-foreground">Ожидают</div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
              <Target className="h-5 w-5 text-blue-600 mb-2" />
              <div className="text-2xl font-bold tabular-nums mb-1">{loadingStats ? "..." : stats.totalSubmissions}</div>
              <div className="text-xs text-muted-foreground">Всего</div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5">
              <div className="absolute top-0 right-0 h-16 w-16 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
              <Wallet className="h-5 w-5 text-purple-600 mb-2" />
              <div className="text-2xl font-bold tabular-nums mb-1">{loadingStats ? "..." : stats.totalEarnings}</div>
              <div className="text-xs text-muted-foreground">Заработано</div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Telegram OAuth */}
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

          <Button 
            variant="outline" 
            className="w-full h-11 rounded-xl border-border/50 hover:bg-red-500/5 hover:border-red-500/30 hover:text-red-600 transition-all -mt-[20px]" 
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