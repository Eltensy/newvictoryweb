// client/src/types/admin.ts
export interface Submission {
  id: string;
  userId: string;
  filename: string;
  originalFilename: string;
  fileType: 'image' | 'video';
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reward?: number;
  rejectionReason?: string;
  cloudinaryPublicId?: string;
  cloudinaryUrl?: string;
  filePath: string;
  // User data joined from backend
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
  method: 'telegram' | 'card' | 'paypal';
  methodData: {
    telegramUsername?: string;
    cardNumber?: string;
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

export type TabType = 'submissions' | 'users' | 'withdrawals' | 'logs';

export interface AdminDashboardState {
  activeTab: TabType;
  searchTerm: string;
  statusFilter: string;
  selectedSubmission: Submission | null;
  selectedWithdrawal: WithdrawalRequest | null;
  rewardAmount: string;
  rejectionReason: string;
  balanceAmount: string;
  balanceReason: string;
  selectedUser: User | null;
  adminActions: AdminAction[];
  withdrawalRequests: WithdrawalRequest[];
  logsLoading: boolean;
  submissionsLoading: boolean;
  usersLoading: boolean;
  withdrawalsLoading: boolean;
  actionLoading: boolean;
  submissions: Submission[];
  users: User[];
  error: string | null;
}