// client/src/components/SubmissionsTable.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, Check, X, FileVideo, FileImage, Loader2, MessageSquare, Trophy, DollarSign, Calendar, Hash } from "lucide-react";
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

  // Проверка, требуется ли обязательная награда >1
  const isVictoryCategory = (category: string) => {
    return category === 'victory' || category === 'Victory';
  };

  const isRewardValid = () => {
    if (!selectedSubmission) return false;
    const reward = Number(rewardAmount);
    
    // Для побед требуется награда > 0
    if (isVictoryCategory(selectedSubmission.category)) {
      return reward >= 0;
    }
    
    // Для остальных категорий (киллы и т.д.) можно 0
    return reward >= 0;
  };

  const handleApprove = async () => {
    if (!selectedSubmission || !isRewardValid()) return;
    const reward = Number(rewardAmount);
    
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
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl p-0 border-0 bg-gradient-to-b from-background to-background/95 [&>button]:hidden">
                      
                      {/* Animated Background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
                      
                      {/* Header */}
                      <div className="relative border-b border-border/50 bg-background/60 backdrop-blur-2xl">
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                                  {getCategoryIcon(submission.category, "h-8 w-8 text-white")}
                                </div>
                                {submission.status === 'approved' && (
                                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                                    <Check className="h-3 w-3 text-white" />
                                  </div>
                                )}
                                {submission.status === 'rejected' && (
                                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-red-500 border-2 border-background flex items-center justify-center">
                                    <X className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <h2 className="text-xl font-semibold mb-0.5">{getCategoryLabel(submission.category)}</h2>
                                <p className="text-sm text-muted-foreground">
                                  от @{submission.user?.username || submission.userId}
                                </p>
                                <div className="mt-1">
                                  {getStatusBadge(submission.status)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Reward Card (if approved) */}
                          {submission.status === 'approved' && submission.reward !== undefined && (
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-500/20 p-4">
                              <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                  </div>
                                  <div>
                                    <div className="text-xs text-green-600/80 font-medium">Награда выдана</div>
                                    <div className="text-2xl font-bold tabular-nums">{submission.reward} ₽</div>
                                  </div>
                                </div>
                                {submission.reviewedAt && (
                                  <div className="text-right">
                                    <div className="text-xs text-green-600/80 font-medium">Проверено</div>
                                    <div className="text-xs font-medium">
                                      {new Date(submission.reviewedAt).toLocaleDateString('ru-RU')}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Rejection Card */}
                          {submission.status === 'rejected' && submission.rejectionReason && (
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 via-rose-500/10 to-red-500/10 border border-red-500/20 p-4">
                              <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                                    <X className="h-5 w-5 text-red-600" />
                                  </div>
                                  <div>
                                    <div className="text-xs text-red-600/80 font-medium">Заявка отклонена</div>
                                    <div className="text-sm font-medium text-red-700">{submission.rejectionReason}</div>
                                  </div>
                                </div>
                                {submission.reviewedAt && (
                                  <div className="text-xs text-red-600/80 pl-[52px]">
                                    {new Date(submission.reviewedAt).toLocaleString('ru-RU')}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="relative overflow-y-auto max-h-[calc(90vh-220px)] p-6 space-y-6">
                        
                        {/* File Preview */}
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-3">Предпросмотр файла</h3>
                          <FilePreview submission={submission} />
                        </div>
                        
                        {/* Additional Text Section */}
                        {submission.additionalText && (
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3">Дополнительный текст</h3>
                            <div className="rounded-2xl border border-border/50 p-4 bg-muted/30">
                              <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                  <MessageSquare className="h-4 w-4 text-blue-500" />
                                </div>
                                <p className="text-sm whitespace-pre-wrap break-all flex-1">
                                  {submission.additionalText}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Submission Details Grid */}
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-3">Детали заявки</h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-primary/30 transition-all duration-300">
                              <div className="absolute top-0 right-0 h-16 w-16 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                              <Trophy className="h-5 w-5 text-primary mb-2" />
                              <div className="text-xs text-muted-foreground mb-1">Категория</div>
                              <div className="text-sm font-medium">{getCategoryLabel(submission.category)}</div>
                            </div>

                            <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-purple-500/30 transition-all duration-300">
                              <div className="absolute top-0 right-0 h-16 w-16 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
                              {submission.fileType === 'video' ? (
                                <FileVideo className="h-5 w-5 text-purple-600 mb-2" />
                              ) : (
                                <FileImage className="h-5 w-5 text-purple-600 mb-2" />
                              )}
                              <div className="text-xs text-muted-foreground mb-1">Тип файла</div>
                              <div className="text-sm font-medium">{submission.fileType}</div>
                            </div>

                            <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-blue-500/30 transition-all duration-300">
                              <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                              <Calendar className="h-5 w-5 text-blue-600 mb-2" />
                              <div className="text-xs text-muted-foreground mb-1">Дата создания</div>
                              <div className="text-sm font-medium">{new Date(submission.createdAt).toLocaleString('ru-RU')}</div>
                            </div>

                            <div className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 hover:border-orange-500/30 transition-all duration-300">
                              <div className="absolute top-0 right-0 h-16 w-16 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors" />
                              <FileImage className="h-5 w-5 text-orange-600 mb-2" />
                              <div className="text-xs text-muted-foreground mb-1">Размер файла</div>
                              <div className="text-sm font-medium">{(submission.fileSize / (1024 * 1024)).toFixed(2)} MB</div>
                            </div>
                          </div>
                        </div>

                        {/* ID Section */}
                        <div className="rounded-2xl border border-border/50 p-4 bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Hash className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">ID заявки</span>
                            </div>
                            <Badge variant="outline" className="font-mono text-xs">
                              {submission.id}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Moderation Actions */}
                        {submission.status === 'pending' && (
                          <div className="space-y-4 border-t border-border/50 pt-6">
                            <h4 className="font-semibold text-lg font-gaming">Модерация</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="reward" className="text-sm font-medium">
                                  Вознаграждение (₽)
                                  {isVictoryCategory(submission.category) && (
                                    <span className="text-red-500 ml-1">*обязательно &gt;0</span>
                                  )}
                                </Label>
                                <Input
                                  id="reward"
                                  type="number"
                                  placeholder={isVictoryCategory(submission.category) ? "Минимум 1 ₽" : "0 или больше"}
                                  value={rewardAmount}
                                  onChange={(e) => setRewardAmount(e.target.value)}
                                  data-testid="input-reward"
                                  min="0"
                                  max="10000"
                                  className={!isRewardValid() && rewardAmount !== "" ? "border-red-500" : ""}
                                />
                                {isVictoryCategory(submission.category) && (
                                  <p className="text-xs text-muted-foreground">
                                    Для побед награда обязательна
                                  </p>
                                )}
                                {!isVictoryCategory(submission.category) && (
                                  <p className="text-xs text-muted-foreground">
                                    Для киллов можно указать 0 ₽
                                  </p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="rejection-reason" className="text-sm font-medium">
                                  Причина отклонения
                                </Label>
                                <Input
                                  id="rejection-reason"
                                  placeholder="Введите причину отклонения"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  data-testid="input-rejection-reason"
                                />
                              </div>
                            </div>
                            
                            <div className="flex gap-3 pt-2">
                              <Button
                                className="flex-1 bg-gaming-success hover:bg-gaming-success/90"
                                onClick={handleApprove}
                                disabled={!isRewardValid() || rewardAmount === "" || actionLoading}
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