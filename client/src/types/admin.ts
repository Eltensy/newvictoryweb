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
  telegramUsername?: string;
  telegramChatId?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  telegramPhotoUrl?: string;
  
  // Discord OAuth
  discordUsername?: string;
  discordId?: string;
  discordEmail?: string;
  discordAvatar?: string;
  
  isAdmin: boolean;
  email?: string;
  epicGamesId?: string;
  premiumTier?: 'none' | 'basic' | 'gold' | 'platinum' | 'vip';
  premiumEndDate?: string;
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
    telegramUsername?: string;
    cardNumber?: string;
    cardHolder?: string;
    cardCountry?: string;
    walletAddress?: string;
    currency?: string;
    email?: string;
    paypalEmail?: string;
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

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  mapUrl: string | null;
  rules: string | null;
  prize: number;
  entryFee: number;
  registrationStartDate: string;
  registrationEndDate: string;
  startDate: string;
  endDate: string | null;
  maxParticipants: number | null;
  currentParticipants: number;
  status: 'upcoming' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled';
  imageUrl: string | null;
  cloudinaryPublicId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type TabType = 'submissions' | 'users' | 'subscriptions' | 'withdrawals' | 'premium' | 'tournaments' | 'logs' | 'dropmap';

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
  tournaments: Tournament[];
  tournamentsLoading: boolean;
  
  submissions: Submission[];
  users: User[];
  withdrawalRequests: WithdrawalRequest[];
  subscriptionScreenshots: SubscriptionScreenshot[];
  adminActions: AdminAction[];

  submissionsLoading: boolean;
  usersLoading: boolean;
  withdrawalsLoading: boolean;
  subscriptionsLoading: boolean;
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