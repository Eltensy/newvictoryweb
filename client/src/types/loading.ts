// types/loading.ts (опционально для типизации)

export interface LoadingScreenProps {
  message?: string;
  showProgress?: boolean;
  showDots?: boolean;
  minDuration?: number;
}

export interface UseLoadingOptions {
  minLoadingTime?: number;
  checkImages?: boolean;
  checkFonts?: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  progress: number;
  stage: 'initializing' | 'loading-resources' | 'loading-images' | 'finishing';
}

export type LoadingStage = 'dom' | 'resources' | 'images' | 'fonts' | 'complete';