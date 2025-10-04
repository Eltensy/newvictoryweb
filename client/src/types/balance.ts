// types.ts

// Тип транзакции в балансе
export interface BalanceTransaction {
  id: string;
  type: 'earning' | 'bonus' | 'withdrawal_request' | 'withdrawal_completed' | 'other';
  description: string;
  amount: number; // положительное или отрицательное
  createdAt: string; // ISO дата
}

// Данные формы вывода
export interface WithdrawalFormData {
  amount: string; // введённая сумма
  method: 'card' | 'crypto' | 'paypal' | '';
  // Для карты
  cardNumber?: string;
  cardHolder?: string;
  cardCountry?: 'RU' | 'UA' | 'EU';
  // Для крипты
  walletAddress?: string;
  currency?: 'USDT' | 'BTC' | 'ETH';
  // Для PayPal
  email?: string;
}

// Notification Modal
export interface Notification {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}
