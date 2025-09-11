import { useState } from "react";
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
  FileImage
} from "lucide-react";

interface Submission {
  id: string;
  user: string;
  category: string;
  type: 'image' | 'video';
  filename: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reward?: number;
}

interface User {
  id: string;
  username: string;
  balance: number;
  submissionsCount: number;
  joinedAt: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'submissions' | 'users'>('submissions');
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [rewardAmount, setRewardAmount] = useState("");

  // TODO: remove mock functionality - replace with real data from API
  const mockSubmissions: Submission[] = [
    {
      id: '1',
      user: 'GamerPro2024',
      category: 'gold-kill',
      type: 'video',
      filename: 'epic_kill.mp4',
      status: 'pending',
      submittedAt: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      user: 'FortniteKing',
      category: 'victory',
      type: 'image',
      filename: 'victory_royale.png',
      status: 'approved',
      submittedAt: '2024-01-14T15:20:00Z',
      reward: 500
    },
    {
      id: '3',
      user: 'FunnyGamer',
      category: 'funny',
      type: 'video',
      filename: 'funny_fail.mp4',
      status: 'pending',
      submittedAt: '2024-01-14T09:45:00Z'
    },
    {
      id: '4',
      user: 'SkillMaster',
      category: 'gold-kill',
      type: 'image',
      filename: 'headshot.jpg',
      status: 'rejected',
      submittedAt: '2024-01-13T18:10:00Z'
    }
  ];

  const mockUsers: User[] = [
    {
      id: '1',
      username: 'GamerPro2024',
      balance: 1250,
      submissionsCount: 8,
      joinedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      username: 'FortniteKing',
      balance: 2450,
      submissionsCount: 12,
      joinedAt: '2023-12-15T00:00:00Z'
    },
    {
      id: '3',
      username: 'FunnyGamer',
      balance: 750,
      submissionsCount: 5,
      joinedAt: '2024-01-10T00:00:00Z'
    }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'gold-kill': return <Trophy className="h-4 w-4 text-gaming-success" />;
      case 'victory': return <Target className="h-4 w-4 text-gaming-primary" />;
      case 'funny': return <Zap className="h-4 w-4 text-gaming-warning" />;
      default: return null;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'gold-kill': return 'Голд килл';
      case 'victory': return 'Победа';
      case 'funny': return 'Смешной момент';
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

  const handleApprove = (submissionId: string) => {
    console.log('Approving submission:', submissionId, 'with reward:', rewardAmount);
    // TODO: remove mock functionality - replace with real API call
    setSelectedSubmission(null);
    setRewardAmount("");
  };

  const handleReject = (submissionId: string) => {
    console.log('Rejecting submission:', submissionId);
    // TODO: remove mock functionality - replace with real API call
    setSelectedSubmission(null);
  };

  const filteredSubmissions = mockSubmissions.filter(submission => {
    const matchesSearch = submission.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = mockUsers.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold font-gaming">Admin Panel</span>
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
                    placeholder={activeTab === 'submissions' ? "Поиск по имени пользователя или файлу..." : "Поиск по имени пользователя..."}
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
              <CardTitle className="font-gaming">Заявки на модерацию</CardTitle>
              <CardDescription>
                Всего заявок: {filteredSubmissions.length}
              </CardDescription>
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
                  {filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">{submission.user}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(submission.category)}
                          {getCategoryLabel(submission.category)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {submission.type === 'video' ? (
                            <FileVideo className="h-4 w-4 text-gaming-primary" />
                          ) : (
                            <FileImage className="h-4 w-4 text-gaming-secondary" />
                          )}
                          {submission.filename}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(submission.status)}</TableCell>
                      <TableCell>
                        {new Date(submission.submittedAt).toLocaleDateString('ru-RU')}
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
                                  Заявка от {submission.user}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                                  <p className="text-muted-foreground">
                                    Предварительный просмотр: {submission.filename}
                                  </p>
                                </div>
                                {submission.status === 'pending' && (
                                  <div className="flex gap-4">
                                    <div className="flex-1">
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
                                    <div className="flex gap-2 items-end">
                                      <Button
                                        className="bg-gaming-success hover:bg-gaming-success/90"
                                        onClick={() => handleApprove(submission.id)}
                                        disabled={!rewardAmount}
                                        data-testid="button-approve"
                                      >
                                        <Check className="h-4 w-4 mr-2" />
                                        Одобрить
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => handleReject(submission.id)}
                                        data-testid="button-reject"
                                      >
                                        <X className="h-4 w-4 mr-2" />
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
            </CardContent>
          </Card>
        )}

        {/* Users Table */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader>
              <CardTitle className="font-gaming">Управление пользователями</CardTitle>
              <CardDescription>
                Всего пользователей: {filteredUsers.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-gaming">
                          {user.balance} ₽
                        </Badge>
                      </TableCell>
                      <TableCell>{user.submissionsCount}</TableCell>
                      <TableCell>
                        {new Date(user.joinedAt).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              data-testid={`button-manage-${user.id}`}
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="font-gaming">Управление балансом</DialogTitle>
                              <DialogDescription>
                                Пользователь: {user.username}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="balance-amount">Изменить баланс</Label>
                                <Input
                                  id="balance-amount"
                                  type="number"
                                  placeholder="Введите сумму"
                                  data-testid="input-balance"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button className="flex-1" data-testid="button-add-balance">
                                  Добавить
                                </Button>
                                <Button variant="outline" className="flex-1" data-testid="button-subtract-balance">
                                  Списать
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
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}