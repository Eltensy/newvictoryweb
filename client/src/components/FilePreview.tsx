// client/src/components/FilePreview.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Submission } from "@/types/admin";

interface FilePreviewProps {
  submission: Submission;
}

export function FilePreview({ submission }: FilePreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Для Cloudinary файлов используем прямые URL
  const isCloudinaryFile = submission.filePath?.startsWith('https://res.cloudinary.com') ||
    submission.cloudinaryUrl;

  const fileUrl = submission.cloudinaryUrl || submission.filePath || `/api/files/${submission.id}`;

  const retryLoad = () => {
    setImageError(false);
    setLoading(true);
  };

  const handleLoad = () => {
    setLoading(false);
    console.log('✅ File loaded successfully for submission:', submission.id);
  };

  const handleError = () => {
    console.error('❌ File rendering failed for submission:', submission.id);
    setImageError(true);
    setLoading(false);
  };

  return (
    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-10">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-sm">Загрузка файла...</span>
        </div>
      )}

      {submission.fileType === "image" ? (
        <>
          {!imageError ? (
            <img
              src={fileUrl}
              alt={submission.originalFilename || submission.filename}
              className="object-contain w-full h-full"
              onLoad={handleLoad}
              onError={handleError}
              style={{ display: loading ? 'none' : 'block' }}
              crossOrigin={isCloudinaryFile ? "anonymous" : undefined}
            />
          ) : (
            <div className="text-center p-4 space-y-3">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Не удалось загрузить изображение
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {submission.originalFilename || submission.filename}
                </p>

                <div className="mt-3 p-2 bg-muted rounded text-xs text-left">
                  <p><strong>ID:</strong> {submission.id}</p>
                  <p><strong>Файл:</strong> {submission.filename}</p>
                  <p><strong>URL:</strong> {fileUrl}</p>
                  {submission.cloudinaryPublicId && (
                    <p><strong>Cloudinary ID:</strong> {submission.cloudinaryPublicId}</p>
                  )}
                  <p><strong>Тип:</strong> {isCloudinaryFile ? 'Cloudinary' : 'Local'}</p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryLoad}
                  className="mt-2"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Повторить
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {!imageError ? (
            <video
              src={fileUrl}
              controls
              className="object-contain w-full h-full"
              onLoadedMetadata={handleLoad}
              onError={handleError}
              style={{ display: loading ? 'none' : 'block' }}
              crossOrigin={isCloudinaryFile ? "anonymous" : undefined}
            />
          ) : (
            <div className="text-center p-4 space-y-3">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Не удалось загрузить видео
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {submission.originalFilename || submission.filename}
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryLoad}
                  className="mt-2"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Повторить
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="absolute top-2 right-2">
        <Badge
          variant={isCloudinaryFile ? "default" : "secondary"}
          className="text-xs"
        >
          {isCloudinaryFile ? "☁️" : "💾"}
        </Badge>
      </div>
    </div>
  );
}