import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trophy,
  FileVideo,
  FileImage,
  Calendar,
  DollarSign,
  AlertCircle,
  Sparkles,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import Header from "./Header";
import { useAuth } from "../hooks/useAuth";
import UserProfile from "./UserProfile";
import BalanceModal from "./BalanceModal";

interface Submission {
  id: string;
  filename: string;
  originalFilename: string;
  fileType: 'image' | 'video';
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  additionalText?: string;
  createdAt: string;
  reviewedAt?: string;
  reward?: number;
  rejectionReason?: string;
  cloudinaryUrl?: string;
}

export default function MySubmissionsPage() {
  const { user, getAuthToken, refreshProfile } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSubmissions = async () => {
    const token = getAuthToken();
    if (!token) {
      console.error('No auth token available');
      setLoading(false);
      return;
    }

    if (!user?.id) {
      console.log('User not loaded yet, attempting refresh...');
      try {
        setIsRefreshing(true);
        await refreshProfile();
      } catch (error) {
        console.error('Failed to refresh user:', error);
      } finally {
        setIsRefreshing(false);
        setLoading(false);
      }
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/submissions/user/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      } else {
        console.error('Failed to fetch submissions:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [user?.id]);

  const handleRefreshUser = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setIsRefreshing(false);
  };
  
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Загрузка профиля...</p>
        </div>
      </div>
    );
  }
  
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'gold-kill': 'Золотой килл',
      'silver-kill': 'Серебрянный килл',
      'bronze-kill': 'Бронзовый килл',
      'victory': 'Победа',
      'funny': 'Другое'
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'gold-kill': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/40',
      'silver-kill': 'text-gray-300 bg-gray-400/10 border-gray-400/40',
      'bronze-kill': 'text-orange-400 bg-orange-500/10 border-orange-500/40',
      'victory': 'text-primary bg-primary/10 border-primary/40',
      'funny': 'text-purple-400 bg-purple-500/10 border-purple-500/40'
    };
    return colors[category] || 'text-muted-foreground bg-muted/10 border-border';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'На модерации',
      'approved': 'Одобрено',
      'rejected': 'Отклонено'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/40',
      'approved': 'text-green-400 bg-green-500/10 border-green-500/40',
      'rejected': 'text-red-400 bg-red-500/10 border-red-500/40'
    };
    return colors[status] || 'text-muted-foreground bg-muted/10 border-border';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredSubmissions = submissions
    .filter(sub => filter === 'all' || sub.status === filter)
    .filter(sub => 
      searchQuery === '' || 
      sub.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCategoryLabel(sub.category).toLowerCase().includes(searchQuery.toLowerCase())
    );

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
    totalEarnings: submissions
      .filter(s => s.status === 'approved' && s.reward)
      .reduce((sum, s) => sum + (s.reward || 0), 0)
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5 animate-gradient"></div>
      
      {/* Decorative glow elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/30 rounded-full animate-float"></div>
        <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-purple-500/20 rounded-full animate-float-delayed"></div>
        <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-blue-500/30 rounded-full animate-float"></div>
        <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-primary/20 rounded-full animate-float-delayed"></div>
      </div>

      {/* Header */}
      <Header
        user={user}
        onPremiumClick={() => {}}
        onBalanceClick={() => setBalanceModalOpen(true)}
        onProfileClick={() => setProfileOpen(true)}
        onRefreshUser={async () => {
          setIsRefreshing(true);
          await refreshProfile();
          setIsRefreshing(false);
        }}
        isRefreshing={isRefreshing}
        onMySubmissionsClick={() => window.location.href = '/my-submissions'}
      />

      {/* Main Content */}
      <main className="relative z-10 flex-1 py-8">
        <div className="container mx-auto px-4 w-full max-w-[1400px]">
          {/* Title Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm hover:bg-primary/15 transition-colors mb-4">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">Твоя история</span>
            </div>
            
            <div className="space-y-3 mb-4">
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text">
                Мои заявки
              </h1>
              <div className="h-1 w-32 bg-gradient-to-r from-primary to-purple-500 rounded-full mx-auto"></div>
            </div>
            
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Отслеживай статус своих отправленных заявок
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md p-6">
              <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/10 rounded-full blur-2xl"></div>
              <Trophy className="h-6 w-6 text-blue-400 mb-2" />
              <div className="text-3xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Всего</div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md p-6">
              <div className="absolute top-0 right-0 h-24 w-24 bg-yellow-500/10 rounded-full blur-2xl"></div>
              <Clock className="h-6 w-6 text-yellow-400 mb-2" />
              <div className="text-3xl font-bold">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">На модерации</div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md p-6">
              <div className="absolute top-0 right-0 h-24 w-24 bg-green-500/10 rounded-full blur-2xl"></div>
              <CheckCircle className="h-6 w-6 text-green-400 mb-2" />
              <div className="text-3xl font-bold">{stats.approved}</div>
              <div className="text-sm text-muted-foreground">Одобрено</div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md p-6">
              <div className="absolute top-0 right-0 h-24 w-24 bg-red-500/10 rounded-full blur-2xl"></div>
              <XCircle className="h-6 w-6 text-red-400 mb-2" />
              <div className="text-3xl font-bold">{stats.rejected}</div>
              <div className="text-sm text-muted-foreground">Отклонено</div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md p-6">
              <div className="absolute top-0 right-0 h-24 w-24 bg-primary/10 rounded-full blur-2xl"></div>
              <DollarSign className="h-6 w-6 text-primary mb-2" />
              <div className="text-3xl font-bold">{stats.totalEarnings}</div>
              <div className="text-sm text-muted-foreground">Заработано ₽</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className="h-9"
              >
                Все ({stats.total})
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
                className="h-9"
              >
                <Clock className="h-4 w-4 mr-1.5" />
                На модерации ({stats.pending})
              </Button>
              <Button
                variant={filter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('approved')}
                className="h-9"
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Одобрено ({stats.approved})
              </Button>
              <Button
                variant={filter === 'rejected' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('rejected')}
                className="h-9"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Отклонено ({stats.rejected})
              </Button>
            </div>

            <div className="lg:ml-auto flex-1 lg:flex-initial lg:w-80">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-[999]" />
                <input
                  type="text"
                  placeholder="Поиск по названию или категории..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-10 pr-4 rounded-lg bg-card/30 border border-border/50 backdrop-blur-sm focus:border-primary/50 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Submissions List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-muted-foreground">Загрузка заявок...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg text-muted-foreground">
                {searchQuery || filter !== 'all' ? 'Ничего не найдено' : 'У тебя еще нет отправленных заявок'}
              </p>
              {!searchQuery && filter === 'all' && (
                <Button
                  onClick={() => window.location.href = '/'}
                  className="mt-4"
                >
                  Отправить первую заявку
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md p-6 hover:border-primary/30 transition-all duration-300 group"
                >
                  <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="grid lg:grid-cols-[auto_1fr_auto] gap-6 items-start">
                    {/* Preview */}
                    <div className="relative">
                      <div className="w-32 h-32 rounded-xl bg-black/40 border border-white/10 overflow-hidden">
                        {submission.cloudinaryUrl ? (
                          submission.fileType === 'video' ? (
                            <video
                              src={submission.cloudinaryUrl}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={submission.cloudinaryUrl}
                              alt={submission.originalFilename}
                              className="w-full h-full object-cover"
                            />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {submission.fileType === 'video' ? (
                              <FileVideo className="h-12 w-12 text-muted-foreground/30" />
                            ) : (
                              <FileImage className="h-12 w-12 text-muted-foreground/30" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-3 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">{submission.originalFilename}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={cn("px-2 py-0.5 text-xs border", getCategoryColor(submission.category))}>
                              {getCategoryLabel(submission.category)}
                            </Badge>
                            <Badge className={cn("px-2 py-0.5 text-xs border flex items-center gap-1", getStatusColor(submission.status))}>
                              {getStatusIcon(submission.status)}
                              {getStatusLabel(submission.status)}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {submission.additionalText && submission.additionalText !== '-' && (
                        <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                          <p className="text-sm text-muted-foreground">{submission.additionalText}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(submission.createdAt)}</span>
                        </div>
                        {submission.fileType === 'video' ? (
                          <div className="flex items-center gap-1.5">
                            <FileVideo className="h-4 w-4" />
                            <span>Видео</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <FileImage className="h-4 w-4" />
                            <span>Изображение</span>
                          </div>
                        )}
                      </div>

                      {submission.status === 'approved' && submission.reward && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                          <DollarSign className="h-5 w-5 text-green-400" />
                          <span className="text-lg font-semibold text-green-400">+{submission.reward} ₽</span>
                        </div>
                      )}

                      {submission.status === 'rejected' && submission.rejectionReason && (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium text-red-400 mb-1">Причина отклонения:</div>
                              <p className="text-sm text-red-400/80">{submission.rejectionReason}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-15px) translateX(10px); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
          animation-delay: 2s;
        }
        
        @keyframes gradient {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        .animate-gradient {
          animation: gradient 8s ease-in-out infinite;
        }

        .delay-500 {
          animation-delay: 0.5s;
        }

        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}