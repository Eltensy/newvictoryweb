import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Crown, AlertCircle, TrendingUp, X, Award, History, RefreshCw, Check } from "lucide-react";
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [premiumHistory, setPremiumHistory] = useState<PremiumHistory[]>([]);
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
        Number(grantForm.durationDays), // Преобразуем в число
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
        <div className="flex gap-2">
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