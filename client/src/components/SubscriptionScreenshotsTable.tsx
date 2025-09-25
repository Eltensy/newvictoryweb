// client/src/components/admin/SubscriptionScreenshotsTable.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Eye, CheckCircle, XCircle, Clock, User, Calendar, AlertTriangle } from "lucide-react";

interface SubscriptionScreenshot {
  id: string;
  username: string;
  displayName: string;
  subscriptionScreenshotUrl?: string;
  subscriptionScreenshotStatus: 'none' | 'pending' | 'approved' | 'rejected';
  subscriptionScreenshotUploadedAt?: Date;
  subscriptionScreenshotReviewedAt?: Date;
  subscriptionScreenshotReviewedBy?: string;
  subscriptionScreenshotRejectionReason?: string;
  balance: number;
  stats?: {
    totalSubmissions: number;
    approvedSubmissions: number;
    totalEarnings: number;
  };
}

interface SubscriptionScreenshotsTableProps {
  screenshots: SubscriptionScreenshot[];
  loading: boolean;
  onReview: (userId: string, status: 'approved' | 'rejected', rejectionReason?: string) => Promise<void>;
  actionLoading: boolean;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved':
      return <CheckCircle className="h-4 w-4 text-gaming-success" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-gaming-warning" />;
    default:
      return <User className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return <Badge className="bg-gaming-success/10 text-gaming-success border-gaming-success/20">Одобрено</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Отклонено</Badge>;
    case 'pending':
      return <Badge className="bg-gaming-warning/10 text-gaming-warning border-gaming-warning/20">На рассмотрении</Badge>;
    default:
      return <Badge variant="secondary">Нет скриншота</Badge>;
  }
};

export function SubscriptionScreenshotsTable({ 
  screenshots, 
  loading, 
  onReview, 
  actionLoading 
}: SubscriptionScreenshotsTableProps) {
  const [selectedScreenshot, setSelectedScreenshot] = useState<SubscriptionScreenshot | null>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Загрузка скриншотов подписок...</span>
        </CardContent>
      </Card>
    );
  }

  const handleOpenReview = (screenshot: SubscriptionScreenshot, action: 'approved' | 'rejected') => {
    setSelectedScreenshot(screenshot);
    setReviewAction(action);
    setRejectionReason("");
    setReviewDialog(true);
  };

  const handleReview = async () => {
    if (!selectedScreenshot) return;
    
    try {
      await onReview(
        selectedScreenshot.id, 
        reviewAction, 
        reviewAction === 'rejected' ? rejectionReason : undefined
      );
      setReviewDialog(false);
      setSelectedScreenshot(null);
      setRejectionReason("");
    } catch (error) {
      console.error('Review failed:', error);
    }
  };

  const handlePreview = (screenshot: SubscriptionScreenshot) => {
    setSelectedScreenshot(screenshot);
    setPreviewDialog(true);
  };

  // Filter screenshots to show relevant ones
  const relevantScreenshots = screenshots.filter(s => 
    s.subscriptionScreenshotStatus && s.subscriptionScreenshotStatus !== 'none'
  );

  // Separate by status for better organization
  const pendingScreenshots = relevantScreenshots.filter(s => s.subscriptionScreenshotStatus === 'pending');
  const approvedScreenshots = relevantScreenshots.filter(s => s.subscriptionScreenshotStatus === 'approved');
  const rejectedScreenshots = relevantScreenshots.filter(s => s.subscriptionScreenshotStatus === 'rejected');

  return (
    <>
      <div className="space-y-6">
        {/* Pending Screenshots - Priority */}
        {pendingScreenshots.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gaming-warning" />
                <CardTitle className="font-gaming text-gaming-warning">
                  Ожидают рассмотрения ({pendingScreenshots.length})
                </CardTitle>
              </div>
              <CardDescription>Скриншоты подписок, требующие проверки</CardDescription>
            </CardHeader>
            <CardContent>
              <ScreenshotTable 
                screenshots={pendingScreenshots}
                onReview={handleOpenReview}
                onPreview={handlePreview}
                actionLoading={actionLoading}
                showActions={true}
              />
            </CardContent>
          </Card>
        )}

        {/* All Screenshots */}
        <Card>
          <CardHeader>
            <CardTitle className="font-gaming">Все скриншоты подписок</CardTitle>
            <CardDescription>
              Всего: {relevantScreenshots.length} | 
              Одобрено: {approvedScreenshots.length} | 
              Отклонено: {rejectedScreenshots.length} |
              На рассмотрении: {pendingScreenshots.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScreenshotTable 
              screenshots={relevantScreenshots}
              onReview={handleOpenReview}
              onPreview={handlePreview}
              actionLoading={actionLoading}
              showActions={false}
            />
          </CardContent>
        </Card>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approved' ? 'Одобрить' : 'Отклонить'} скриншот подписки
            </DialogTitle>
            <DialogDescription>
              Пользователь: {selectedScreenshot?.displayName} (@{selectedScreenshot?.username})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {reviewAction === 'rejected' && (
              <div>
                <label className="text-sm font-medium">Причина отклонения*</label>
                <Textarea
                  placeholder="Укажите причину отклонения скриншота..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={handleReview}
                disabled={actionLoading || (reviewAction === 'rejected' && !rejectionReason.trim())}
                className={reviewAction === 'approved' ? 'bg-gaming-success hover:bg-gaming-success/90' : ''}
                variant={reviewAction === 'rejected' ? 'destructive' : 'default'}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : reviewAction === 'approved' ? (
                  <CheckCircle className="h-4 w-4 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {reviewAction === 'approved' ? 'Одобрить' : 'Отклонить'}
              </Button>
              <Button variant="outline" onClick={() => setReviewDialog(false)}>
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Скриншот подписки</DialogTitle>
            <DialogDescription>
              Пользователь: {selectedScreenshot?.displayName} (@{selectedScreenshot?.username})
            </DialogDescription>
          </DialogHeader>
          
          {selectedScreenshot?.subscriptionScreenshotUrl && (
            <div className="flex justify-center">
              <img
                src={selectedScreenshot.subscriptionScreenshotUrl}
                alt="Subscription screenshot"
                className="max-h-96 max-w-full object-contain rounded-lg border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Статус:</span>
              <div className="mt-1">{getStatusBadge(selectedScreenshot?.subscriptionScreenshotStatus || 'none')}</div>
            </div>
            <div>
              <span className="font-medium">Дата загрузки:</span>
              <div className="mt-1">
                {selectedScreenshot?.subscriptionScreenshotUploadedAt 
                  ? new Date(selectedScreenshot.subscriptionScreenshotUploadedAt).toLocaleString('ru-RU')
                  : 'Не указана'}
              </div>
            </div>
            {selectedScreenshot?.subscriptionScreenshotReviewedAt && (
              <>
                <div>
                  <span className="font-medium">Дата рассмотрения:</span>
                  <div className="mt-1">
                    {new Date(selectedScreenshot.subscriptionScreenshotReviewedAt).toLocaleString('ru-RU')}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Рассмотрел:</span>
                  <div className="mt-1">
                    {selectedScreenshot?.subscriptionScreenshotReviewedBy === 'system' ? 'Система (авто)' : selectedScreenshot?.subscriptionScreenshotReviewedBy || 'Неизвестно'}
                  </div>
                </div>
              </>
            )}
            {selectedScreenshot?.subscriptionScreenshotRejectionReason && (
              <div className="col-span-2">
                <span className="font-medium">Причина отклонения:</span>
                <div className="mt-1 p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive">
                  {selectedScreenshot.subscriptionScreenshotRejectionReason}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Separate table component for reusability
function ScreenshotTable({ 
  screenshots, 
  onReview, 
  onPreview, 
  actionLoading, 
  showActions 
}: {
  screenshots: SubscriptionScreenshot[];
  onReview: (screenshot: SubscriptionScreenshot, action: 'approved' | 'rejected') => void;
  onPreview: (screenshot: SubscriptionScreenshot) => void;
  actionLoading: boolean;
  showActions: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Пользователь</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead>Статистика</TableHead>
          <TableHead>Дата загрузки</TableHead>
          <TableHead>Дата рассмотрения</TableHead>
          <TableHead>Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {screenshots.map((screenshot) => (
          <TableRow key={screenshot.id} className={screenshot.subscriptionScreenshotStatus === 'pending' ? 'bg-gaming-warning/5' : ''}>
            <TableCell>
              <div>
                <div className="font-medium">{screenshot.displayName}</div>
                <div className="text-sm text-muted-foreground">@{screenshot.username}</div>
                <div className="text-sm text-muted-foreground">Баланс: {screenshot.balance} ₽</div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {getStatusIcon(screenshot.subscriptionScreenshotStatus)}
                {getStatusBadge(screenshot.subscriptionScreenshotStatus)}
              </div>
              {screenshot.subscriptionScreenshotReviewedBy === 'system' && (
                <div className="text-xs text-muted-foreground mt-1">
                  Авто-одобрение
                </div>
              )}
            </TableCell>
            <TableCell>
              {screenshot.stats && (
                <div className="text-sm space-y-1">
                  <div>Заявок: {screenshot.stats.totalSubmissions}</div>
                  <div className="text-gaming-success">Одобрено: {screenshot.stats.approvedSubmissions}</div>
                  <div className="text-gaming-success">Заработано: {screenshot.stats.totalEarnings} ₽</div>
                </div>
              )}
            </TableCell>
            <TableCell>
              <div className="text-sm">
                {screenshot.subscriptionScreenshotUploadedAt 
                  ? new Date(screenshot.subscriptionScreenshotUploadedAt).toLocaleString('ru-RU')
                  : '—'}
              </div>
            </TableCell>
            <TableCell>
              <div className="text-sm">
                {screenshot.subscriptionScreenshotReviewedAt 
                  ? new Date(screenshot.subscriptionScreenshotReviewedAt).toLocaleString('ru-RU')
                  : '—'}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                {screenshot.subscriptionScreenshotUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPreview(screenshot)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                
                {showActions && screenshot.subscriptionScreenshotStatus === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => onReview(screenshot, 'approved')}
                      disabled={actionLoading}
                      className="bg-gaming-success hover:bg-gaming-success/90"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onReview(screenshot, 'rejected')}
                      disabled={actionLoading}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
                
                {!showActions && screenshot.subscriptionScreenshotStatus !== 'pending' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => onReview(screenshot, 'approved')}
                      disabled={actionLoading}
                      className="bg-gaming-success hover:bg-gaming-success/90"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onReview(screenshot, 'rejected')}
                      disabled={actionLoading}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default SubscriptionScreenshotsTable;