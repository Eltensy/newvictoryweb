import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, FileVideo, FileImage, Trophy, Target, Zap, CheckCircle, ArrowLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubmissionFormProps {
  onBack?: () => void;
  user?: any;
  getAuthToken?: () => string | null;
  onRefreshUser?: () => Promise<void>;
}

export default function SubmissionForm({ onBack, user, getAuthToken, onRefreshUser }: SubmissionFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [additionalText, setAdditionalText] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { id: "gold-kill", label: "Голд килл", icon: Trophy, color: "text-yellow-400", bgColor: "bg-yellow-500/10 border-yellow-500/40", hoverColor: "hover:border-yellow-500/60" },
    { id: "silver-kill", label: "Серебрянный килл", icon: Trophy, color: "text-gray-300", bgColor: "bg-gray-400/10 border-gray-400/40", hoverColor: "hover:border-gray-400/60" },
    { id: "bronze-kill", label: "Бронзовый килл", icon: Trophy, color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/40", hoverColor: "hover:border-orange-500/60" },
    { id: "victory", label: "Победа", icon: Target, color: "text-primary", bgColor: "bg-primary/10 border-primary/40", hoverColor: "hover:border-primary/60" },
    { id: "other", label: "Другое", icon: Zap, color: "text-purple-400", bgColor: "bg-purple-500/10 border-purple-500/40", hoverColor: "hover:border-purple-500/60" },
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
    if (!getAuthToken || !user) {
      alert('Ошибка авторизации');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', selectedCategory);
      formData.append('additionalText', additionalText.trim() || '-');

      const token = getAuthToken();
      const response = await fetch(`/api/user/${user.id}/submissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setIsSubmitted(true);
        if (onRefreshUser) {
          await onRefreshUser();
        }
      } else {
        const error = await response.json();
        alert(`Ошибка отправки: ${error.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Произошла ошибка при отправке');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFilePreview = () => {
    if (!selectedFile) return null;

    const isVideo = selectedFile.type.startsWith('video/');
    const fileUrl = URL.createObjectURL(selectedFile);

    return (
      <div className="mt-6 p-6 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          {isVideo ? (
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <FileVideo className="h-5 w-5 text-primary" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FileImage className="h-5 w-5 text-blue-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-white">{selectedFile.name}</p>
            <p className="text-sm text-white/60">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
        </div>
        <div className="aspect-video bg-black/60 rounded-xl overflow-hidden border border-white/10">
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
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-green-500/5 animate-gradient"></div>
        <div className="absolute top-20 left-20 w-72 h-72 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="max-w-md mx-auto text-center p-12 bg-card/30 backdrop-blur-md rounded-2xl border border-border">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/30 to-green-500/10 flex items-center justify-center mx-auto mb-6 border border-green-500/40">
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Заявка отправлена!</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Твой контент отправлен на модерацию. Мы рассмотрим его в течение 24 часов.
            </p>
            <Button 
              onClick={() => {
                setIsSubmitted(false);
                setSelectedFile(null);
                setSelectedCategory("");
                setAdditionalText("");
              }}
              size="lg"
              className="w-full h-14 text-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02]"
              data-testid="button-submit-another"
            >
              Отправить еще один
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5 animate-gradient"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/20 backdrop-blur-md sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBack} 
                data-testid="button-back"
                className="hover:bg-primary/10 hover:scale-110 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Trophy className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">ContestGG</span>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <Badge variant="secondary" className="px-4 py-2 bg-primary/10 border-primary/20 text-primary font-semibold">
                Баланс: {user.balance} ₽
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-6">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">Загрузи свой момент</span>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text">
              Отправь контент
            </h1>
            <p className="text-xl text-muted-foreground">
              Выбери файл и категорию для отправки на модерацию
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-[60%_40%] gap-8">
            {/* File Upload */}
            <div className="space-y-6">
              <div className="bg-card/30 backdrop-blur-sm rounded-2xl border border-border/50 p-6">
                <Label className="text-lg font-semibold mb-4 block">Файл</Label>
                <div
                  className={cn(
                    "border-2 border-dashed rounded-xl text-center transition-all duration-300 min-h-[400px] flex flex-col justify-center relative overflow-hidden",
                    isDragOver 
                      ? "border-primary bg-primary/5 scale-[1.02]" 
                      : "border-border/50 hover:border-primary/30 bg-black/20"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  data-testid="upload-zone"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none"></div>
                  
                  {!selectedFile ? (
                    <div className="relative z-10 p-8">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 border border-primary/30">
                        <Upload className="h-10 w-10 text-primary" />
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-2xl font-bold">
                          Перетащи файл сюда
                        </h3>
                        <p className="text-muted-foreground">
                          или нажми на кнопку ниже
                        </p>
                        <Button
                          size="lg"
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-105"
                          data-testid="button-select-file"
                        >
                          Выбрать файл
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          Поддерживаются: PNG, JPG, MP4, MOV (макс. 50 МБ)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10 p-6">
                      {renderFilePreview()}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="mt-6 hover:bg-primary/10 hover:border-primary/30 transition-all"
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

              {/* Additional Text */}
              <div className="bg-card/30 backdrop-blur-sm rounded-2xl border border-border/50 p-6">
                <Label className="text-lg font-semibold mb-2 block">
                  Дополнительный текст <span className="text-muted-foreground text-sm font-normal">(необязательно)</span>
                </Label>
                <Textarea
                  placeholder="Опишите свой момент, добавьте контекст или просто оставьте комментарий..."
                  value={additionalText}
                  onChange={(e) => setAdditionalText(e.target.value)}
                  className="min-h-[120px] resize-none bg-black/20 border-border/50 focus:border-primary/50 transition-colors"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {additionalText.length}/500 символов
                </p>
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-6">
              <div className="bg-card/30 backdrop-blur-sm rounded-2xl border border-border/50 p-6 sticky top-24">
                <Label className="text-lg font-semibold mb-2 block">Категория</Label>
                <p className="text-sm text-muted-foreground mb-6">
                  Выбери тип своего игрового момента
                </p>

                <RadioGroup value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-3">
                  {categories.map((category) => (
                    <div key={category.id}>
                      <label 
                        htmlFor={category.id} 
                        className={cn(
                          "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group",
                          selectedCategory === category.id 
                            ? category.bgColor + " border-current backdrop-blur-md" 
                            : "border-border/50 bg-black/20 hover:bg-black/30 " + category.hoverColor
                        )}
                      >
                        <div className={cn(
                          "absolute top-0 right-0 h-20 w-20 rounded-full blur-2xl transition-opacity",
                          category.color.replace('text-', 'bg-') + '/10',
                          selectedCategory === category.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                        )}></div>
                        
                        <RadioGroupItem 
                          value={category.id} 
                          id={category.id}
                          className="mt-1 relative z-10"
                          data-testid={`radio-${category.id}`}
                        />
                        <div className="flex-1 relative z-10">
                          <div className="flex items-center gap-3 mb-1">
                            <category.icon className={cn("h-5 w-5", category.color)} />
                            <span className="font-semibold">{category.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {category.id === 'gold-kill' && 'Эпичные убийства и скиллы'}
                            {category.id === 'silver-kill' && 'Хорошие убийства'}
                            {category.id === 'bronze-kill' && 'Обычные убийства'}
                            {category.id === 'victory' && 'Victory Royale моменты'}
                            {category.id === 'other' && 'Другие игровые моменты'}
                          </p>
                        </div>
                      </label>
                    </div>
                  ))}
                </RadioGroup>

                {/* Submit Button */}
                <div className="pt-6 space-y-3">
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <p className="text-sm text-green-400 text-center flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Все готово к отправке!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
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