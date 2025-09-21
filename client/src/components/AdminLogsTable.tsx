// client/src/components/AdminLogsTable.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { AdminAction } from "@/types/admin";
import { getActionIcon, getActionLabel, parseActionDetails } from "@/utils/adminUtils";

interface AdminLogsTableProps {
  logs: AdminAction[];
  loading: boolean;
}

export function AdminLogsTable({ logs, loading }: AdminLogsTableProps) {
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
    <Card>
      <CardHeader>
        <CardTitle className="font-gaming">Логи действий администраторов</CardTitle>
        <CardDescription>История всех действий администраторов</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Администратор</TableHead>
              <TableHead>Действие</TableHead>
              <TableHead>Цель</TableHead>
              <TableHead>Детали</TableHead>
              <TableHead>Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((action) => {
              const details = parseActionDetails(action.details);
              
              return (
                <TableRow key={action.id}>
                  <TableCell>
                    <div className="font-medium">
                      {action.admin?.displayName || action.admin?.username || 'Администратор'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {action.admin?.username ? 
                        `@${action.admin.username}` : 
                        `ID: ${action.adminId.slice(0, 8)}...`
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActionIcon(action.action)}
                      {getActionLabel(action.action)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {action.targetType}: {action.targetId.slice(0, 8)}...
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-xs">
                      {action.action === 'approve_submission' && details.reward && (
                        <span className="text-gaming-success">
                          Вознаграждение: {details.reward} ₽
                        </span>
                      )}
                      {action.action === 'reject_submission' && details.rejectionReason && (
                        <span className="text-destructive">
                          Причина: {details.rejectionReason}
                        </span>
                      )}
                      {action.action === 'adjust_balance' && (
                        <div className="space-y-1">
                          <div className={details.amount > 0 ? 'text-gaming-success' : 'text-destructive'}>
                            {details.amount > 0 ? '+' : ''}{details.amount} ₽
                          </div>
                          {details.reason && (
                            <div className="text-muted-foreground">
                              {details.reason}
                            </div>
                          )}
                          {details.newBalance !== undefined && (
                            <div className="text-sm text-muted-foreground">
                              Новый баланс: {details.newBalance} ₽
                            </div>
                          )}
                        </div>
                      )}
                      {action.action === 'process_withdrawal' && (
                        <div className="space-y-1">
                          <div className={details.status === 'completed' ? 'text-gaming-success' : 'text-destructive'}>
                            Статус: {details.status}
                          </div>
                          {details.amount && (
                            <div className="text-sm text-muted-foreground">
                              Сумма: {details.amount} ₽
                            </div>
                          )}
                          {details.rejectionReason && (
                            <div className="text-destructive text-sm">
                              Причина: {details.rejectionReason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(action.createdAt).toLocaleString('ru-RU')}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {logs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Логи действий не найдены</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}