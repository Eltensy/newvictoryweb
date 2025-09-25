import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileImage, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubscriptionScreenshotModalProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  user?: {
    subscriptionScreenshotStatus?: string;
    subscriptionScreenshotRejectionReason?: string;
    subscriptionScreenshotReviewedAt?: Date;
  };
}

export default function SubscriptionScreenshotModal({ 
  onUpload, 
  isUploading,
  user 
}: SubscriptionScreenshotModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (file.type.startsWith('image/')) {
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
    if (!selectedFile) return;
    
    try {
      await onUpload(selectedFile);
      setIsSubmitted(true);
      
      // Auto-redirect after successful upload (simulate auto-approval)
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const renderFilePreview = () => {
  if (!selectedFile) return null;

  const fileUrl = URL.createObjectURL(selectedFile);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="flex items-center gap-3 mb-3">
        <FileImage className="h-5 w-5 text-gaming-secondary" />
        <span className="font-medium">{selectedFile.name}</span>
        <span className="text-sm text-muted-foreground">
          {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
        </span>
      </div>
      <div className="flex-1 w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        <img
          src={fileUrl}
          alt="Screenshot preview"
          className="max-h-full max-w-full object-contain"
        />
      </div>
    </div>
  );
};

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center p-8 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
          <div className="w-16 h-16 rounded-full bg-gaming-success/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-gaming-success" />
          </div>
          <h1 className="text-2xl font-bold font-gaming mb-4">Скриншот загружен!</h1>
          <p className="text-muted-foreground mb-6">
            Подписка подтверждена. Перенаправляем на платформу...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
  {/* Background Pattern */}
  <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5"></div>
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent)]"></div>
  
  <div className="relative min-h-screen flex items-center justify-center p-4">
    <div className="max-w-6xl mx-auto w-full">

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold font-gaming mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Загрузи скриншот лайка карты
            </h1>
            <br></br><br></br>
            
            {/* Rejection Notice */}
            {user?.subscriptionScreenshotStatus === 'rejected' && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="font-gaming font-bold text-destructive">Скриншот отклонен</span>
                </div>
                <p className="text-sm text-destructive/80">
                  {user.subscriptionScreenshotRejectionReason || 'Скриншот не соответствует требованиям'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Отклонен: {user.subscriptionScreenshotReviewedAt 
                    ? new Date(user.subscriptionScreenshotReviewedAt).toLocaleString('ru-RU')
                    : 'Неизвестно'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Main Upload and Example Section - Side by Side */}
          <div className="mb-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Upload Area */}
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-gaming font-bold text-center">
                  Загрузи скриншот
                </h2>
                
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg transition-all duration-300 h-96 flex flex-col bg-card/30 backdrop-blur-sm",
                    isDragOver
                      ? "border-primary bg-primary/10 scale-[1.01]"
                      : "border-border hover:border-primary/50 hover:bg-card/50"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {!selectedFile ? (
                    <div className="p-8 text-center flex flex-col justify-center h-full">
                      <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-6 transition-transform duration-300 hover:scale-110" />
                      <h3 className="text-2xl font-bold font-gaming mb-2">Перетащи скриншот сюда</h3>
                      <p className="text-lg text-muted-foreground mb-4">или нажми на кнопку ниже</p>
                      <Button
                        size="lg"
                        onClick={() => fileInputRef.current?.click()}
                        className="font-gaming hover-elevate text-base px-6 py-3"
                        disabled={isUploading}
                      >
                        Выбрать файл
                      </Button>
                      <p className="text-base text-muted-foreground mt-2">
                        Поддерживаются: PNG, JPG (макс. 10 МБ)
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full p-4">
                      {/* Кнопка сверху */}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="mb-3 font-gaming"
                        disabled={isUploading}
                      >
                        Выбрать другой файл
                      </Button>

                      {/* Превью снизу занимает всё оставшееся место */}
                      <div className="flex-1 w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                        <img
                          src={URL.createObjectURL(selectedFile)}
                          alt="Screenshot preview"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

              </div>

              {/* Example Section */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="text-xl font-gaming font-bold text-center">
                  Пример скриншота
                </h2>
                
                <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border p-4 h-96 flex flex-col">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-3">
                    <img
                      src="https://i.ibb.co/wZbvk02q/photo-2025-09-24-20-02-34.jpg"
                      alt="Example subscription screenshot"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback if example.jpg doesn't exist
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <br></br>
                    <h4 className="font-gaming font-bold text-foreground text-base mb-2">
                      Требования к скриншоту:
                    </h4>
                    <p>• Скриншот должен быть четким и читаемым</p>
                    <p>• Виднен лайк на нашей карте в Fortnite</p>
                    <p>• Формат: PNG или JPG</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          

          {/* Warning Message */}
          <div className="bg-gaming-warning/10 border border-gaming-warning/20 rounded-lg p-4 mb-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gaming-warning/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-gaming-warning" />
              </div>
              <div>
                <h3 className="font-gaming font-bold text-base text-gaming-warning mb-1">
                  Важно!
                </h3>
                <p className="text-foreground text-sm">
                  Без подтвержденного лайка на карте доступ к платформе и выплаты невозможны. 
                  Убедись, что вы загружаете собственный и настоящий скриншот. Эти скриншоты будут проверятся при выплате средств.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <Button
              size="lg"
              className="text-lg px-12 py-6 font-gaming hover-elevate min-w-[200px]"
              disabled={!selectedFile || isUploading}
              onClick={handleSubmit}
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                  Загружаем...
                </>
              ) : !selectedFile ? (
                'Выбери скриншот'
              ) : (
                'Подтвердить подписку'
              )}
            </Button>
            
            {selectedFile && !isUploading && (
              <p className="text-sm text-muted-foreground mt-3">
                Подписка будет подтверждена автоматически
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}