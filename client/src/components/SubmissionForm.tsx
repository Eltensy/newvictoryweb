import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, FileVideo, FileImage, Trophy, Target, Zap, CheckCircle, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubmissionFormProps {
  onBack?: () => void;
}

export default function SubmissionForm({ onBack }: SubmissionFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { id: "gold-kill", label: "Голд килл", icon: Trophy, color: "text-gaming-success" },
    { id: "victory", label: "Победа", icon: Target, color: "text-gaming-primary" },
    { id: "funny", label: "Смешной момент", icon: Zap, color: "text-gaming-warning" },
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

  const handleSubmit = () => {
    if (selectedFile && selectedCategory) {
      console.log("Submitting:", { file: selectedFile.name, category: selectedCategory });
      // TODO: remove mock functionality - replace with real submission
      setIsSubmitted(true);
    }
  };

  const renderFilePreview = () => {
    if (!selectedFile) return null;

    const isVideo = selectedFile.type.startsWith('video/');
    const fileUrl = URL.createObjectURL(selectedFile);

    return (
      <div className="mt-6 p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-3 mb-3">
          {isVideo ? (
            <FileVideo className="h-5 w-5 text-gaming-primary" />
          ) : (
            <FileImage className="h-5 w-5 text-gaming-secondary" />
          )}
          <span className="font-medium">{selectedFile.name}</span>
          <Badge variant="secondary">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</Badge>
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
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <div className="w-16 h-16 rounded-full bg-gaming-success/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-gaming-success" />
            </div>
            <CardTitle className="font-gaming">Заявка отправлена!</CardTitle>
            <CardDescription>
              Твой контент отправлен на модерацию. Мы рассмотрим его в течение 24 часов.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => {
                setIsSubmitted(false);
                setSelectedFile(null);
                setSelectedCategory("");
              }}
              className="w-full"
              data-testid="button-submit-another"
            >
              Отправить еще один
            </Button>
          </CardContent>
        </Card>
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
              <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
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
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold font-gaming mb-2">
              Загрузи свой контент
            </h1>
            <p className="text-muted-foreground">
              Выбери файл и категорию для отправки на модерацию
            </p>
          </div>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="font-gaming">Файл</CardTitle>
              <CardDescription>
                Загрузи скриншот или видео (макс. 50 МБ)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  isDragOver 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                data-testid="upload-zone"
              >
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    Перетащи файл сюда или
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-select-file"
                  >
                    Выбери файл
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Поддерживаются: PNG, JPG, MP4, MOV
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {renderFilePreview()}
            </CardContent>
          </Card>

          {/* Category Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="font-gaming">Категория</CardTitle>
              <CardDescription>
                Выбери тип своего игрового момента
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedCategory} onValueChange={setSelectedCategory}>
                <div className="grid gap-4">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-3">
                      <RadioGroupItem 
                        value={category.id} 
                        id={category.id}
                        data-testid={`radio-${category.id}`}
                      />
                      <Label 
                        htmlFor={category.id} 
                        className="flex items-center gap-3 cursor-pointer flex-1 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <category.icon className={cn("h-5 w-5", category.color)} />
                        <span className="font-gaming">{category.label}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            size="lg"
            className="w-full text-lg py-6 font-gaming hover-elevate"
            disabled={!selectedFile || !selectedCategory}
            onClick={handleSubmit}
            data-testid="button-submit"
          >
            Отправить на модерацию
          </Button>
        </div>
      </main>
    </div>
  );
}