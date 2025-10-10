import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Users, Trophy, Sparkles } from "lucide-react";
import mapBackground from "@assets/generated_images/bg.jpg";
import epiclogo from "@assets/generated_images/epiclogo.png";

interface HeroSectionProps {
  onEpicLogin: () => void;
  isLoading: boolean;
}

export default function HeroSection({ onEpicLogin, isLoading }: HeroSectionProps) {
  return (
    <div className="h-screen w-full overflow-hidden bg-background relative">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5 animate-gradient"></div>
      
      <div className="grid lg:grid-cols-[45%_55%] h-full relative z-10">
        {/* Left Side - Login */}
        <div className="relative flex items-center justify-center p-6 lg:p-12">
          {/* Decorative elements */}
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          
          {/* Content */}
          <div className="relative z-10 max-w-lg w-full space-y-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm hover:bg-primary/15 transition-colors">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-medium text-primary">UEFN нового поколения</span>
              </div>
              
              <div className="space-y-3">
                <h1 className="text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text">
                  ContestGG
                </h1>
                <div className="h-1 w-24 bg-gradient-to-r from-primary to-purple-500 rounded-full"></div>
              </div>
              
              <p className="text-xl text-muted-foreground leading-relaxed">
                Играй на нашей карте и получай награды за свои результаты
              </p>
            </div>

            {/* Epic Games Login Button */}
            <div className="space-y-4">
              <Button 
                size="lg" 
                className="w-full h-16 text-lg font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all shadow-2xl shadow-primary/30 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] group"
                onClick={onEpicLogin}
                disabled={isLoading}
                data-testid="button-epic-login"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg p-1">
                    <img src={epiclogo} alt="Epic Games" className="w-full h-full object-contain" />
                  </div>
                  <span>{isLoading ? 'Подключение...' : 'Войти через Epic Games'}</span>
                  {!isLoading && <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />}
                </div>
              </Button>
              
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Безопасная авторизация через Epic Games
              </p>
            </div>

            {/* Stats Preview */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border/50">
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-primary">1000+</div>
                <div className="text-xs text-muted-foreground">Игроков</div>
              </div>
              <div className="text-center space-y-1 border-x border-border/50">
                <div className="text-2xl font-bold text-green-500">₽100K+</div>
                <div className="text-xs text-muted-foreground">Выплачено</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-purple-500">24/7</div>
                <div className="text-xs text-muted-foreground">Поддержка</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Map Info */}
        <div className="relative hidden lg:flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
            style={{ backgroundImage: `url(${mapBackground})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 via-50% to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/50"></div>
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-background/90"></div>
          </div>
          
          {/* Floating particles effect */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/30 rounded-full animate-float"></div>
            <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-purple-500/20 rounded-full animate-float-delayed"></div>
            <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-blue-500/30 rounded-full animate-float"></div>
          </div>
          
          <div className="relative z-10 max-w-xl w-full p-12 space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                Играйте на нашей карте
              </h2>
              <p className="text-white/80 text-lg leading-relaxed">
                Заходи в игру, выигрывай, получай достижения и зарабатывай реальные деньги
              </p>
            </div>
            
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="group relative overflow-hidden rounded-2xl border border-white/10 p-6 hover:border-primary/40 transition-all duration-300 bg-black/30 backdrop-blur-md hover:bg-black/40">
                <div className="absolute top-0 right-0 h-20 w-20 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors"></div>
                <div className="relative flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-primary/40 group-hover:scale-110 transition-transform">
                    <Play className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 text-white">1. Загрузи</h3>
                    <p className="text-white/70 text-sm leading-relaxed">
                      Скриншоты или видео твоих результатов
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="group relative overflow-hidden rounded-2xl border border-white/10 p-6 hover:border-blue-500/40 transition-all duration-300 bg-black/30 backdrop-blur-md hover:bg-black/40">
                <div className="absolute top-0 right-0 h-20 w-20 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
                <div className="relative flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-500/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-blue-500/40 group-hover:scale-110 transition-transform">
                    <Users className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 text-white">2. Модерация</h3>
                    <p className="text-white/70 text-sm leading-relaxed">
                      Наша команда оценит достоверность и уникальность контента
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="group relative overflow-hidden rounded-2xl border border-white/10 p-6 hover:border-green-500/40 transition-all duration-300 bg-black/30 backdrop-blur-md hover:bg-black/40">
                <div className="absolute top-0 right-0 h-20 w-20 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-colors"></div>
                <div className="relative flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/30 to-green-500/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-green-500/40 group-hover:scale-110 transition-transform">
                    <Trophy className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 text-white">3. Получи награду</h3>
                    <p className="text-white/70 text-sm leading-relaxed">
                      Зарабатывай реальные деньги за свою игру
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
      `}</style>
    </div>
  );
}