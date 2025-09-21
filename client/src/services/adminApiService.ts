// client/src/services/adminApiService.ts
import { Submission, User, AdminAction, WithdrawalRequest } from '@/types/admin';

export class AdminApiService {
  private getAuthHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async fetchSubmissions(token: string): Promise<Submission[]> {
    const response = await fetch('/api/submissions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch submissions: ${response.statusText}`);
    }

    return response.json();
  }

  async fetchUsers(token: string): Promise<User[]> {
    const response = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    return response.json();
  }

  async fetchWithdrawals(token: string): Promise<WithdrawalRequest[]> {
    const response = await fetch('/api/admin/withdrawals', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch withdrawals: ${response.statusText}`);
    }

    return response.json();
  }

  async fetchAdminActions(token: string): Promise<AdminAction[]> {
    const response = await fetch('/api/admin/actions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch admin actions: ${response.statusText}`);
    }

    return response.json();
  }

  async reviewSubmission(
    token: string,
    submissionId: string,
    status: 'approved' | 'rejected',
    data: { reward?: number; rejectionReason?: string }
  ): Promise<void> {
    const requestBody = {
      status,
      ...(status === 'approved' ? { reward: data.reward } : { rejectionReason: data.rejectionReason })
    };

    const response = await fetch(`/api/admin/submission/${submissionId}/review`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to ${status} submission`);
    }
  }

  async processWithdrawal(
    token: string,
    withdrawalId: string,
    status: 'completed' | 'rejected',
    rejectionReason?: string
  ): Promise<void> {
    const requestBody = {
      status,
      rejectionReason
    };

    const response = await fetch(`/api/admin/withdrawal/${withdrawalId}/process`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process withdrawal');
    }
  }

  async updateUserBalance(
    token: string,
    userId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    const requestBody = { amount, reason };

    const response = await fetch(`/api/admin/user/${userId}/balance`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update balance');
    }
  }
}