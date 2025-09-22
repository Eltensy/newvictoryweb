import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, FileVideo, FileImage } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  additionalText: string;
  onAdditionalTextChange: (text: string) => void;
  isSubmitting: boolean;
}

export default function FileUpload({ 
  selectedFile, 
  onFileSelect, 
  additionalText,
  onAdditionalTextChange,
  isSubmitting 
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
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
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        onFileSelect(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
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

  return (
    <div className="space-y-6">
      {/* File Upload Zone */}
      <div>
        <Label className="text-lg font-gaming mb-4 block">Файл</Label>
        <div
          className={cn(
            "border-2 border-dashed rounded-lg text-center transition-all duration-300 min-h-[350px] flex flex-col justify-center bg-card/50 backdrop-blur-sm",
            isDragOver 
              ? "border-primary bg-primary/10 scale-[1.02]" 
              : "border-border hover:border-primary/50 hover:bg-card/70"
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
                  onFileSelect(null);
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

      {/* Additional Text Area */}
      <div>
        <Textarea
          placeholder="Введите дополнительный текст (необязательно)"
          value={additionalText}
          onChange={(e) => onAdditionalTextChange(e.target.value)}
          disabled={isSubmitting}
          className="min-h-[100px] resize-none bg-card/50 border-border backdrop-blur-sm"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground mt-2 text-right m-2">
          {additionalText.length}/500
        </p>
      </div>
    </div>
  );
}