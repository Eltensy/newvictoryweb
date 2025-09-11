import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  User, 
  Settings, 
  LogOut, 
  Trophy, 
  Target, 
  Clock, 
  X,
  ExternalLink,
  Wallet
} from "lucide-react";
import { useAuth } from "../hooks/useAuth"; // <- твой хук

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { user, getAuthToken, logout } = useAuth();
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    approvedSubmissions: 0,
    pendingSubmissions: 0,
    totalEarnings: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState("");
  const [isLinkingTelegram, setIsLinkingTelegram] = useState(false);
  const [linkedTelegram, setLinkedTelegram] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  

  useEffect(() => {
  const fetchData = async () => {
    if (!user) return;
    try {
      const token = getAuthToken();
      setToken(token);

      // Stats
      setLoadingStats(true);
      const statsRes = await fetch(`/api/user/${user.id}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsRes.json();
      setStats(statsData);
      setLoadingStats(false);

      // Telegram
      const telegramRes = await fetch(`/api/user/${user.id}/telegram`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const telegramData = await telegramRes.json();

      if (telegramData.error) {
        setLinkedTelegram(null);
      } else {
        setLinkedTelegram(
          typeof telegramData === "string"
            ? telegramData
            : telegramData.telegramUsername || null
        );
      }
    } catch (err) {
      console.error(err);
      setLinkedTelegram(null);
      setLoadingStats(false);
    }
  };

  fetchData();
}, [user?.id]);


const handleLinkTelegram = async () => {
  if (!telegramUsername.trim() || !user) return;

  setIsLinkingTelegram(true);
  try {
    const token = getAuthToken();
    if (!token) throw new Error("No auth token");

    // видаляємо @ на початку, якщо є
    const cleanUsername = telegramUsername.trim().replace(/^@/, '');

    const response = await fetch(`/api/user/${user.id}/telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ telegramUsername: cleanUsername }) // сервер очікує поле `username`
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to link Telegram');
    }

    setLinkedTelegram(data.username || cleanUsername);
    setTelegramUsername("");
  } catch (error: any) {
    console.error('Link Telegram error:', error);
    alert(`Failed to link Telegram: ${error.message}`);
  } finally {
    setIsLinkingTelegram(false);
  }
};


  const handleLogout = async () => {
    try {
      const token = getAuthToken();
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    logout();
    onClose();
  };

  if (!isOpen || !user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-gaming flex items-center gap-2">
            <User className="h-5 w-5" />
            Профиль пользователя
          </DialogTitle>
          <DialogDescription>
            Управление аккаунтом и настройками
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-4 p-4 bg-card/50 rounded-lg border">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">
                {user.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="font-gaming font-semibold">{user.displayName}</h3>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
              {user.isAdmin && (
                <Badge variant="secondary" className="text-xs mt-1">
                  Администратор
                </Badge>
              )}
            </div>
          </div>

          {/* Balance */}
          <div className="space-y-2">
            <Label className="font-gaming">Баланс</Label>
            <div className="flex items-center gap-2 p-3 bg-gaming-success/10 rounded-lg border border-gaming-success/20">
              <Wallet className="h-5 w-5 text-gaming-success" />
              <span className="text-xl font-bold font-gaming">{user.balance} ₽</span>
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-2">
            <Label className="font-gaming">Статистика</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-card/30 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <Trophy className="h-4 w-4 text-gaming-success" />
                </div>
                <div className="text-lg font-bold font-gaming">{loadingStats ? '...' : stats.approvedSubmissions}</div>
                <div className="text-xs text-muted-foreground">Одобрено</div>
              </div>
              <div className="p-3 bg-card/30 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <Clock className="h-4 w-4 text-gaming-warning" />
                </div>
                <div className="text-lg font-bold font-gaming">{loadingStats ? '...' : stats.pendingSubmissions}</div>
                <div className="text-xs text-muted-foreground">На рассмотрении</div>
              </div>
              <div className="p-3 bg-card/30 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <Target className="h-4 w-4 text-gaming-primary" />
                </div>
                <div className="text-lg font-bold font-gaming">{loadingStats ? '...' : stats.totalSubmissions}</div>
                <div className="text-xs text-muted-foreground">Всего заявок</div>
              </div>
              <div className="p-3 bg-card/30 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <Wallet className="h-4 w-4 text-gaming-success" />
                </div>
                <div className="text-lg font-bold font-gaming">{loadingStats ? '...' : stats.totalEarnings} ₽</div>
                <div className="text-xs text-muted-foreground">Заработано</div>
              </div>
            </div>
          </div>

          {/* Telegram Integration */}
          <div className="space-y-3">
            <Label className="font-gaming">Telegram для уведомлений</Label>
            {linkedTelegram ? (
              <div className="flex items-center gap-2 p-3 bg-gaming-success/10 rounded-lg border border-gaming-success/20">
                <ExternalLink className="h-4 w-4 text-gaming-success" />
                <span className="text-sm">{linkedTelegram}</span>
                <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await fetch(`/api/user/${user.id}/telegram`, {
                    method: "DELETE",
                    headers: {
                      "Authorization": `Bearer ${token}` // тут токен користувача
                    }
                  });
                    setLinkedTelegram(null); // оновлюємо локальний стан
                  } catch (err) {
                    console.error("Failed to unlink Telegram", err);
                  }
                }}
                className="ml-auto h-6 w-6 p-0"
              >
                X
              </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="@username"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  disabled={isLinkingTelegram}
                />
                <Button
                  onClick={handleLinkTelegram}
                  disabled={!telegramUsername.trim() || isLinkingTelegram}
                  size="sm"
                  className="w-full font-gaming"
                >
                  {isLinkingTelegram ? 'Подключаем...' : 'Подключить Telegram'}
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Получай уведомления о статусе своих заявок
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" className="flex-1 font-gaming" onClick={onClose}>
              <Settings className="h-4 w-4 mr-2" />
              Закрыть
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1 font-gaming" 
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
