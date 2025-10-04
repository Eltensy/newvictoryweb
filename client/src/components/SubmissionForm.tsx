import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, FileVideo, FileImage, Trophy, Target, Zap, CheckCircle, ArrowLeft } from "lucide-react";
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
    { id: "gold-kill", label: "Голд килл", icon: Trophy, color: "text-gaming-success", bgColor: "bg-gaming-success/10 border-gaming-success/20" },
    { id: "silver-kill", label: "Серебрянный килл", icon: Trophy, color: "text-gray-400", bgColor: "bg-gray-400/10 border-gray-400/20" },
    { id: "bronze-kill", label: "Бронзовый килл", icon: Trophy, color: "text-amber-600", bgColor: "bg-amber-600/10 border-amber-600/20" },
    { id: "victory", label: "Победа", icon: Target, color: "text-gaming-primary", bgColor: "bg-gaming-primary/10 border-gaming-primary/20" },
    { id: "other", label: "Другое", icon: Zap, color: "text-gaming-warning", bgColor: "bg-gaming-warning/10 border-gaming-warning/20" },
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
      // Отправляем "-" если поле пустое (чтобы избежать null/undefined проблем)
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
              setAdditionalText("");
            }}
            className="w-full font-gaming"
            data-testid="button-submit-another"
          >
            Отправить еще один
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
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back" className="hover-elevate">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Trophy className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold font-gaming">GameRewards</span>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <Badge variant="secondary" className="font-gaming">
                Баланс: {user.balance} ₽
              </Badge>
            )}
            <div className="w-8 h-8 rounded-full bg-primary"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold font-gaming mb-2">
              Загрузи свой контент
            </h1>
            <p className="text-muted-foreground text-lg">
              Выбери файл и категорию для отправки на модерацию
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* File Upload - Takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="h-full space-y-6">
                <div>
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

                {/* Additional Text - Optional */}
                <div>
                  <Label className="text-lg font-gaming mb-2 block">
                    Введите дополнительный текст <span className="text-muted-foreground text-sm font-normal">(необязательно)</span>
                  </Label>
                  <Textarea
                    placeholder="Опишите свой момент, добавьте контекст или просто оставьте комментарий..."
                    value={additionalText}
                    onChange={(e) => setAdditionalText(e.target.value)}
                    className="min-h-[100px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {additionalText.length}/500 символов
                  </p>
                </div>
              </div>
            </div>

            {/* Category Selection Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                <div>
                  <Label className="text-lg font-gaming mb-4 block">Категория</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Выбери тип своего игрового момента
                  </p>
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
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <category.icon className={cn("h-6 w-6", category.color)} />
                            <span className="font-gaming font-semibold">{category.label}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
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