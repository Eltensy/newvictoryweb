// client/src/components/SubmissionsTable.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, Check, X, FileVideo, FileImage, Loader2 } from "lucide-react";
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
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="font-gaming">Просмотр заявки</DialogTitle>
                        <DialogDescription>
                          Заявка от пользователя {submission.userId}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <FilePreview submission={submission} />
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Категория:</strong> {getCategoryLabel(submission.category)}
                          </div>
                          <div>
                            <strong>Тип файла:</strong> {submission.fileType}
                          </div>
                          <div>
                            <strong>Дата:</strong> {new Date(submission.createdAt).toLocaleString('ru-RU')}
                          </div>
                          <div>
                            <strong>Статус:</strong> {submission.status}
                          </div>
                        </div>
                        
                        {submission.status === 'approved' && submission.reward && (
                          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                            <strong>Вознаграждение:</strong> {submission.reward} ₽
                          </div>
                        )}
                        
                        {submission.status === 'rejected' && submission.rejectionReason && (
                          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                            <strong>Причина отклонения:</strong> {submission.rejectionReason}
                          </div>
                        )}
                        
                        {submission.status === 'pending' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="reward">Вознаграждение (₽)</Label>
                                <Input
                                  id="reward"
                                  type="number"
                                  placeholder="Введите сумму"
                                  value={rewardAmount}
                                  onChange={(e) => setRewardAmount(e.target.value)}
                                  data-testid="input-reward"
                                />
                              </div>
                              <div>
                                <Label htmlFor="rejection-reason">Причина отклонения</Label>
                                <Input
                                  id="rejection-reason"
                                  placeholder="Введите причину"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  data-testid="input-rejection-reason"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                className="flex-1 bg-gaming-success hover:bg-gaming-success/90"
                                onClick={handleApprove}
                                disabled={!rewardAmount || actionLoading}
                                data-testid="button-approve"
                              >
                                {actionLoading ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 mr-2" />
                                )}
                                Одобрить
                              </Button>
                              <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={handleReject}
                                disabled={!rejectionReason || actionLoading}
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
          <div className="text-center py-8 text-muted-foreground">
            <FileImage className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Заявки не найдены</p>
            <p className="text-sm mt-1">Заявки на модерацию появятся здесь</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}