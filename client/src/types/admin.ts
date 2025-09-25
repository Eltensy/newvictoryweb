// client/src/types/admin.ts

export interface Submission {
  id: string;
  userId: string;
  filename: string;
  originalFilename: string;
  fileType: 'image' | 'video';
  fileSize: number;
  filePath: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  additionalText?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reward?: number;
  rejectionReason?: string;
  cloudinaryPublicId?: string;
  cloudinaryUrl?: string;
  user?: {
    username: string;
    displayName: string;
    telegramUsername?: string;
  };
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
  telegramUsername: string;
  isAdmin: boolean;
  email?: string;
  epicGamesId?: string;
  // Stats from backend
  stats?: {
    totalSubmissions: number;
    approvedSubmissions: number;
    pendingSubmissions: number;
    rejectedSubmissions: number;
    totalEarnings: number;
  };
}

export interface AdminAction {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
  admin?: {
    username: string;
    displayName: string;
    telegramUsername?: string;
  };
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  method: 'telegram' | 'card' | 'crypto' | 'paypal';
  methodData: {
    // Telegram method
    telegramUsername?: string;
    
    // Card method
    cardNumber?: string;
    cardHolder?: string;
    cardCountry?: string;
    
    // Crypto method
    walletAddress?: string;
    currency?: string;
    
    // PayPal method
    email?: string;
    paypalEmail?: string; // keeping both for backward compatibility
  };
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
  user?: {
    username: string;
    displayName: string;
    telegramUsername?: string;
  };
}

export type TabType = 'submissions' | 'users' | 'withdrawals' | 'subscriptions' | 'logs';

export interface AdminDashboardState {
  activeTab: TabType;
  searchTerm: string;
  statusFilter: string;
  selectedSubmission: Submission | null;
  selectedWithdrawal: WithdrawalRequest | null;
  selectedUser: User | null;
  rewardAmount: string;
  rejectionReason: string;
  balanceAmount: string;
  balanceReason: string;
  
  // Data arrays
  submissions: Submission[];
  users: User[];
  withdrawalRequests: WithdrawalRequest[];
  subscriptionScreenshots: SubscriptionScreenshot[];  // NEW
  adminActions: AdminAction[];

  // Loading states
  submissionsLoading: boolean;
  usersLoading: boolean;
  withdrawalsLoading: boolean;
  subscriptionsLoading: boolean;  // NEW
  logsLoading: boolean;
  actionLoading: boolean;
  
  error: string | null;
}

export interface SubscriptionScreenshot {
  id: string;
  username: string;
  displayName: string;
  subscriptionScreenshotUrl?: string;
  subscriptionScreenshotStatus: 'none' | 'pending' | 'approved' | 'rejected';
  subscriptionScreenshotUploadedAt?: Date;
  subscriptionScreenshotReviewedAt?: Date;
  subscriptionScreenshotReviewedBy?: string;
  subscriptionScreenshotRejectionReason?: string;
  balance: number;
  stats?: {
    totalSubmissions: number;
    approvedSubmissions: number;
    totalEarnings: number;
  };
}