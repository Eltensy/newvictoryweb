import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trophy, Target, Zap, Users, ArrowRight, Play, Upload, FileVideo, FileImage, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import mapBackground from "@assets/generated_images/bg.jpg";
import epiclogo from "@assets/generated_images/epiclogo.png";
import UserProfile from "./UserProfile";
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import { c } from "node_modules/vite/dist/node/types.d-aGj9QkWt";

interface User {
  id: string;
  username: string;
  displayName: string;
  balance: number;
  isAdmin: boolean;
}

export default function LandingPage() {
  const { user: authUser, isLoggedIn, getAuthToken, login, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const currentUser = authUser; 

  const [location, setLocation] = useLocation(); // useLocation из Wouter

  useEffect(() => {
  const handleEpicCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');

    if (authStatus === 'success' && token && userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        console.log('Decoded userData:', userData);

        // Используй login из верхнего уровня
        login(userData, token);

        // Очистка URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      } catch (err) {
        console.error('Failed to parse user data:', err);
      }
    }
    setIsLoading(false);
  };

  handleEpicCallback();
}, [login]);

  const handleAuthError = (message: string) => {
    console.error('Auth error:', message);
    // You could show a toast notification here
    alert(`Authentication failed: ${message}`);
    
    // Clean up URL
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  };

  const handleEpicLogin = async () => {
    console.log("Epic Games login triggered");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/epic/login");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();

      // Перенаправляем пользователя на Epic Games
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Epic login error:', error);
      alert('Failed to initialize Epic Games login. Please try again.');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout(); // хук сам обнуляет user и токен
    setIsProfileOpen(false); // закрываем профиль
    console.log("User logged out");
  };

  // Show loading state while processing authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Logging you in...</p>
        </div>
      </div>
    );
  }

   if (isLoggedIn && currentUser) {
  return (
    <LoggedInSubmissionPage 
      user={currentUser} 
      profileOpen={isProfileOpen} 
      setProfileOpen={setIsProfileOpen}
      onLogout={() => {
        setIsProfileOpen(false);
        logout();
      }}
      getAuthToken={getAuthToken} // <-- вот это ключевое
    />
  );
}
  return (
      
      <div className="min-h-screen bg-background">
        {/* Glassmorphism Hero Section */}
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden h-screen snap-start flex items-center justify-center">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent)]"></div>
          
          {/* Content */}
          <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="text-sm font-gaming mb-4">
                UEFN нового поколения
              </Badge>
              <h1 className="text-5xl md:text-7xl font-bold font-gaming bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                ContestGG
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Играй на нашей карте и получай награды за свои результаты!
              </p>
            </div>

            {/* Epic Games Login Button */}
            <div className="space-y-6">
              <Button 
                size="lg" 
                className="text-lg px-12 py-6 bg-primary hover:bg-primary/90 font-gaming hover-elevate"
                onClick={handleEpicLogin}
                disabled={isLoading}
                data-testid="button-epic-login"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm flex items-center justify-center">
                    <div className="flex items-center"> 
                      <img src={epiclogo} alt="Logo" className="h-24 w-24 object-contain" />
                    </div>
                  </div>
                  {isLoading ? 'Подключение...' : 'Войти через Epic Games'}
                  {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
                </div>
              </Button>
              <p className="text-sm text-muted-foreground">
                Безопасная авторизация через Epic Games
              </p>
            </div>
          </div>

      {/* Map Section */}
      <section className="min-h-screen flex items-center relative overflow-hidden h-screen snap-start flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${mapBackground})` }}
        >
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/70"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-12 border border-white/10">
              <h2 className="text-5xl font-bold font-gaming mb-6 text-white">
                Играйте на нашей карте
              </h2>
              <p className="text-white/80 text-xl mb-12">
                Заходи в игру, выигрывай, получай достижения и зарабатывай реальные деньги
              </p>
              
              <div className="grid md:grid-cols-3 gap-8 text-white">
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/30 backdrop-blur-sm flex items-center justify-center mx-auto border border-primary/50">
                    <Play className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold font-gaming">1. Загрузи</h3>
                  <p className="text-white/70">
                    Скриншоты или видео твоих результатов
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gaming-secondary/30 backdrop-blur-sm flex items-center justify-center mx-auto border border-gaming-secondary/50">
                    <Users className="h-8 w-8 text-gaming-secondary" />
                  </div>
                  <h3 className="text-xl font-bold font-gaming">2. Модерация</h3>
                  <p className="text-white/70">
                    Наша команда оценит достоверность и уникальность контента
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gaming-success/30 backdrop-blur-sm flex items-center justify-center mx-auto border border-gaming-success/50">
                    <Trophy className="h-8 w-8 text-gaming-success" />
                  </div>
                  <h3 className="text-xl font-bold font-gaming">3. Получи награду</h3>
                  <p className="text-white/70">
                    Зарабатывай реальные деньги за свою игру
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    </div>
  );
}

interface LoggedInSubmissionPageProps {
  user: User;
  profileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
  onLogout: () => void;
  getAuthToken: () => string | null; // <-- добавляем
}

function LoggedInSubmissionPage({ user, profileOpen, setProfileOpen, onLogout, getAuthToken }: LoggedInSubmissionPageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { id: "gold-kill", label: "Голд килл", icon: Trophy, color: "text-yellow-400", bgColor: "bg-gaming-success/10 border-gaming-success/20" },
    { id: "silver-kill", label: "Серебряный килл", icon: Trophy, color: "text-white-950", bgColor: "bg-gaming-success/10 border-gaming-success/20" },
    { id: "bronze-kill", label: "Бронзовый килл", icon: Trophy, color: "text-yellow-700", bgColor: "bg-gaming-success/10 border-gaming-success/20" },
    { id: "victory", label: "Победа", icon: Target, color: "text-gaming-primary", bgColor: "bg-gaming-primary/10 border-gaming-primary/20" },
    { id: "funny", label: "Другое", icon: Zap, color: "text-gaming-warning", bgColor: "bg-gaming-warning/10 border-gaming-warning/20" },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !selectedCategory) return;
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', selectedCategory);

      const token = getAuthToken(); // <-- достаем токен из хука
      if (!token) {
        alert('Вы не авторизованы');
        return;
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}` // токен корректно вставляем
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Submission successful:", result);
        setIsSubmitted(true);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert(`Failed to submit: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFilePreview = () => {
    if (!selectedFile) return null;

    const isVideo = selectedFile.type.startsWith('video/');
    const fileUrl = URL.createObjectURL(selectedFile);

    return (
      <div className="mt-6 p-4 bg-card/50 rounded-lg border border-border backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-3">
          {isVideo ? (
            <FileVideo className="h-5 w-5 text-gaming-primary" />
          ) : (
            <FileImage className="h-5 w-5 text-gaming-secondary" />
          )}
          <span className="font-medium">{selectedFile.name}</span>
          <Badge variant="secondary" className="font-gaming">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</Badge>
        </div>
        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
          {isVideo ? (
            <video
              src={fileUrl}
              controls
              className="w-full h-full object-cover"
              data-testid="video-preview"
            />
          ) : (
            <img
              src={fileUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              data-testid="image-preview"
            />
          )}
        </div>
      </div>
    );
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center p-8 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
          <div className="w-16 h-16 rounded-full bg-gaming-success/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-gaming-success" />
          </div>
          <h1 className="text-2xl font-bold font-gaming mb-4">Заявка отправлена!</h1>
          <p className="text-muted-foreground mb-6">
            Твой контент отправлен на модерацию. Мы рассмотрим его в течение 24 часов.
          </p>
          <Button 
            onClick={() => {
              setIsSubmitted(false);
              setSelectedFile(null);
              setSelectedCategory("");
            }}
            className="w-full font-gaming"
            data-testid="button-submit-another"
          >
            Вернуться
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold font-gaming">ContestGG</span>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="font-gaming">
              Баланс: {user.balance} ₽
            </Badge>
            <span className="text-sm text-muted-foreground">
              Привет, {user.displayName}!
            </span>
            <button 
              onClick={() => setProfileOpen(true)}
              className="w-8 h-8 rounded-full bg-primary hover:scale-110 transition-transform duration-200 hover-elevate"
              data-testid="button-profile"
            >
              <span className="sr-only">Открыть профиль</span>
            </button>
            <UserProfile
              isOpen={profileOpen} // вместо isProfileOpen
              onClose={() => setProfileOpen(false)}
              user={user}
              onLogout={onLogout}
              getAuthToken={getAuthToken}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold font-gaming mb-2">
              Готов к загрузке контента?
            </h1>
            <p className="text-muted-foreground text-lg">
              Загружайте свои победы и получай вознаграждения
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* File Upload - Takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="h-full">
                <Label className="text-lg font-gaming mb-4 block">Файл</Label>
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg text-center transition-all duration-300 min-h-[400px] flex flex-col justify-center bg-card/30 backdrop-blur-sm",
                    isDragOver 
                      ? "border-primary bg-primary/10 scale-[1.02]" 
                      : "border-border hover:border-primary/50 hover:bg-card/50"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  data-testid="upload-zone"
                >
                  {!selectedFile ? (
                    <div className="p-8">
                      <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-6 transition-transform duration-300 hover:scale-110" />
                      <div className="space-y-4">
                        <h3 className="text-2xl font-bold font-gaming">
                          Перетащи файл сюда
                        </h3>
                        <p className="text-muted-foreground">
                          или нажми на кнопку ниже
                        </p>
                        <Button
                          size="lg"
                          onClick={() => fileInputRef.current?.click()}
                          className="font-gaming hover-elevate"
                          data-testid="button-select-file"
                          disabled={isSubmitting}
                        >
                          Выбрать файл
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          Поддерживаются: PNG, JPG, MP4, MOV (макс. 50 МБ)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6">
                      {renderFilePreview()}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="mt-4 font-gaming"
                        disabled={isSubmitting}
                      >
                        Выбрать другой файл
                      </Button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Category Selection Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-4">
                <div>
                  <Label className="text-lg font-gaming mb-4 block">Категория</Label>
                </div>

                <RadioGroup value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-4">
                  {categories.map((category) => (
                    <div key={category.id}>
                      <label 
                        htmlFor={category.id} 
                        className={cn(
                          "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 hover-elevate",
                          selectedCategory === category.id 
                            ? category.bgColor + " border-current" 
                            : "border-border bg-card/30 hover:bg-card/50"
                        )}
                      >
                        <RadioGroupItem 
                          value={category.id} 
                          id={category.id}
                          className="mt-1"
                          data-testid={`radio-${category.id}`}
                          disabled={isSubmitting}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <category.icon className={cn("h-6 w-6", category.color)} />
                            <span className="font-gaming font-semibold">{category.label}</span>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </RadioGroup>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    size="lg"
                    className="w-full text-lg py-6 font-gaming hover-elevate"
                    disabled={!selectedFile || !selectedCategory || isSubmitting}
                    onClick={handleSubmit}
                    data-testid="button-submit"
                  >
                    {isSubmitting ? 'Отправка...' :
                     !selectedFile ? 'Выбери файл' : 
                     !selectedCategory ? 'Выбери категорию' : 
                     'Отправить на модерацию'}
                  </Button>
                  
                  {selectedFile && selectedCategory && !isSubmitting && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Все готово к отправке!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}