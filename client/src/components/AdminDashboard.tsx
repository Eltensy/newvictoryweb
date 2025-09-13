  import { useState, useEffect } from "react";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Input } from "@/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  import { useAuth } from "../hooks/useAuth";
  import { 
    Shield, 
    Filter, 
    Search, 
    Eye, 
    Check, 
    X, 
    DollarSign, 
    Trophy,
    Target,
    Zap,
    Users,
    FileVideo,
    FileImage,
    Loader2,
    AlertCircle,
    House,
    RefreshCw
  } from "lucide-react";
  import { useToast } from "@/hooks/use-toast";

  interface Submission {
    id: string;
    userId: string;
    filename: string;
    originalFilename: string;
    fileType: 'image' | 'video';
    category: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    reviewedAt?: string;
    reviewedBy?: string;
    reward?: number;
    rejectionReason?: string;
    // User data joined from backend
    user?: {
      username: string;
      displayName: string;
      telegramUsername?: string;
    };
  }

  interface User {
    id: string;
    username: string;
    displayName: string;
    balance: number;
    createdAt: string;
    updatedAt: string;
    telegramUsername: string;
    isAdmin: boolean;
    email?: string;
    epicGamesId?: string;
    // Stats from backend
    stats?: {
      totalSubmissions: number;
      approvedSubmissions: number;
      pendingSubmissions: number;
      rejectedSubmissions: number;
      totalEarnings: number;
    };

  }

    interface AdminAction {
      id: string;
      adminId: string;
      action: string;
      targetType: string;
      targetId: string;
      details: string;
      createdAt: string;
      admin?: {
        username: string;
        displayName: string;
        telegramUsername?: string;
      };
    }


  export default function AdminDashboard() {
    const { getAuthToken } = useAuth();
    const { toast } = useToast();
    
    const [activeTab, setActiveTab] = useState<'submissions' | 'users' | 'logs'>('submissions');
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [rewardAmount, setRewardAmount] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");
    const [balanceAmount, setBalanceAmount] = useState("");
    const [balanceReason, setBalanceReason] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [adminActions, setAdminActions] = useState<AdminAction[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    
    // Loading states
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const [usersLoading, setUsersLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Data
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchSubmissions = async () => {
      setSubmissionsLoading(true);
      setError(null);
      try {
        const token = getAuthToken();
        if (!token) throw new Error('No authentication token');

        const response = await fetch('/api/submissions', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch submissions: ${response.statusText}`);
        }

        const data = await response.json();
        setSubmissions(data);
      } catch (error) {
        console.error('Failed to fetch submissions:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch submissions');
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить заявки",
          variant: "destructive"
        });
      } finally {
        setSubmissionsLoading(false);
      }
    };
    const fetchAdminActions = async () => {
  setLogsLoading(true);
  setError(null);
  try {
    const token = getAuthToken();
    if (!token) throw new Error('No authentication token');

    const response = await fetch('/api/admin/actions', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch admin actions: ${response.statusText}`);
    }

    const data = await response.json();
    setAdminActions(data);
  } catch (error) {
    console.error('Failed to fetch admin actions:', error);
    setError(error instanceof Error ? error.message : 'Failed to fetch admin actions');
    toast({
      title: "Ошибка",
      description: "Не удалось загрузить логи действий",
      variant: "destructive"
    });
  } finally {
    setLogsLoading(false);
  }
};
    const fetchUsers = async () => {
        setUsersLoading(true);
        setError(null);
        try {
          const token = getAuthToken();
          if (!token) throw new Error('No authentication token');

          const response = await fetch('/api/admin/users', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch users: ${response.statusText}`);
          }

          const data = await response.json();
          setUsers(data);
        } catch (error) {
          console.error('Failed to fetch users:', error);
          setError(error instanceof Error ? error.message : 'Failed to fetch users');
          toast({
            title: "Ошибка",
            description: "Не удалось загрузить пользователей",
            variant: "destructive"
          });
        } finally {
          setUsersLoading(false);
        }
      };
    const FilePreview = ({ submission }: { submission: Submission }) => {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);
  const { getAuthToken } = useAuth();
  
  // Для Cloudinary файлов используем прямые URL
  const isCloudinaryFile = submission.filePath?.startsWith('https://res.cloudinary.com') || 
                          submission.cloudinaryUrl;
                          
  const fileUrl = submission.cloudinaryUrl || submission.filePath || `/api/files/${submission.id}`;
  
  const retryLoad = () => {
    setImageError(false);
    setLoading(true);
  };

  const handleLoad = () => {
    setLoading(false);
    console.log('✅ File loaded successfully for submission:', submission.id);
  };

  const handleError = () => {
    console.error('❌ File rendering failed for submission:', submission.id);
    setImageError(true);
    setLoading(false);
  };

  return (
    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-10">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-sm">Загрузка файла...</span>
        </div>
      )}
      
      {submission.fileType === "image" ? (
        <>
          {!imageError ? (
            <img  
              src={fileUrl}
              alt={submission.originalFilename || submission.filename}
              className="object-contain w-full h-full"
              onLoad={handleLoad}
              onError={handleError}
              style={{ display: loading ? 'none' : 'block' }}
              crossOrigin={isCloudinaryFile ? "anonymous" : undefined}
            />
          ) : (
            <div className="text-center p-4 space-y-3">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Не удалось загрузить изображение
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {submission.originalFilename || submission.filename}
                </p>
                
                {/* Диагностическая информация */}
                <div className="mt-3 p-2 bg-muted rounded text-xs text-left">
                  <p><strong>ID:</strong> {submission.id}</p>
                  <p><strong>Файл:</strong> {submission.filename}</p>
                  <p><strong>URL:</strong> {fileUrl}</p>
                  {submission.cloudinaryPublicId && (
                    <p><strong>Cloudinary ID:</strong> {submission.cloudinaryPublicId}</p>
                  )}
                  <p><strong>Тип:</strong> {isCloudinaryFile ? 'Cloudinary' : 'Local'}</p>
                </div>
                
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={retryLoad}
                  className="mt-2"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Повторить
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        // For videos
        <>
          {!imageError ? (
            <video
              src={fileUrl}
              controls
              className="object-contain w-full h-full"
              onLoadedMetadata={handleLoad}
              onError={handleError}
              style={{ display: loading ? 'none' : 'block' }}
              crossOrigin={isCloudinaryFile ? "anonymous" : undefined}
            />
          ) : (
            <div className="text-center p-4 space-y-3">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Не удалось загрузить видео
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {submission.originalFilename || submission.filename}
                </p>
                
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={retryLoad}
                  className="mt-2"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Повторить
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Индикатор типа хранилища */}
      <div className="absolute top-2 right-2">
        <Badge 
          variant={isCloudinaryFile ? "default" : "secondary"}
          className="text-xs"
        >
          {isCloudinaryFile ? "☁️" : "💾"}
        </Badge>
      </div>
    </div>
  );
};
   const handleApprove = async (submissionId: string) => {
  const rewardValue = Number(rewardAmount);
  
  if (!rewardAmount || isNaN(rewardValue) || rewardValue <= 0) {
    toast({
      title: "Ошибка",
      description: "Введите корректную сумму вознаграждения",
      variant: "destructive"
    });
    return;
  }

  setActionLoading(true);
  try {
    const token = getAuthToken();
    if (!token) throw new Error('No authentication token');

    const requestBody = {
      status: 'approved',
      reward: rewardValue // Отправляем как число
    };

    console.log('Sending approve request:', requestBody); // Для отладки

    const response = await fetch(`/api/admin/submission/${submissionId}/review`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Approve failed:', errorData); // Для отладки
      throw new Error(errorData.error || 'Failed to approve submission');
    }

    toast({
      title: "Успешно",
      description: "Заявка одобрена",
      variant: "default"
    });

    // Refresh data
    await fetchSubmissions();
    setSelectedSubmission(null);
    setRewardAmount("");
  } catch (error) {
    console.error('Failed to approve submission:', error);
    toast({
      title: "Ошибка",
      description: error instanceof Error ? error.message : "Не удалось одобрить заявку",
      variant: "destructive"
    });
  } finally {
    setActionLoading(false);
  }
};
const getActionLabel = (action: string) => {
  switch (action) {
    case 'approve_submission': return 'Одобрил заявку';
    case 'reject_submission': return 'Отклонил заявку';
    case 'adjust_balance': return 'Изменил баланс';
    default: return action;
  }
};

const getActionIcon = (action: string) => {
  switch (action) {
    case 'approve_submission': return <Check className="h-4 w-4 text-gaming-success" />;
    case 'reject_submission': return <X className="h-4 w-4 text-destructive" />;
    case 'adjust_balance': return <DollarSign className="h-4 w-4 text-gaming-primary" />;
    default: return <AlertCircle className="h-4 w-4" />;
  }
};

const parseActionDetails = (details: string) => {
  try {
    return JSON.parse(details);
  } catch {
    return details;
  }
};
const handleReject = async (submissionId: string) => {
  if (!rejectionReason.trim()) {
    toast({
      title: "Ошибка",
      description: "Введите причину отклонения",
      variant: "destructive"
    });
    return;
  }

  setActionLoading(true);
  try {
    const token = getAuthToken();
    if (!token) throw new Error('No authentication token');

    const requestBody = {
      status: 'rejected',
      rejectionReason: rejectionReason.trim()
    };

    console.log('Sending reject request:', requestBody); // Для отладки

    const response = await fetch(`/api/admin/submission/${submissionId}/review`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Reject failed:', errorData); // Для отладки
      throw new Error(errorData.error || 'Failed to reject submission');
    }

    toast({
      title: "Успешно",
      description: "Заявка отклонена",
      variant: "default"
    });

    // Refresh data
    await fetchSubmissions();
    setSelectedSubmission(null);
    setRejectionReason("");
  } catch (error) {
    console.error('Failed to reject submission:', error);
    toast({
      title: "Ошибка",
      description: error instanceof Error ? error.message : "Не удалось отклонить заявку",
      variant: "destructive"
    });
  } finally {
    setActionLoading(false);
  }
};


    const handleUpdateBalance = async (userId: string, isAdd: boolean) => {
  const amountValue = Number(balanceAmount);
  
  if (!balanceAmount || isNaN(amountValue) || amountValue <= 0) {
    toast({
      title: "Ошибка",
      description: "Введите корректную сумму",
      variant: "destructive"
    });
    return;
  }

  if (!balanceReason.trim()) {
    toast({
      title: "Ошибка",
      description: "Введите причину изменения баланса",
      variant: "destructive"
    });
    return;
  }

  setActionLoading(true);
  try {
    const token = getAuthToken();
    if (!token) throw new Error('No authentication token');

    const amount = isAdd ? amountValue : -amountValue;

    const requestBody = {
      amount: amount, // Отправляем как число
      reason: balanceReason.trim()
    };

    console.log('Sending balance update request:', requestBody); // Для отладки

    const response = await fetch(`/api/admin/user/${userId}/balance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Balance update failed:', errorData); // Для отладки
      throw new Error(errorData.error || 'Failed to update balance');
    }

    toast({
      title: "Успешно",
      description: `Баланс ${isAdd ? 'пополнен' : 'списан'}`,
      variant: "default"
    });

    // Refresh data
    await fetchUsers();
    setSelectedUser(null);
    setBalanceAmount("");
    setBalanceReason("");
  } catch (error) {
    console.error('Failed to update balance:', error);
    toast({
      title: "Ошибка",
      description: error instanceof Error ? error.message : "Не удалось обновить баланс",
      variant: "destructive"
    });
  } finally {
    setActionLoading(false);
  }
};
    useEffect(() => {
  if (activeTab === 'submissions') {
    fetchSubmissions();
  } else if (activeTab === 'users') {
    fetchUsers();
  } else if (activeTab === 'logs') {
    fetchAdminActions();
  }
  }, [activeTab]);

    const getCategoryIcon = (category: string) => {
      switch (category) {
        case 'gold-kill': return <Trophy className="h-4 w-4 text-yellow-400" />;
        case 'silver-kill': return <Trophy className="h-4 w-4 text-gray-400" />;
        case 'bronze-kill': return <Trophy className="h-4 w-4 text-yellow-700" />;
        case 'victory': return <Target className="h-4 w-4 text-gaming-primary" />;
        case 'funny': return <Zap className="h-4 w-4 text-gaming-warning" />;
        default: return null;
      }
    };

    const getCategoryLabel = (category: string) => {
      switch (category) {
        case 'gold-kill': return 'Голд килл';
        case 'silver-kill': return 'Серебряный килл';
        case 'bronze-kill': return 'Бронзовый килл';
        case 'victory': return 'Победа';
        case 'funny': return 'Другое';
        default: return category;
      }
    };

    const getStatusBadge = (status: string) => {
      switch (status) {
        case 'pending':
          return <Badge variant="secondary">На рассмотрении</Badge>;
        case 'approved':
          return <Badge className="bg-gaming-success text-white">Одобрено</Badge>;
        case 'rejected':
          return <Badge variant="destructive">Отклонено</Badge>;
        default:
          return <Badge variant="secondary">{status}</Badge>;
      }
    };

    const filteredSubmissions = submissions.filter(submission => {
      const matchesSearch = submission.originalFilename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          submission.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          submission.userId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const filteredUsers = users.filter(user =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold font-gaming">Admin Panel</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => activeTab === 'submissions' ? fetchSubmissions() : fetchUsers()}
                disabled={submissionsLoading || usersLoading}
              >
                <RefreshCw className={`h-4 w-4 ${(submissionsLoading || usersLoading) ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = "/"}
              >
                <House className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="font-gaming">
                Администратор
              </Badge>
              <div className="w-8 h-8 rounded-full bg-destructive"></div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="border-b border-border bg-card/30">
  <div className="container mx-auto px-4">
    <div className="flex gap-8">
      <button
        className={`py-4 px-2 font-gaming transition-colors ${
          activeTab === 'submissions'
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => setActiveTab('submissions')}
        data-testid="tab-submissions"
      >
        Заявки
      </button>
      <button
        className={`py-4 px-2 font-gaming transition-colors ${
          activeTab === 'users'
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => setActiveTab('users')}
        data-testid="tab-users"
      >
        Пользователи
      </button>
      <button
        className={`py-4 px-2 font-gaming transition-colors ${
          activeTab === 'logs'
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => setActiveTab('logs')}
        data-testid="tab-logs"
      >
        Логи
      </button>
    </div>
  </div>
</div>

        {/* Error Display */}
        {error && (
          <div className="container mx-auto px-4 py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">{error}</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="font-gaming flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Фильтры
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Поиск</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder={activeTab === 'submissions' ? "Поиск по файлу или ID пользователя..." : "Поиск по имени пользователя..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                </div>
                {activeTab === 'submissions' && (
                  <div className="w-48">
                    <Label htmlFor="status">Статус</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все статусы</SelectItem>
                        <SelectItem value="pending">На рассмотрении</SelectItem>
                        <SelectItem value="approved">Одобрено</SelectItem>
                        <SelectItem value="rejected">Отклонено</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submissions Table */}
          {activeTab === 'submissions' && (
            <Card>
              <CardHeader>
                <CardTitle className="font-gaming flex items-center justify-between">
                  <span>Заявки на модерацию</span>
                  {submissionsLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                </CardTitle>
                <CardDescription>
                  Всего заявок: {filteredSubmissions.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submissionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Загрузка заявок...</span>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID пользователя</TableHead>
                        <TableHead>Категория</TableHead>
                        <TableHead>Файл</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell className="font-medium">{submission.userId}</TableCell>
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
                            <div className="flex gap-2">
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
                                            onClick={() => handleApprove(submission.id)}
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
                                            onClick={() => handleReject(submission.id)}
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
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Users Table */}
{activeTab === 'users' && (
  <Card>
    <CardHeader>
      <CardTitle className="font-gaming flex items-center justify-between">
        <span>Управление пользователями</span>
        {usersLoading && <Loader2 className="h-5 w-5 animate-spin" />}
      </CardTitle>
      <CardDescription>
        Всего пользователей: {filteredUsers.length}
      </CardDescription>
    </CardHeader>
    <CardContent>
      {usersLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Загрузка пользователей...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Краткая статистика */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gaming-primary" />
                <div>
                  <p className="text-sm font-medium">Всего пользователей</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-gaming-warning" />
                <div>
                  <p className="text-sm font-medium">Администраторы</p>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.isAdmin).length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-gaming-success" />
                <div>
                  <p className="text-sm font-medium">Общий баланс</p>
                  <p className="text-2xl font-bold">
                    {users.reduce((sum, u) => sum + u.balance, 0)} ₽
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-gaming-secondary" />
                <div>
                  <p className="text-sm font-medium">Активные пользователи</p>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.stats && u.stats.totalSubmissions > 0).length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Таблица пользователей */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Пользователь</TableHead>
                <TableHead>Epic Games ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Баланс</TableHead>
                <TableHead>Заявки</TableHead>
                <TableHead>Доходы</TableHead>
                <TableHead>Регистрация</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {user.id.slice(0, 8)}...
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.displayName}</div>
                      <div className="text-sm text-muted-foreground">
                        @{user.username}
                      </div>
                      {user.telegramUsername && (
                        <div className="text-xs text-muted-foreground">
                          Telegram: @{user.telegramUsername}
                        </div>
                      )}
                      <div className="flex gap-1 mt-1">
                        {user.isAdmin && (
                          <Badge variant="destructive" className="text-xs">
                            Admin
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {user.epicGamesId?.slice(0, 12)}...
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.email ? (
                      <span className="text-sm">{user.email}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.balance > 0 ? "default" : "secondary"} 
                      className="font-gaming"
                    >
                      {user.balance} ₽
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.stats ? (
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="font-medium">Всего: </span>
                          {user.stats.totalSubmissions}
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="text-gaming-success">
                            ✓ {user.stats.approvedSubmissions}
                          </span>
                          <span className="text-gaming-warning">
                            ⏳ {user.stats.pendingSubmissions}
                          </span>
                          <span className="text-destructive">
                            ✗ {user.stats.rejectedSubmissions}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.stats?.totalEarnings ? (
                      <Badge variant="outline" className="text-gaming-success">
                        {user.stats.totalEarnings} ₽
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0 ₽</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleTimeString('ru-RU')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {/* Управление балансом */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                            data-testid={`button-manage-${user.id}`}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-gaming">Управление балансом</DialogTitle>
                            <DialogDescription>
                              Пользователь: {user.displayName} (@{user.username})
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            {/* Полная информация о пользователе */}
                            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                              <div className="text-sm">
                                <strong>ID:</strong> {user.id}
                              </div>
                              <div className="text-sm">
                                <strong>Epic Games ID:</strong> {user.epicGamesId}
                              </div>
                              {user.email && (
                                <div className="text-sm">
                                  <strong>Email:</strong> {user.email}
                                </div>
                              )}
                              <div className="text-sm">
                                <strong>Текущий баланс:</strong>
                                <span className="text-2xl font-bold ml-2">{user.balance} ₽</span>
                              </div>
                              {user.stats && (
                                <div className="text-sm text-muted-foreground mt-2">
                                  <div>Общий доход: {user.stats.totalEarnings} ₽</div>
                                  <div>
                                    Заявки: {user.stats.totalSubmissions} 
                                    (✓{user.stats.approvedSubmissions} 
                                    ⏳{user.stats.pendingSubmissions} 
                                    ✗{user.stats.rejectedSubmissions})
                                  </div>
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                Создан: {new Date(user.createdAt).toLocaleString('ru-RU')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Обновлен: {new Date(user.updatedAt).toLocaleString('ru-RU')}
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="balance-amount">Сумма</Label>
                              <Input
                                id="balance-amount"
                                type="number"
                                placeholder="Введите сумму"
                                value={balanceAmount}
                                onChange={(e) => setBalanceAmount(e.target.value)}
                                data-testid="input-balance"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="balance-reason">Причина</Label>
                              <Input
                                id="balance-reason"
                                placeholder="Введите причину изменения баланса"
                                value={balanceReason}
                                onChange={(e) => setBalanceReason(e.target.value)}
                                data-testid="input-balance-reason"
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                className="flex-1" 
                                onClick={() => handleUpdateBalance(user.id, true)}
                                disabled={!balanceAmount || !balanceReason || actionLoading}
                                data-testid="button-add-balance"
                              >
                                {actionLoading ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  "Добавить"
                                )}
                              </Button>
                              <Button 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => handleUpdateBalance(user.id, false)}
                                disabled={!balanceAmount || !balanceReason || actionLoading}
                                data-testid="button-subtract-balance"
                              >
                                {actionLoading ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  "Списать"
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Просмотр подробной информации */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle className="font-gaming">
                              Информация о пользователе
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <strong>ID:</strong>
                                <Badge variant="outline" className="ml-2 font-mono">
                                  {user.id}
                                </Badge>
                              </div>
                              <div>
                                <strong>Username:</strong> {user.username}
                              </div>
                              <div>
                                <strong>Отображаемое имя:</strong> {user.displayName}
                              </div>
                              <div>
                                <strong>Epic Games ID:</strong>
                                <Badge variant="outline" className="ml-2 font-mono text-xs">
                                  {user.epicGamesId}
                                </Badge>
                              </div>
                              <div>
                                <strong>Email:</strong> {user.email || '—'}
                              </div>
                              <div>
                                <strong>Telegram:</strong> {user.telegramUsername ? `@${user.telegramUsername}` : '—'}
                              </div>
                              <div>
                                <strong>Баланс:</strong> {user.balance} ₽
                              </div>
                              <div>
                                <strong>Роль:</strong> 
                                {user.isAdmin ? (
                                  <Badge variant="destructive" className="ml-2">Admin</Badge>
                                ) : (
                                  <Badge variant="secondary" className="ml-2">User</Badge>
                                )}
                              </div>
                            </div>
                            
                            {user.stats && (
                              <div className="bg-muted/50 p-4 rounded-lg">
                                <h4 className="font-medium mb-2">Статистика</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>Всего заявок: <strong>{user.stats.totalSubmissions}</strong></div>
                                  <div className="text-gaming-success">
                                    Одобрено: <strong>{user.stats.approvedSubmissions}</strong>
                                  </div>
                                  <div className="text-gaming-warning">
                                    На рассмотрении: <strong>{user.stats.pendingSubmissions}</strong>
                                  </div>
                                  <div className="text-destructive">
                                    Отклонено: <strong>{user.stats.rejectedSubmissions}</strong>
                                  </div>
                                  <div className="col-span-2 text-gaming-success mt-2">
                                    Общий доход: <strong>{user.stats.totalEarnings} ₽</strong>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className="bg-muted/30 p-3 rounded text-xs text-muted-foreground">
                              <div>Создан: {new Date(user.createdAt).toLocaleString('ru-RU')}</div>
                              <div>Обновлен: {new Date(user.updatedAt).toLocaleString('ru-RU')}</div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
)}
          {/* Admin Actions Logs */}
{activeTab === 'logs' && (
  <Card>
    <CardHeader>
      <CardTitle className="font-gaming flex items-center justify-between">
        <span>Логи действий администраторов</span>
        {logsLoading && <Loader2 className="h-5 w-5 animate-spin" />}
      </CardTitle>
      <CardDescription>
        История всех действий администраторов
      </CardDescription>
    </CardHeader>
    <CardContent>
      {logsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Загрузка логов...</span>
        </div>
      ) : (
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
            {adminActions.map((action) => {
              const details = parseActionDetails(action.details);
              return (
                <TableRow key={action.id}>
                  <TableCell>
                    <div className="font-medium">
                      {action.admin?.displayName || 'Unknown Admin'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      @{action.admin?.telegramUsername || 'unknown'}
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
      )}
    </CardContent>
  </Card>
)}
        </main>
      </div>
    );
  }
  