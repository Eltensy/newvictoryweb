import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Zap, Users, ArrowRight, Play } from "lucide-react";

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleEpicLogin = () => {
    console.log("Epic Games login triggered");
    // TODO: remove mock functionality - replace with real Epic Games OAuth
    setIsLoggedIn(true);
  };

  const handleSubmissionClick = () => {
    console.log("Navigate to submission form");
    // TODO: remove mock functionality - replace with real navigation
  };

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold font-gaming">GameRewards</span>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="font-gaming">
                Баланс: 2,450 ₽
              </Badge>
              <div className="w-8 h-8 rounded-full bg-primary"></div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div>
              <h1 className="text-4xl font-bold font-gaming mb-4">
                Готов к загрузке контента?
              </h1>
              <p className="text-muted-foreground text-lg">
                Загружай свои лучшие игровые моменты и получай вознаграждения
              </p>
            </div>

            <Button 
              size="lg" 
              className="text-lg px-8 py-6 hover-elevate"
              onClick={handleSubmissionClick}
              data-testid="button-upload-content"
            >
              <Play className="mr-2 h-5 w-5" />
              Загрузить скриншот/клип
            </Button>

            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <Card className="hover-elevate">
                <CardHeader>
                  <Trophy className="h-8 w-8 text-gaming-success mb-2" />
                  <CardTitle className="font-gaming">Голд килл</CardTitle>
                  <CardDescription>Эпичные убийства</CardDescription>
                </CardHeader>
              </Card>
              <Card className="hover-elevate">
                <CardHeader>
                  <Target className="h-8 w-8 text-gaming-primary mb-2" />
                  <CardTitle className="font-gaming">Победа</CardTitle>
                  <CardDescription>Victory Royale моменты</CardDescription>
                </CardHeader>
              </Card>
              <Card className="hover-elevate">
                <CardHeader>
                  <Zap className="h-8 w-8 text-gaming-warning mb-2" />
                  <CardTitle className="font-gaming">Смешной момент</CardTitle>
                  <CardDescription>Забавные ситуации</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Glassmorphism Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent)]"></div>
        
        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-8">
          <div className="space-y-4">
            <Badge variant="secondary" className="text-sm font-gaming mb-4">
              Игровая платформа нового поколения
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold font-gaming bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              GameRewards
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Загружай свои лучшие игровые моменты и получай вознаграждения за каждый эпичный клип
            </p>
          </div>

          {/* Epic Games Login Button */}
          <div className="space-y-6">
            <Button 
              size="lg" 
              className="text-lg px-12 py-6 bg-primary hover:bg-primary/90 font-gaming hover-elevate"
              onClick={handleEpicLogin}
              data-testid="button-epic-login"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                  <span className="text-black font-bold text-xs">E</span>
                </div>
                Войти через Epic Games
                <ArrowRight className="ml-2 h-5 w-5" />
              </div>
            </Button>
            <p className="text-sm text-muted-foreground">
              Безопасная авторизация через Epic Games
            </p>
          </div>
        </div>
      </div>

      {/* Info Sections */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold font-gaming mb-4">Как это работает</h2>
              <p className="text-muted-foreground text-lg">Три простых шага до получения вознаграждения</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="hover-elevate">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                    <Play className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-gaming">1. Загрузи контент</CardTitle>
                  <CardDescription>
                    Загружай скриншоты и видео своих лучших игровых моментов из Fortnite и других игр
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-gaming-secondary/20 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-gaming-secondary" />
                  </div>
                  <CardTitle className="font-gaming">2. Модерация</CardTitle>
                  <CardDescription>
                    Наша команда проверит твой контент и оценит его качество и уникальность
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-gaming-success/20 flex items-center justify-center mb-4">
                    <Trophy className="h-6 w-6 text-gaming-success" />
                  </div>
                  <CardTitle className="font-gaming">3. Получи награду</CardTitle>
                  <CardDescription>
                    За качественный контент ты получишь вознаграждение на свой баланс
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}