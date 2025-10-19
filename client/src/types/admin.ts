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
  
  // Telegram OAuth
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
  
  // 🆕 Kill Counters (direct fields on user)
  goldKills?: number;
  silverKills?: number;
  bronzeKills?: number;
  totalKills?: number;
  
  isAdmin: boolean;
  email?: string;
  epicGamesId?: string;
  
  // Premium
  premiumTier?: 'none' | 'basic' | 'gold' | 'platinum' | 'vip';
  premiumEndDate?: string;
  premiumStartDate?: string;
  
  // Stats (может содержать те же данные что и выше)
  stats?: {
    totalSubmissions: number;
    approvedSubmissions: number;
    pendingSubmissions: number;
    rejectedSubmissions: number;
    totalEarnings: number;
    goldKills: number;     // 🆕 Duplicate from user level
    silverKills: number;   // 🆕 Duplicate from user level
    bronzeKills: number;   // 🆕 Duplicate from user level
    totalKills: number;    // 🆕 Duplicate from user level
  };
}

// 🆕 Kill History Entry Type
export interface KillHistoryEntry {
  id: string;
  userId: string;
  killType: 'gold' | 'silver' | 'bronze';
  rewardAmount: number;
  submissionId?: string;
  grantedBy?: string;
  reason?: string;
  metadata?: any;
  createdAt: string;
  user?: {
    username: string;
    displayName: string;
  };
  grantedByUser?: {
    username: string;
    displayName: string;
  };
  submission?: {
    category: string;
    originalFilename: string;
  };
}

// 🆕 Kill Stats Type
export interface KillStats {
  goldKills: number;
  silverKills: number;
  bronzeKills: number;
  totalKills: number;
  lastKillDate: Date | null;
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
    premiumBonus?: number;     // 🆕 Premium bonus amount
    finalAmount?: number;       // 🆕 Final amount with bonus
    hasPremium?: boolean;       // 🆕 Had premium at request time
  };
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
  premiumBonus?: number;        // 🆕 At root level too
  finalAmount?: number;         // 🆕 At root level too
  user?: {
    username: string;
    displayName: string;
    telegramUsername?: string;
    premiumTier?: string;       // 🆕
    premiumEndDate?: string;    // 🆕
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
  prizeDistribution?: Record<string, number>; // 🆕 Prize distribution by place
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
  creator?: {
    username: string;
    displayName: string;
  };
}

export type TabType = 'submissions' | 'users' | 'subscriptions' | 'withdrawals' | 'premium' | 'tournaments' | 'logs' | 'dropmap' | 'kills'; // 🆕 Added 'kills' tab

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
  killHistory?: KillHistoryEntry[];  // 🆕 Optional kill history

  submissionsLoading: boolean;
  usersLoading: boolean;
  withdrawalsLoading: boolean;
  subscriptionsLoading: boolean;
  logsLoading: boolean;
  killsLoading?: boolean;           // 🆕 Loading state for kills
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

// 🆕 Premium Status Type
export interface PremiumStatus {
  tier: 'none' | 'basic' | 'gold' | 'platinum' | 'vip';
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  daysRemaining: number;
  autoRenew?: boolean;
  source?: string;
}

// 🆕 Helper type for kill-related UI
export interface KillBadgeProps {
  type: 'gold' | 'silver' | 'bronze';
  count: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

// 🆕 Kill leaderboard entry
export interface KillLeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  goldKills: number;
  silverKills: number;
  bronzeKills: number;
  totalKills: number;
  rank: number;
  premiumTier?: string;
}