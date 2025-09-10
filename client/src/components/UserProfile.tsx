import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  User, 
  Settings, 
  Ticket, 
  FileVideo, 
  FileImage, 
  Trophy, 
  Target, 
  Zap, 
  MessageCircle,
  Check,
  X,
  Clock,
  Link,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserTicket {
  id: string;
  filename: string;
  category: string;
  type: 'image' | 'video';
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reward?: number;
}

export default function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const [telegramUsername, setTelegramUsername] = useState("");
  const [isLinkingTelegram, setIsLinkingTelegram] = useState(false);
  const [isTelegramLinked, setIsTelegramLinked] = useState(false);

  // TODO: remove mock functionality - replace with real user data
  const mockUser = {
    username: "GamerPro2024",
    balance: 2450,
    totalSubmissions: 8,
    approvedSubmissions: 5,
    pendingSubmissions: 2,
    rejectedSubmissions: 1,
    joinedAt: "2024-01-01T00:00:00Z"
  };

  const mockTickets: UserTicket[] = [
    {
      id: '1',
      filename: 'epic_kill.mp4',
      category: 'gold-kill',
      type: 'video',
      status: 'approved',
      submittedAt: '2024-01-15T10:30:00Z',
      reward: 500
    },
    {
      id: '2',
      filename: 'victory_royale.png',
      category: 'victory',
      type: 'image',
      status: 'pending',
      submittedAt: '2024-01-14T15:20:00Z'
    },
    {
      id: '3',
      filename: 'funny_fail.mp4',
      category: 'funny',
      type: 'video',
      status: 'rejected',
      submittedAt: '2024-01-13T09:45:00Z'
    },
    {
      id: '4',
      filename: 'headshot.jpg',
      category: 'gold-kill',
      type: 'image',
      status: 'approved',
      submittedAt: '2024-01-12T18:10:00Z',
      reward: 300
    },
    {
      id: '5',
      filename: 'clutch_moment.mp4',
      category: 'victory',
      type: 'video',
      status: 'pending',
      submittedAt: '2024-01-11T14:30:00Z'
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
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />На рассмотрении</Badge>;
      case 'approved':
        return <Badge className="bg-gaming-success text-white flex items-center gap-1"><Check className="h-3 w-3" />Одобрено</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1"><X className="h-3 w-3" />Отклонено</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleLinkTelegram = () => {
    if (telegramUsername.trim()) {
      console.log('Linking Telegram:', telegramUsername);
      // TODO: remove mock functionality - replace with real Telegram linking
      setIsLinkingTelegram(true);
      setTimeout(() => {
        setIsTelegramLinked(true);
        setIsLinkingTelegram(false);
      }, 2000);
    }
  };

  const handleUnlinkTelegram = () => {
    console.log('Unlinking Telegram');
    // TODO: remove mock functionality - replace with real Telegram unlinking
    setIsTelegramLinked(false);
    setTelegramUsername("");
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-gaming flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            Профиль пользователя
          </DialogTitle>
          <DialogDescription>
            Управляй своим профилем и просматривай историю заявок
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold font-gaming text-primary">{mockUser.balance}₽</div>
                <div className="text-sm text-muted-foreground">Баланс</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold font-gaming">{mockUser.totalSubmissions}</div>
                <div className="text-sm text-muted-foreground">Всего заявок</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold font-gaming text-gaming-success">{mockUser.approvedSubmissions}</div>
                <div className="text-sm text-muted-foreground">Одобрено</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold font-gaming text-gaming-warning">{mockUser.pendingSubmissions}</div>
                <div className="text-sm text-muted-foreground">На рассмотрении</div>
              </CardContent>
            </Card>
          </div>

          {/* Telegram Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="font-gaming flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-gaming-secondary" />
                Уведомления в Telegram
              </CardTitle>
              <CardDescription>
                Получай уведомления о статусе своих заявок в Telegram
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isTelegramLinked ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="telegram">Имя пользователя в Telegram</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="telegram"
                        placeholder="@username"
                        value={telegramUsername}
                        onChange={(e) => setTelegramUsername(e.target.value)}
                        data-testid="input-telegram"
                      />
                      <Button 
                        onClick={handleLinkTelegram}
                        disabled={!telegramUsername.trim() || isLinkingTelegram}
                        className="font-gaming"
                        data-testid="button-link-telegram"
                      >
                        {isLinkingTelegram ? (
                          <>
                            <Bell className="h-4 w-4 mr-2 animate-pulse" />
                            Привязка...
                          </>
                        ) : (
                          <>
                            <Link className="h-4 w-4 mr-2" />
                            Привязать
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    После привязки напиши боту @GameRewardsBot команду /start
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-gaming-success/10 rounded-lg border border-gaming-success/20">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-gaming-success" />
                    <div>
                      <div className="font-medium">Telegram привязан</div>
                      <div className="text-sm text-muted-foreground">{telegramUsername}</div>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={handleUnlinkTelegram}
                    data-testid="button-unlink-telegram"
                  >
                    Отвязать
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tickets History */}
          <Card>
            <CardHeader>
              <CardTitle className="font-gaming flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                История заявок
              </CardTitle>
              <CardDescription>
                Все твои отправленные заявки
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Файл</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Награда</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {ticket.type === 'video' ? (
                            <FileVideo className="h-4 w-4 text-gaming-primary" />
                          ) : (
                            <FileImage className="h-4 w-4 text-gaming-secondary" />
                          )}
                          <span className="font-medium">{ticket.filename}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(ticket.category)}
                          {getCategoryLabel(ticket.category)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell>
                        {new Date(ticket.submittedAt).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell>
                        {ticket.reward ? (
                          <Badge variant="secondary" className="font-gaming">
                            +{ticket.reward}₽
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}