// client/src/components/AdminLogsTable.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Eye, Shield, User, FileText, ExternalLink } from "lucide-react";
import { AdminAction } from "@/types/admin";
import { getActionIcon, getActionLabel, parseActionDetails } from "@/utils/adminUtils";

interface AdminLogsTableProps {
  logs: AdminAction[];
  loading: boolean;
}

export function AdminLogsTable({ logs, loading }: AdminLogsTableProps) {
  const [selectedAction, setSelectedAction] = useState<AdminAction | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [targetUserInfo, setTargetUserInfo] = useState<{ username?: string; displayName?: string } | null>(null);
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);

  const handleShowDetails = async (action: AdminAction) => {
    setSelectedAction(action);
    setShowDetailsDialog(true);
    setTargetUserInfo(null);
    
    // Загружаем информацию о целевом пользователе если targetType = 'user'
    if (action.targetType === 'user') {
      setLoadingUserInfo(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/user/${action.targetId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const userData = await response.json();
          setTargetUserInfo({
            username: userData.username,
            displayName: userData.displayName
          });
        }
      } catch (error) {
        console.error('Failed to fetch target user info:', error);
      } finally {
        setLoadingUserInfo(false);
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Загрузка логов...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-gaming">Логи действий администраторов</CardTitle>
          <CardDescription>История всех действий администраторов</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Администратор</TableHead>
                  <TableHead>Действие</TableHead>
                  <TableHead>Цель</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((action) => {
                  // Правильное определение имени администратора
                  const adminName = action.adminId === 'system' 
                    ? 'Система'
                    : action.admin?.displayName || action.admin?.username || 'Неизвестно';
                  
                  const adminUsername = action.adminId === 'system'
                    ? '@system'
                    : action.admin?.username 
                      ? `@${action.admin.username}`
                      : `ID: ${action.adminId.slice(0, 8)}...`;

                  return (
                    <TableRow key={action.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {action.adminId === 'system' ? (
                            <Shield className="h-4 w-4 text-blue-500" />
                          ) : (
                            <User className="h-4 w-4 text-purple-500" />
                          )}
                          <div>
                            <div className="font-medium">{adminName}</div>
                            <div className="text-sm text-muted-foreground">
                              {adminUsername}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(action.action)}
                          <span className="text-sm">{getActionLabel(action.action)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {action.targetType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(action.createdAt).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShowDetails(action)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {logs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Логи действий не найдены</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modern Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl p-0 border-0 bg-gradient-to-b from-background to-background/95">
          
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
          
          {/* Header */}
          <div className="relative border-b border-border/50 bg-background/60 backdrop-blur-2xl">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/20">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-0.5">Детали действия</h2>
                    <p className="text-sm text-muted-foreground">
                      Подробная информация о действии администратора
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          {selectedAction && (
            <div className="relative overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-4">
              
              {/* Admin Info Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-purple-500/30 transition-all duration-300">
                <div className="absolute top-0 right-0 h-16 w-16 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  {selectedAction.adminId === 'system' ? (
                    <Shield className="h-4 w-4 text-blue-500" />
                  ) : (
                    <User className="h-4 w-4 text-purple-500" />
                  )}
                  Администратор
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Имя:</span>
                    <span className="font-medium">
                      {selectedAction.adminId === 'system' 
                        ? 'Система'
                        : selectedAction.admin?.displayName || 'Неизвестно'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Username:</span>
                    <span className="font-mono text-sm">
                      {selectedAction.adminId === 'system'
                        ? '@system'
                        : selectedAction.admin?.username 
                          ? `@${selectedAction.admin.username}`
                          : 'Нет'}
                    </span>
                  </div>
                  {selectedAction.admin?.telegramUsername && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Telegram:</span>
                      <span className="font-mono text-sm">
                        @{selectedAction.admin.telegramUsername}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">ID:</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {selectedAction.adminId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Info Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-blue-500/30 transition-all duration-300">
                <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  {getActionIcon(selectedAction.action)}
                  Действие
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Тип:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {getActionLabel(selectedAction.action)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Цель:</span>
                    <Badge variant="outline">{selectedAction.targetType}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Target ID:</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {selectedAction.targetId.slice(0, 16)}...
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Дата:</span>
                    <span className="text-sm">
                      {new Date(selectedAction.createdAt).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Target User Info Card (если targetType = 'user') */}
              {selectedAction.targetType === 'user' && (
                <div className="group relative overflow-hidden rounded-2xl border border-green-500/30 bg-green-500/5 p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-green-600" />
                    Целевой пользователь
                  </h3>
                  {loadingUserInfo ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                      <span className="ml-2 text-sm text-muted-foreground">Загрузка...</span>
                    </div>
                  ) : targetUserInfo ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Имя:</span>
                        <span className="font-medium">{targetUserInfo.displayName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Username:</span>
                        <span className="font-mono text-sm">@{targetUserInfo.username}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">User ID:</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {selectedAction.targetId}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Не удалось загрузить информацию о пользователе
                    </div>
                  )}
                </div>
              )}

              {/* Details Card */}
              {selectedAction.details && (
                <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-orange-500/30 transition-all duration-300">
                  <div className="absolute top-0 right-0 h-16 w-16 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors" />
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-600" />
                    Детали
                  </h3>
                  <ActionDetails action={selectedAction} targetUserInfo={targetUserInfo} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Component for rendering action-specific details
function ActionDetails({ action, targetUserInfo }: { action: AdminAction; targetUserInfo: { username?: string; displayName?: string } | null }) {
  const details = parseActionDetails(action.details);

  // Approve submission
  if (action.action === 'approve_submission' && details.reward) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Вознаграждение:</span>
          <span className="text-green-600 font-semibold">{details.reward} ₽</span>
        </div>
        {details.submissionId && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Submission ID:</span>
            <span className="font-mono text-xs">{details.submissionId}</span>
          </div>
        )}
        {targetUserInfo && (
          <div className="flex justify-between pt-2 border-t border-border/50">
            <span className="text-muted-foreground">Пользователь:</span>
            <span className="font-medium">{targetUserInfo.displayName} (@{targetUserInfo.username})</span>
          </div>
        )}
      </div>
    );
  }

  // Reject submission
  if (action.action === 'reject_submission') {
    return (
      <div className="space-y-2">
        {details.rejectionReason && (
          <div>
            <span className="text-muted-foreground">Причина отклонения:</span>
            <p className="mt-1 text-sm text-destructive">{details.rejectionReason}</p>
          </div>
        )}
        {details.submissionId && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Submission ID:</span>
            <span className="font-mono text-xs">{details.submissionId}</span>
          </div>
        )}
        {targetUserInfo && (
          <div className="flex justify-between pt-2 border-t border-border/50">
            <span className="text-muted-foreground">Пользователь:</span>
            <span className="font-medium">{targetUserInfo.displayName} (@{targetUserInfo.username})</span>
          </div>
        )}
      </div>
    );
  }

  // Adjust balance
  if (action.action === 'adjust_balance') {
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Сумма:</span>
          <span className={details.amount > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
            {details.amount > 0 ? '+' : ''}{details.amount} ₽
          </span>
        </div>
        {details.newBalance !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Новый баланс:</span>
            <span className="font-semibold">{details.newBalance} ₽</span>
          </div>
        )}
        {details.reason && (
          <div>
            <span className="text-muted-foreground">Причина:</span>
            <p className="mt-1 text-sm">{details.reason}</p>
          </div>
        )}
        {targetUserInfo && (
          <div className="flex justify-between pt-2 border-t border-border/50">
            <span className="text-muted-foreground">Пользователь:</span>
            <span className="font-medium">{targetUserInfo.displayName} (@{targetUserInfo.username})</span>
          </div>
        )}
      </div>
    );
  }

  // Process withdrawal
  if (action.action === 'process_withdrawal') {
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Статус:</span>
          <Badge variant={details.status === 'completed' ? 'default' : 'destructive'}>
            {details.status}
          </Badge>
        </div>
        {details.amount && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Сумма:</span>
            <span className="font-semibold">{details.amount} ₽</span>
          </div>
        )}
        {details.userId && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">User ID:</span>
            <span className="font-mono text-xs">{details.userId}</span>
          </div>
        )}
        {details.rejectionReason && (
          <div>
            <span className="text-muted-foreground">Причина отклонения:</span>
            <p className="mt-1 text-sm text-destructive">{details.rejectionReason}</p>
          </div>
        )}
        {targetUserInfo && (
          <div className="flex justify-between pt-2 border-t border-border/50">
            <span className="text-muted-foreground">Пользователь:</span>
            <span className="font-medium">{targetUserInfo.displayName} (@{targetUserInfo.username})</span>
          </div>
        )}
      </div>
    );
  }

  // Grant/Update/Revoke Premium
  if (action.action.includes('premium')) {
    return (
      <div className="space-y-2">
        {details.tier && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Тариф:</span>
            <Badge>{details.tier}</Badge>
          </div>
        )}
        {details.durationDays && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Длительность:</span>
            <span>{details.durationDays} дней</span>
          </div>
        )}
        {details.startDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Начало:</span>
            <span>{new Date(details.startDate).toLocaleDateString('ru-RU')}</span>
          </div>
        )}
        {details.endDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Окончание:</span>
            <span>{new Date(details.endDate).toLocaleDateString('ru-RU')}</span>
          </div>
        )}
        {details.reason && (
          <div>
            <span className="text-muted-foreground">Причина:</span>
            <p className="mt-1 text-sm">{details.reason}</p>
          </div>
        )}
        {details.previousTier && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Предыдущий тариф:</span>
            <Badge variant="outline">{details.previousTier}</Badge>
          </div>
        )}
        {targetUserInfo && (
          <div className="flex justify-between pt-2 border-t border-border/50">
            <span className="text-muted-foreground">Пользователь:</span>
            <span className="font-medium">{targetUserInfo.displayName} (@{targetUserInfo.username})</span>
          </div>
        )}
      </div>
    );
  }

  // Subscription screenshot actions
  if (action.action.includes('subscription_screenshot')) {
    return (
      <div className="space-y-2">
        {details.status && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Статус:</span>
            <Badge variant={details.status === 'approved' ? 'default' : 'destructive'}>
              {details.status}
            </Badge>
          </div>
        )}
        {details.screenshotUrl && (
          <div>
            <span className="text-muted-foreground">URL скриншота:</span>
            <a 
              href={details.screenshotUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 mt-1 text-sm text-blue-600 hover:underline break-all"
            >
              Открыть скриншот
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
        {details.rejectionReason && (
          <div>
            <span className="text-muted-foreground">Причина отклонения:</span>
            <p className="mt-1 text-sm text-destructive">{details.rejectionReason}</p>
          </div>
        )}
        {details.autoApproved && (
          <Badge variant="outline" className="mt-2">Авто-одобрено</Badge>
        )}
        {targetUserInfo && (
          <div className="flex justify-between pt-2 border-t border-border/50">
            <span className="text-muted-foreground">Пользователь:</span>
            <span className="font-medium">{targetUserInfo.displayName} (@{targetUserInfo.username})</span>
          </div>
        )}
      </div>
    );
  }

  // Tournament actions
  if (action.action.includes('tournament')) {
    return (
      <div className="space-y-2">
        {details.name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Название:</span>
            <span className="font-medium">{details.name}</span>
          </div>
        )}
        {details.prize !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Приз:</span>
            <span className="font-semibold text-green-600">{details.prize} ₽</span>
          </div>
        )}
        {details.entryFee !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Взнос:</span>
            <span>{details.entryFee} ₽</span>
          </div>
        )}
        {details.refundedParticipants !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Возвраты:</span>
            <span>{details.refundedParticipants} участников</span>
          </div>
        )}
      </div>
    );
  }

  // Generic fallback - show raw JSON
  return (
    <pre className="text-xs bg-black/5 p-3 rounded overflow-x-auto">
      {JSON.stringify(details, null, 2)}
    </pre>
  );
}