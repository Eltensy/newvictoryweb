// client/src/components/AdminPremium.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Crown, AlertCircle, TrendingUp, X, Award, History, RefreshCw, Check, Users, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PremiumBadge from "./PremiumBadge";
import { premiumApiService, PremiumUser, PremiumHistory } from "@/services/premiumApiService";

interface GrantPremiumForm {
  userId: string;
  tier: 'basic' | 'gold' | 'platinum' | 'vip';
  durationDays: number;
  reason: string;
  source: 'admin' | 'manual' | 'boosty' | 'patreon';
}

interface AdminPremiumTabProps {
  authToken: string;
}

export default function AdminPremiumTab({ authToken }: AdminPremiumTabProps) {
  const { toast } = useToast();
  const [premiumUsers, setPremiumUsers] = useState<PremiumUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showDiscordCheckDialog, setShowDiscordCheckDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [premiumHistory, setPremiumHistory] = useState<PremiumHistory[]>([]);
  const [discordCheckUserId, setDiscordCheckUserId] = useState('');
  const [discordCheckResult, setDiscordCheckResult] = useState<any>(null);
  const [checkingDiscord, setCheckingDiscord] = useState(false);
  const [checkingAllDiscord, setCheckingAllDiscord] = useState(false);
  
  const [grantForm, setGrantForm] = useState<GrantPremiumForm>({
    userId: '',
    tier: 'basic',
    durationDays: 30,
    reason: '',
    source: 'admin'
  });

  useEffect(() => {
    fetchPremiumUsers();
  }, []);

  const fetchPremiumUsers = async () => {
    setLoading(true);
    try {
      const data = await premiumApiService.getPremiumUsers(authToken);
      setPremiumUsers(data);
    } catch (error) {
      console.error('Failed to fetch premium users:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить премиум пользователей",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPremium = async () => {
    if (!grantForm.userId || !grantForm.reason.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await premiumApiService.grantPremium(
        grantForm.userId,
        grantForm.tier,
        Number(grantForm.durationDays),
        grantForm.reason,
        grantForm.source,
        authToken
      );
      toast({
        title: "Успешно",
        description: "Premium статус выдан"
      });

      setShowGrantDialog(false);
      setGrantForm({
        userId: '',
        tier: 'basic',
        durationDays: 30,
        reason: '',
        source: 'admin'
      });
      await fetchPremiumUsers();
    } catch (error) {
      console.error('Failed to grant premium:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось выдать premium",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokePremium = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите отозвать premium статус?')) return;

    setLoading(true);
    try {
      await premiumApiService.revokePremium(userId, 'Admin revocation', authToken);

      toast({
        title: "Успешно",
        description: "Premium статус отозван"
      });

      await fetchPremiumUsers();
    } catch (error) {
      console.error('Failed to revoke premium:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отозвать premium",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShowHistory = async (userId: string) => {
    setSelectedUserId(userId);
    setShowHistoryDialog(true);
    try {
      const history = await premiumApiService.getPremiumHistory(userId, authToken);
      setPremiumHistory(history);
    } catch (error) {
      console.error('Failed to fetch history:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить историю",
        variant: "destructive"
      });
    }
  };

  const handleManualCheck = async () => {
    setLoading(true);
    try {
      const result = await premiumApiService.checkPremiumExpiration(authToken);
      toast({
        title: "Проверка завершена",
        description: `Истекло подписок: ${result.expiredCount}`
      });
      await fetchPremiumUsers();
    } catch (error) {
      console.error('Failed to check expiration:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось проверить истечение",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Проверка Discord Premium для конкретного пользователя
  const handleCheckDiscordUser = async () => {
    if (!discordCheckUserId.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите User ID",
        variant: "destructive"
      });
      return;
    }

    setCheckingDiscord(true);
    setDiscordCheckResult(null);
    
    try {
      const response = await fetch(`/api/user/${discordCheckUserId}/check-discord-premium`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check Discord premium');
      }

      const result = await response.json();
      setDiscordCheckResult(result);
      
      toast({
        title: "Проверка завершена",
        description: result.premiumActive 
          ? `✅ Premium активирован (${result.premiumTier})`
          : "❌ Premium роли не найдено",
        variant: result.premiumActive ? "default" : "destructive"
      });

      await fetchPremiumUsers();
    } catch (error) {
      console.error('Failed to check Discord premium:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось проверить Discord premium",
        variant: "destructive"
      });
    } finally {
      setCheckingDiscord(false);
    }
  };

  // 🆕 Проверка всех пользователей с Discord
  const handleCheckAllDiscordUsers = async () => {
    if (!confirm('Запустить проверку Discord Premium для всех пользователей? Это может занять несколько минут.')) {
      return;
    }

    setCheckingAllDiscord(true);
    
    try {
      const response = await fetch('/api/admin/check-all-discord-premium', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start Discord check');
      }

      const result = await response.json();
      
      toast({
        title: "Проверка запущена",
        description: result.message || "Discord Premium проверка начата в фоновом режиме",
      });

      // Обновим список через 10 секунд
      setTimeout(() => {
        fetchPremiumUsers();
      }, 10000);
      
    } catch (error) {
      console.error('Failed to check all Discord users:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось запустить проверку",
        variant: "destructive"
      });
    } finally {
      setCheckingAllDiscord(false);
    }
  };

  const stats = {
    total: premiumUsers.length,
    active: premiumUsers.filter(u => !u.isExpired).length,
    expired: premiumUsers.filter(u => u.isExpired).length,
    expiringSoon: premiumUsers.filter(u => !u.isExpired && u.daysRemaining <= 7).length
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <Crown className="h-5 w-5 text-blue-600" />
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
          <p className="text-sm text-muted-foreground">Всего Premium</p>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-2xl font-bold">{stats.active}</span>
          </div>
          <p className="text-sm text-muted-foreground">Активных</p>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <span className="text-2xl font-bold">{stats.expiringSoon}</span>
          </div>
          <p className="text-sm text-muted-foreground">Истекает скоро</p>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20">
          <div className="flex items-center justify-between mb-2">
            <X className="h-5 w-5 text-red-600" />
            <span className="text-2xl font-bold">{stats.expired}</span>
          </div>
          <p className="text-sm text-muted-foreground">Истекших</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">Premium Пользователи</h2>
        <div className="flex gap-2 flex-wrap">
          {/* 🆕 Discord Check Button */}
          <Button 
            variant="outline"
            onClick={() => setShowDiscordCheckDialog(true)}
            className="bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20"
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Проверка Discord
          </Button>

          <Button 
            variant="outline" 
            onClick={handleManualCheck}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Проверить истечение
          </Button>
          
          <Button onClick={() => setShowGrantDialog(true)}>
            <Award className="h-4 w-4 mr-2" />
            Выдать Premium
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Пользователь</th>
                <th className="text-left p-4 font-medium">Тариф</th>
                <th className="text-left p-4 font-medium">Статус</th>
                <th className="text-left p-4 font-medium">Истекает</th>
                <th className="text-left p-4 font-medium">Источник</th>
                <th className="text-right p-4 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-muted-foreground">
                    Загрузка...
                  </td>
                </tr>
              ) : premiumUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-muted-foreground">
                    Нет premium пользователей
                  </td>
                </tr>
              ) : (
                premiumUsers.map((user) => (
                  <tr key={user.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{user.displayName}</div>
                        <div className="text-sm text-muted-foreground">@{user.username}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <PremiumBadge tier={user.premiumTier} showLabel />
                    </td>
                    <td className="p-4">
                      {user.isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-600 text-xs font-medium">
                          <X className="h-3 w-3" />
                          Истек
                        </span>
                      ) : user.daysRemaining <= 7 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-600 text-xs font-medium">
                          <AlertCircle className="h-3 w-3" />
                          Скоро истечет
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                          <Check className="h-3 w-3" />
                          Активен
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="text-sm">{new Date(user.premiumEndDate).toLocaleDateString('ru-RU')}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.daysRemaining} {user.daysRemaining === 1 ? 'день' : user.daysRemaining < 5 ? 'дня' : 'дней'}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm capitalize">{user.premiumSource || 'unknown'}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShowHistory(user.id)}
                        >
                          <History className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokePremium(user.id)}
                          disabled={loading}
                        >
                          Отозвать
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🆕 Discord Check Dialog */}
      <Dialog open={showDiscordCheckDialog} onOpenChange={setShowDiscordCheckDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg className="h-6 w-6 text-indigo-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Проверка Discord Premium
            </DialogTitle>
            <DialogDescription>
              Проверка роли Premium на Discord сервере и синхронизация с сайтом
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Check All Users */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Проверить всех пользователей</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Запускает проверку Discord ролей для всех пользователей с привязанным Discord аккаунтом. 
                    Процесс выполняется в фоновом режиме.
                  </p>
                  <Button
                    onClick={handleCheckAllDiscordUsers}
                    disabled={checkingAllDiscord}
                    className="w-full"
                  >
                    {checkingAllDiscord ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Проверка запущена...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Проверить всех
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">или</span>
              </div>
            </div>

            {/* Check Single User */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="discord-check-user">Проверить конкретного пользователя</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="discord-check-user"
                    value={discordCheckUserId}
                    onChange={(e) => setDiscordCheckUserId(e.target.value)}
                    placeholder="User ID (UUID)"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCheckDiscordUser}
                    disabled={checkingDiscord || !discordCheckUserId.trim()}
                  >
                    {checkingDiscord ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Проверить
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Введите User ID пользователя для проверки его Discord роли
                </p>
              </div>

              {/* Check Result */}
              {discordCheckResult && (
                <div className={`p-4 rounded-lg border ${
                  discordCheckResult.premiumActive 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    {discordCheckResult.premiumActive ? (
                      <>
                        <Check className="h-5 w-5 text-green-600" />
                        Premium активирован
                      </>
                    ) : (
                      <>
                        <X className="h-5 w-5 text-red-600" />
                        Premium роли нет
                      </>
                    )}
                  </h4>
                  <div className="space-y-2 text-sm">
                    {discordCheckResult.user && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Пользователь:</span>
                          <span>{discordCheckResult.user.username}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Discord ID:</span>
                          <span className="font-mono text-xs">{discordCheckResult.user.discordId}</span>
                        </div>
                      </>
                    )}
                    {discordCheckResult.check && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Роль на сервере:</span>
                          <span>{discordCheckResult.check.hasDiscordRole ? '✅ Есть' : '❌ Нет'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Premium на сайте:</span>
                          <span>
                            {discordCheckResult.check.premiumTier !== 'none' 
                              ? `✅ ${discordCheckResult.check.premiumTier}` 
                              : '❌ Нет'}
                          </span>
                        </div>
                        {discordCheckResult.check.premiumEndDate && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Истекает:</span>
                            <span>{new Date(discordCheckResult.check.premiumEndDate).toLocaleDateString('ru-RU')}</span>
                          </div>
                        )}
                        {discordCheckResult.check.premiumSource && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Источник:</span>
                            <span className="capitalize">{discordCheckResult.check.premiumSource}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grant Premium Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Выдать Premium Статус</DialogTitle>
            <DialogDescription>
              Выдайте или продлите premium подписку пользователю
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>User ID *</Label>
              <Input
                value={grantForm.userId}
                onChange={(e) => setGrantForm({ ...grantForm, userId: e.target.value })}
                placeholder="UUID пользователя"
              />
            </div>

            <div>
              <Label>Тариф *</Label>
              <Select
                value={grantForm.tier}
                onValueChange={(value: any) => setGrantForm({ ...grantForm, tier: value })}
                >
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="basic">Basic Premium</SelectItem>
                    <SelectItem value="gold" disabled>Gold Premium (Скоро)</SelectItem>
                    <SelectItem value="platinum" disabled>Platinum Premium (Скоро)</SelectItem>
                    <SelectItem value="vip" disabled>VIP Premium (Скоро)</SelectItem>
                </SelectContent>
                </Select>
            </div>

            <div>
              <Label>Длительность (дней) *</Label>
              <Input
                type="number"
                min={1}
                max={3650}
                value={grantForm.durationDays}
                onChange={(e) => setGrantForm({ ...grantForm, durationDays: parseInt(e.target.value) || 30 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                От 1 до 3650 дней (10 лет)
              </p>
            </div>

            <div>
              <Label>Источник *</Label>
              <Select
                value={grantForm.source}
                onValueChange={(value: any) => setGrantForm({ ...grantForm, source: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin Grant</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="boosty">Boosty</SelectItem>
                  <SelectItem value="patreon">Patreon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Причина *</Label>
              <Textarea
                value={grantForm.reason}
                onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
                placeholder="Укажите причину выдачи premium..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowGrantDialog(false)}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={handleGrantPremium}
                disabled={loading || !grantForm.userId || !grantForm.reason.trim()}
                className="flex-1"
              >
                Выдать Premium
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>История Premium</DialogTitle>
            <DialogDescription>
              История выдачи и продления premium подписок
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {premiumHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                История пуста
              </p>
            ) : (
              premiumHistory.map((entry) => (
                <div key={entry.id} className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-start justify-between mb-2">
                    <PremiumBadge tier={entry.tier as any} showLabel />
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Период:</span>
                      <span>{new Date(entry.startDate).toLocaleDateString('ru-RU')} - {new Date(entry.endDate).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Источник:</span>
                      <span className="capitalize">{entry.source}</span>
                    </div>
                    {entry.reason && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground">Причина: </span>
                        <span>{entry.reason}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}