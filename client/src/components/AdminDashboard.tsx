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
  };
}

interface User {
  id: string;
  username: string;
  displayName: string;
  balance: number;
  createdAt: string;
  isAdmin: boolean;
  // Stats from backend
  stats?: {
    totalSubmissions: number;
    approvedSubmissions: number;
    pendingSubmissions: number;
    rejectedSubmissions: number;
    totalEarnings: number;
  };
}

export default function AdminDashboard() {
  const { getAuthToken } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'submissions' | 'users'>('submissions');
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [rewardAmount, setRewardAmount] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceReason, setBalanceReason] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
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

  const fetchUsers = async () => {
    setUsersLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token');

      // Since there's no /api/users endpoint, we'll need to get users from submissions
      // This is a limitation of the current backend - you might want to add a users endpoint
      const response = await fetch('/api/submissions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const submissionsData = await response.json();
      
      // Extract unique users from submissions
      const userMap = new Map<string, User>();
      
      for (const submission of submissionsData) {
        if (!userMap.has(submission.userId)) {
          // Fetch user stats
          try {
            const statsResponse = await fetch(`/api/user/${submission.userId}/stats`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            const userResponse = await fetch(`/api/user/${submission.userId}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            let stats = null;
            let userData = null;

            if (statsResponse.ok) {
              stats = await statsResponse.json();
            }
            
            if (userResponse.ok) {
              userData = await userResponse.json();
            }

            if (userData) {
              userMap.set(submission.userId, {
                id: submission.userId,
                username: userData.username,
                displayName: userData.displayName,
                balance: userData.balance,
                createdAt: userData.createdAt,
                isAdmin: userData.isAdmin,
                stats: stats
              });
            }
          } catch (err) {
            console.error(`Failed to fetch user ${submission.userId}:`, err);
          }
        }
      }
      
      setUsers(Array.from(userMap.values()));
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

  const handleApprove = async (submissionId: string) => {
    if (!rewardAmount || isNaN(Number(rewardAmount)) || Number(rewardAmount) <= 0) {
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

      const response = await fetch(`/api/admin/submission/${submissionId}/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'approved',
          reward: Number(rewardAmount)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
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

      const response = await fetch(`/api/admin/submission/${submissionId}/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: rejectionReason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
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
    if (!balanceAmount || isNaN(Number(balanceAmount)) || Number(balanceAmount) <= 0) {
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

      const amount = isAdd ? Number(balanceAmount) : -Number(balanceAmount);

      const response = await fetch(`/api/admin/user/${userId}/balance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          reason: balanceReason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
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
    } else {
      fetchUsers();
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
                            {submission.originalFilename || submission.filename}
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
                                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                                    {submission.fileType === "image" ? (
                                        <img  
                                          src={`/uploads/file-1757614290639-949791573.jpg`} // путь к файлу на сервере
                                          alt={submission.originalFilename || submission.filename}
                                          className="object-contain w-full h-full"
                                        />
                                      ) : (
                                        <video
                                          src={`/uploads/${submission.filename}`} // путь к видео
                                          controls
                                          className="object-contain w-full h-full"
                                        />
                                      )}
                                                                      </div>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Баланс</TableHead>
                      <TableHead>Заявки</TableHead>
                      <TableHead>Дата регистрации</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.displayName}</div>
                            <div className="text-sm text-muted-foreground">@{user.username}</div>
                            {user.isAdmin && (
                              <Badge variant="outline" className="text-xs">Admin</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-gaming">
                            {user.balance} ₽
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.stats ? (
                            <div className="text-sm">
                              <div>Всего: {user.stats.totalSubmissions}</div>
                              <div className="text-muted-foreground">
                                Одобрено: {user.stats.approvedSubmissions} | 
                                Ожидает: {user.stats.pendingSubmissions}
                              </div>
                            </div>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                        </TableCell>
                        <TableCell>
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
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="font-gaming">Управление балансом</DialogTitle>
                                <DialogDescription>
                                  Пользователь: {user.displayName} (@{user.username})
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="bg-muted/50 p-4 rounded-lg">
                                  <div className="text-sm font-medium">Текущий баланс:</div>
                                  <div className="text-2xl font-bold">{user.balance} ₽</div>
                                  {user.stats && (
                                    <div className="text-sm text-muted-foreground mt-2">
                                      Общий доход: {user.stats.totalEarnings} ₽
                                    </div>
                                  )}
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
                        </TableCell>
                      </TableRow>
                    ))}
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