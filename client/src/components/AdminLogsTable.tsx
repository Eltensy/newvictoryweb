// client/src/components/AdminLogsTable.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Eye } from "lucide-react";
import { AdminAction } from "@/types/admin";
import { getActionIcon, getActionLabel, parseActionDetails } from "@/utils/adminUtils";

interface AdminLogsTableProps {
  logs: AdminAction[];
  loading: boolean;
}

export function AdminLogsTable({ logs, loading }: AdminLogsTableProps) {
  const [selectedAction, setSelectedAction] = useState<AdminAction | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const handleShowDetails = (action: AdminAction) => {
    setSelectedAction(action);
    setShowDetailsDialog(true);
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
                        <div>
                          <div className="font-medium">{adminName}</div>
                          <div className="text-sm text-muted-foreground">
                            {adminUsername}
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

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Детали действия</DialogTitle>
            <DialogDescription>
              Подробная информация о действии администратора
            </DialogDescription>
          </DialogHeader>

          {selectedAction && (
            <div className="space-y-4">
              {/* Admin Info */}
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-2">Администратор</h3>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Имя:</span>
                    <span className="font-medium">
                      {selectedAction.adminId === 'system' 
                        ? 'Система'
                        : selectedAction.admin?.displayName || 'Неизвестно'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Username:</span>
                    <span className="font-mono text-sm">
                      {selectedAction.adminId === 'system'
                        ? '@system'
                        : selectedAction.admin?.username 
                          ? `@${selectedAction.admin.username}`
                          : 'Нет'}
                    </span>
                  </div>
                  {selectedAction.admin?.telegramUsername && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telegram:</span>
                      <span className="font-mono text-sm">
                        @{selectedAction.admin.telegramUsername}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {selectedAction.adminId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Info */}
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-2">Действие</h3>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Тип:</span>
                    <div className="flex items-center gap-2">
                      {getActionIcon(selectedAction.action)}
                      <span className="font-medium">
                        {getActionLabel(selectedAction.action)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Цель:</span>
                    <Badge variant="outline">{selectedAction.targetType}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target ID:</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {selectedAction.targetId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Дата:</span>
                    <span>
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

              {/* Details */}
              {selectedAction.details && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-2">Детали</h3>
                  <ActionDetails action={selectedAction} />
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
function ActionDetails({ action }: { action: AdminAction }) {
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
              className="block mt-1 text-sm text-blue-600 hover:underline break-all"
            >
              {details.screenshotUrl}
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