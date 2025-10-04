import React from 'react';

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
  showProgress?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Загрузка...", 
  submessage = "Подготавливаем контент для вас...",
  showProgress = true 
}) => {
  return (
    <div className="fixed inset-0 bg-background z-[9999] flex items-center justify-center">
      {/* Background Pattern - единый стиль для всего сайта */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent)]"></div>
      
      <div className="relative max-w-md mx-auto text-center p-8">
        {/* Главный спиннер */}
        <div className="relative mb-8">
          <div className="w-20 h-20 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto"></div>
        </div>
        
        {/* Заголовок */}
        <h1 className="text-3xl font-bold font-gaming mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          ContestGG
        </h1>
        
        {/* Анимированный текст загрузки */}
        <div className="text-foreground text-lg font-gaming mb-6 animate-pulse">
          {message}
        </div>
        
        {/* Прогресс бар в стиле сайта */}
        {showProgress && (
          <div className="w-64 h-2 bg-muted rounded-full mx-auto overflow-hidden mb-4">
            <div className="h-full bg-gradient-to-p from-primary via-gaming-secondary to-gaming-success rounded-full animate-loading-progress"></div>
          </div>
        )}
        
        {/* Дополнительный текст */}
        <div className="text-muted-foreground text-sm">
          {submessage}
        </div>
        
      </div>
    </div>
  );
};

export default LoadingScreen;