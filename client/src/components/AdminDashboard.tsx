// client/src/components/AdminDashboard.tsx
import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AdminApiService } from "../services/adminApiService";
import { AdminDashboardState, TabType, Submission, User, WithdrawalRequest, SubscriptionScreenshot } from "../types/admin";
import { AdminHeader } from "./AdminHeader";
import { AdminTabs } from "./AdminTabs";
import { AdminFilters } from "./AdminFilters";
import { SubmissionsTable } from "./SubmissionsTable";
import { UsersTable } from "./UsersTable";
import { WithdrawalsTable } from "./WithdrawalsTable";
import { SubscriptionScreenshotsTable } from "./SubscriptionScreenshotsTable";
import { AdminLogsTable } from "./AdminLogsTable";

export default function AdminDashboard() {
  const { getAuthToken } = useAuth();
  const { toast } = useToast();
  const apiService = new AdminApiService();

  // State management
  const [state, setState] = useState<AdminDashboardState>({
    activeTab: 'submissions',
    searchTerm: "",
    statusFilter: "all",
    selectedSubmission: null,
    selectedWithdrawal: null,
    rewardAmount: "",
    rejectionReason: "",
    balanceAmount: "",
    balanceReason: "",
    selectedUser: null,
    adminActions: [],
    withdrawalRequests: [],
    subscriptionScreenshots: [], // NEW
    logsLoading: false,
    submissionsLoading: false,
    usersLoading: false,
    withdrawalsLoading: false,
    subscriptionsLoading: false, // NEW
    actionLoading: false,
    submissions: [],
    users: [],
    error: null,
  });

  // Helper function to show toast
  const showToast = (title: string, description: string, variant: "default" | "destructive" = "default") => {
    toast({ title, description, variant });
  };

  const showError = (error: unknown, defaultMessage: string) => {
    const message = error instanceof Error ? error.message : defaultMessage;
    setState(prev => ({ ...prev, error: message }));
    showToast("Ошибка", message, "destructive");
  };

  // Data fetching functions
  const fetchSubmissions = async () => {
    setState(prev => ({ ...prev, submissionsLoading: true, error: null }));
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token');
      
      const data = await apiService.fetchSubmissions(token);
      setState(prev => ({ ...prev, submissions: data }));
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
      showError(error, 'Failed to fetch submissions');
    } finally {
      setState(prev => ({ ...prev, submissionsLoading: false }));
    }
  };

  const fetchUsers = async () => {
    setState(prev => ({ ...prev, usersLoading: true, error: null }));
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token');
      
      const data = await apiService.fetchUsers(token);
      setState(prev => ({ ...prev, users: data }));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showError(error, 'Failed to fetch users');
    } finally {
      setState(prev => ({ ...prev, usersLoading: false }));
    }
  };

  const fetchWithdrawals = async () => {
    setState(prev => ({ ...prev, withdrawalsLoading: true, error: null }));
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token');
      
      const data = await apiService.fetchWithdrawals(token);
      setState(prev => ({ ...prev, withdrawalRequests: data }));
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
      showError(error, 'Failed to fetch withdrawals');
    } finally {
      setState(prev => ({ ...prev, withdrawalsLoading: false }));
    }
  };

  // NEW: Fetch subscription screenshots
  const fetchSubscriptionScreenshots = async () => {
    setState(prev => ({ ...prev, subscriptionsLoading: true, error: null }));
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token');
      
      const data = await apiService.fetchSubscriptionScreenshots(token);
      setState(prev => ({ ...prev, subscriptionScreenshots: data }));
    } catch (error) {
      console.error('Failed to fetch subscription screenshots:', error);
      showError(error, 'Failed to fetch subscription screenshots');
    } finally {
      setState(prev => ({ ...prev, subscriptionsLoading: false }));
    }
  };

  const fetchAdminActions = async () => {
    setState(prev => ({ ...prev, logsLoading: true, error: null }));
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token');
      
      const data = await apiService.fetchAdminActions(token);
      setState(prev => ({ ...prev, adminActions: data }));
    } catch (error) {
      console.error('Failed to fetch admin actions:', error);
      showError(error, 'Failed to fetch admin actions');
    } finally {
      setState(prev => ({ ...prev, logsLoading: false }));
    }
  };

  // Action handlers
  const handleApprove = async (submissionId: string, reward: number) => {
    setState(prev => ({ ...prev, actionLoading: true }));
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token');

      await apiService.reviewSubmission(token, submissionId, 'approved', { reward });
      showToast("Успешно", "Заявка одобрена");
      await fetchSubmissions();
    } catch (error) {
      console.error('Failed to approve submission:', error);
      showError(error, "Не удалось одобрить заявку");
    } finally {
      setState(prev => ({ ...prev, actionLoading: false }));
    }
  };

  const handleReject = async (submissionId: string, rejectionReason: string) => {
    setState(prev => ({ ...prev, actionLoading: true }));
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token');

      await apiService.reviewSubmission(token, submissionId, 'rejected', { rejectionReason });
      showToast("Успешно", "Заявка отклонена");
      await fetchSubmissions();
    } catch (error) {
      console.error('Failed to reject submission:', error);
      showError(error, "Не удалось отклонить заявку");
    } finally {
      setState(prev => ({ ...prev, actionLoading: false }));
    }
  };

  const handleProcessWithdrawal = async (withdrawalId: string, status: 'completed' | 'rejected', rejectionReason?: string) => {
    setState(prev => ({ ...prev, actionLoading: true }));
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token');

      await apiService.processWithdrawal(token, withdrawalId, status, rejectionReason);
      showToast("Успешно", status === 'completed' ? "Вывод завершен" : "Вывод отклонен");
      await fetchWithdrawals();
    } catch (error) {
      console.error('Failed to process withdrawal:', error);
      showError(error, "Не удалось обработать вывод");
    } finally {
      setState(prev => ({ ...prev, actionLoading: false }));
    }
  };

  const handleUpdateBalance = async (userId: string, amount: number, reason: string) => {
    setState(prev => ({ ...prev, actionLoading: true }));
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token');

      await apiService.updateUserBalance(token, userId, amount, reason);
      showToast("Успешно", `Баланс ${amount > 0 ? 'пополнен' : 'списан'}`);
      await fetchUsers();
    } catch (error) {
      console.error('Failed to update balance:', error);
      showError(error, "Не удалось обновить баланс");
    } finally {
      setState(prev => ({ ...prev, actionLoading: false }));
    }
  };

  // NEW: Handle subscription screenshot review
  const handleReviewSubscriptionScreenshot = async (userId: string, status: 'approved' | 'rejected', rejectionReason?: string) => {
    setState(prev => ({ ...prev, actionLoading: true }));
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token');

      await apiService.reviewSubscriptionScreenshot(token, userId, status, rejectionReason);
      showToast("Успешно", status === 'approved' ? "Подписка одобрена" : "Подписка отклонена");
      await fetchSubscriptionScreenshots();
    } catch (error) {
      console.error('Failed to review subscription screenshot:', error);
      showError(error, "Не удалось рассмотреть подписку");
    } finally {
      setState(prev => ({ ...prev, actionLoading: false }));
    }
  };

  // Handlers
  const handleTabChange = (tab: TabType) => {
    setState(prev => ({ ...prev, activeTab: tab, searchTerm: "", statusFilter: "all" }));
  };

  const handleRefresh = () => {
    switch (state.activeTab) {
      case 'submissions':
        fetchSubmissions();
        break;
      case 'users':
        fetchUsers();
        break;
      case 'withdrawals':
        fetchWithdrawals();
        break;
      case 'subscriptions':
        fetchSubscriptionScreenshots();
        break;
      case 'logs':
        fetchAdminActions();
        break;
    }
  };

  // Filtering functions
  const filteredSubmissions = state.submissions.filter(submission => {
    const matchesSearch = submission.originalFilename?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                        submission.filename.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                        submission.userId.toLowerCase().includes(state.searchTerm.toLowerCase());
    const matchesStatus = state.statusFilter === 'all' || submission.status === state.statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = state.users.filter(user =>
    user.username.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
    user.displayName.toLowerCase().includes(state.searchTerm.toLowerCase())
  );

  const filteredWithdrawals = state.withdrawalRequests.filter(withdrawal => {
    const matchesSearch = withdrawal.user?.username?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                         withdrawal.user?.displayName?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                         withdrawal.id.toLowerCase().includes(state.searchTerm.toLowerCase());
    const matchesStatus = state.statusFilter === 'all' || withdrawal.status === state.statusFilter;
    return matchesSearch && matchesStatus;
  });

  // NEW: Filter subscription screenshots
  const filteredSubscriptions = state.subscriptionScreenshots.filter(subscription => {
    const matchesSearch = subscription.username.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                         subscription.displayName.toLowerCase().includes(state.searchTerm.toLowerCase());
    const matchesStatus = state.statusFilter === 'all' || subscription.subscriptionScreenshotStatus === state.statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Effects
  useEffect(() => {
    switch (state.activeTab) {
      case 'submissions':
        fetchSubmissions();
        break;
      case 'users':
        fetchUsers();
        break;
      case 'withdrawals':
        fetchWithdrawals();
        break;
      case 'subscriptions':
        fetchSubscriptionScreenshots();
        break;
      case 'logs':
        fetchAdminActions();
        break;
    }
  }, [state.activeTab]);

  const isLoading = state.submissionsLoading || state.usersLoading || state.withdrawalsLoading || state.subscriptionsLoading || state.logsLoading;

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader 
        activeTab={state.activeTab} 
        onRefresh={handleRefresh} 
        isLoading={isLoading}
      />
      
      <AdminTabs 
        activeTab={state.activeTab} 
        onTabChange={handleTabChange} 
      />

      {/* Error Display */}
      {state.error && (
        <div className="container mx-auto px-4 py-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-destructive">{state.error}</span>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        <AdminFilters
          activeTab={state.activeTab}
          searchTerm={state.searchTerm}
          statusFilter={state.statusFilter}
          onSearchChange={(value) => setState(prev => ({ ...prev, searchTerm: value }))}
          onStatusChange={(value) => setState(prev => ({ ...prev, statusFilter: value }))}
        />

        {/* Tab Content */}
        {state.activeTab === 'submissions' && (
          <SubmissionsTable
            submissions={filteredSubmissions}
            loading={state.submissionsLoading}
            onApprove={handleApprove}
            onReject={handleReject}
            actionLoading={state.actionLoading}
          />
        )}

        {state.activeTab === 'users' && (
          <UsersTable
            users={filteredUsers}
            loading={state.usersLoading}
            onUpdateBalance={handleUpdateBalance}
            actionLoading={state.actionLoading}
          />
        )}

        {state.activeTab === 'withdrawals' && (
          <WithdrawalsTable
            withdrawals={filteredWithdrawals}
            loading={state.withdrawalsLoading}
            onProcess={handleProcessWithdrawal}
            actionLoading={state.actionLoading}
          />
        )}

        {/* NEW: Subscription Screenshots Tab */}
        {state.activeTab === 'subscriptions' && (
          <SubscriptionScreenshotsTable
            screenshots={filteredSubscriptions}
            loading={state.subscriptionsLoading}
            onReview={handleReviewSubscriptionScreenshot}
            actionLoading={state.actionLoading}
          />
        )}

        {state.activeTab === 'logs' && (
          <AdminLogsTable
            logs={state.adminActions}
            loading={state.logsLoading}
          />
        )}
      </main>
    </div>
  );
}