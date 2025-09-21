import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import mapBackground from "@assets/generated_images/bg.jpg";
import epiclogo from "@assets/generated_images/epiclogo.png";
import { Play, Users, Trophy } from "lucide-react";

interface HeroSectionProps {
  onEpicLogin: () => void;
  isLoading: boolean;
}

export default function HeroSection({ onEpicLogin, isLoading }: HeroSectionProps) {
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
              onClick={onEpicLogin}
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
        <MapSection />
      </div>
    </div>
  );
}

function MapSection() {
  return (
    <section className="min-h-screen flex items-center relative overflow-hidden h-screen snap-start flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${mapBackground})` }}
      >
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
  );
}