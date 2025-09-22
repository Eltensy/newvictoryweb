// client/src/components/SubmissionsTable.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, Check, X, FileVideo, FileImage, Loader2, MessageSquare } from "lucide-react";
import { Submission } from "@/types/admin";
import { FilePreview } from "./FilePreview";
import { getCategoryIcon, getCategoryLabel, getStatusBadge } from "@/utils/adminUtils";

interface SubmissionsTableProps {
  submissions: Submission[];
  loading: boolean;
  onApprove: (submissionId: string, reward: number) => Promise<void>;
  onReject: (submissionId: string, reason: string) => Promise<void>;
  actionLoading: boolean;
}

export function SubmissionsTable({ 
  submissions, 
  loading, 
  onApprove, 
  onReject, 
  actionLoading 
}: SubmissionsTableProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [rewardAmount, setRewardAmount] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = async () => {
    if (!selectedSubmission) return;
    const reward = Number(rewardAmount);
    if (!reward || reward <= 0) return;
    
    await onApprove(selectedSubmission.id, reward);
    setSelectedSubmission(null);
    setRewardAmount("");
  };

  const handleReject = async () => {
    if (!selectedSubmission || !rejectionReason.trim()) return;
    
    await onReject(selectedSubmission.id, rejectionReason.trim());
    setSelectedSubmission(null);
    setRejectionReason("");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Загрузка заявок...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-gaming">Заявки на модерацию</CardTitle>
        <CardDescription>Всего заявок: {submissions.length}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Пользователь</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead>Файл</TableHead>
              <TableHead>Текст</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => (
              <TableRow key={submission.id}>
                <TableCell className="font-medium">
                  {submission.user?.username || submission.userId}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(submission.category)}
                    {getCategoryLabel(submission.category)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {submission.fileType === 'video' ? (
                      <FileVideo className="h-4 w-4 text-gaming-primary" />
                    ) : (
                      <FileImage className="h-4 w-4 text-gaming-secondary" />
                    )}
                    <span>
                      {(submission.originalFilename || submission.filename).length > 50
                        ? (submission.originalFilename || submission.filename).slice(0, 50) + "..."
                        : (submission.originalFilename || submission.filename)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {submission.additionalText ? (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <Badge variant="secondary" className="text-xs">
                        {submission.additionalText.length > 30 
                          ? submission.additionalText.slice(0, 30) + "..." 
                          : submission.additionalText}
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(submission.status)}</TableCell>
                <TableCell>
                  {new Date(submission.createdAt).toLocaleDateString('ru-RU')}
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedSubmission(submission)}
                        data-testid={`button-view-${submission.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="font-gaming">Просмотр заявки</DialogTitle>
                        <DialogDescription>
                          Заявка от пользователя {submission.user?.username || submission.userId}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6">
                        {/* File Preview */}
                        <FilePreview submission={submission} />
                        
                        {/* Additional Text Section */}
                        {submission.additionalText && (
                          <div className="bg-card/50 p-4 rounded-lg border">
                            <div className="flex items-center gap-2 mb-3">
                              <MessageSquare className="h-5 w-5 text-blue-500" />
                              <Label className="text-base font-medium">Дополнительный текст:</Label>
                            </div>
                            <div className="bg-background/50 p-3 rounded-md border max-w-full">
                              <p className="text-sm whitespace-pre-wrap break-all ">
                                {submission.additionalText}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Submission Details */}
                        <div className="grid grid-cols-2 gap-4 text-sm bg-card/30 p-4 rounded-lg">
                          <div>
                            <strong className="text-foreground">Категория:</strong>
                            <div className="flex items-center gap-2 mt-1">
                              {getCategoryIcon(submission.category)}
                              <span>{getCategoryLabel(submission.category)}</span>
                            </div>
                          </div>
                          <div>
                            <strong className="text-foreground">Тип файла:</strong>
                            <div className="flex items-center gap-2 mt-1">
                              {submission.fileType === 'video' ? (
                                <FileVideo className="h-4 w-4 text-gaming-primary" />
                              ) : (
                                <FileImage className="h-4 w-4 text-gaming-secondary" />
                              )}
                              <span>{submission.fileType}</span>
                            </div>
                          </div>
                          <div>
                            <strong className="text-foreground">Дата создания:</strong>
                            <p className="mt-1">{new Date(submission.createdAt).toLocaleString('ru-RU')}</p>
                          </div>
                          <div>
                            <strong className="text-foreground">Размер файла:</strong>
                            <p className="mt-1">{(submission.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                          <div>
                            <strong className="text-foreground">Статус:</strong>
                            <div className="mt-1">{getStatusBadge(submission.status)}</div>
                          </div>
                          <div>
                            <strong className="text-foreground">ID заявки:</strong>
                            <p className="mt-1 font-mono text-xs">{submission.id}</p>
                          </div>
                        </div>
                        
                        {/* Approval/Rejection Results */}
                        {submission.status === 'approved' && submission.reward && (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Check className="h-5 w-5 text-green-600" />
                              <strong className="text-green-800 dark:text-green-200">Заявка одобрена</strong>
                            </div>
                            <p><strong>Вознаграждение:</strong> {submission.reward} ₽</p>
                            {submission.reviewedAt && (
                              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                Проверено: {new Date(submission.reviewedAt).toLocaleString('ru-RU')}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {submission.status === 'rejected' && submission.rejectionReason && (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <X className="h-5 w-5 text-red-600" />
                              <strong className="text-red-800 dark:text-red-200">Заявка отклонена</strong>
                            </div>
                            <p><strong>Причина:</strong> {submission.rejectionReason}</p>
                            {submission.reviewedAt && (
                              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                Проверено: {new Date(submission.reviewedAt).toLocaleString('ru-RU')}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Moderation Actions */}
                        {submission.status === 'pending' && (
                          <div className="space-y-4 border-t pt-4">
                            <h4 className="font-semibold text-lg font-gaming">Модерация</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="reward" className="text-sm font-medium">
                                  Вознаграждение (₽)
                                </Label>
                                <Input
                                  id="reward"
                                  type="number"
                                  placeholder="Введите сумму"
                                  value={rewardAmount}
                                  onChange={(e) => setRewardAmount(e.target.value)}
                                  data-testid="input-reward"
                                  className="mt-1"
                                  min="1"
                                  max="10000"
                                />
                              </div>
                              <div>
                                <Label htmlFor="rejection-reason" className="text-sm font-medium">
                                  Причина отклонения
                                </Label>
                                <Input
                                  id="rejection-reason"
                                  placeholder="Введите причину отклонения"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  data-testid="input-rejection-reason"
                                  className="mt-1"
                                />
                              </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                              <Button
                                className="flex-1 bg-gaming-success hover:bg-gaming-success/90"
                                onClick={handleApprove}
                                disabled={!rewardAmount || Number(rewardAmount) <= 0 || actionLoading}
                                data-testid="button-approve"
                              >
                                {actionLoading ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 mr-2" />
                                )}
                                Выдать {rewardAmount || 0} ₽
                              </Button>
                              <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={handleReject}
                                disabled={!rejectionReason.trim() || actionLoading}
                                data-testid="button-reject"
                              >
                                {actionLoading ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4 mr-2" />
                                )}
                                Отклонить
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {submissions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileImage className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium mb-2">Заявки не найдены</p>
            <p className="text-sm">Заявки на модерацию появятся здесь</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}