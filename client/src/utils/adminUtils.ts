// client/src/utils/adminUtils.ts
import React from "react";
import {
  Trophy,
  Target,
  Zap,
  Check,
  X,
  DollarSign,
  AlertCircle,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function formatCardNumber(value: string) {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "");
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export function getCategoryIcon(category: string) {
  switch (category) {
    case 'gold-kill': 
      return React.createElement(Trophy, { className: "h-4 w-4 text-yellow-400" });
    case 'silver-kill': 
      return React.createElement(Trophy, { className: "h-4 w-4 text-gray-400" });
    case 'bronze-kill': 
      return React.createElement(Trophy, { className: "h-4 w-4 text-yellow-700" });
    case 'victory': 
      return React.createElement(Target, { className: "h-4 w-4 text-gaming-primary" });
    case 'funny': 
      return React.createElement(Zap, { className: "h-4 w-4 text-gaming-warning" });
    default: 
      return null;
  }
}

export function getCategoryLabel(category: string) {
  switch (category) {
    case 'gold-kill': return 'Голд килл';
    case 'silver-kill': return 'Серебряный килл';
    case 'bronze-kill': return 'Бронзовый килл';
    case 'victory': return 'Победа';
    case 'funny': return 'Другое';
    default: return category;
  }
}

export function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return React.createElement(Badge, { variant: "secondary" }, "На рассмотрении");
    case 'approved':
      return React.createElement(Badge, { className: "bg-gaming-success text-white" }, "Одобрено");
    case 'rejected':
      return React.createElement(Badge, { variant: "destructive" }, "Отклонено");
    default:
      return React.createElement(Badge, { variant: "secondary" }, status);
  }
}

export function getActionLabel(action: string) {
  switch (action) {
    case 'approve_submission': return 'Одобрил заявку';
    case 'reject_submission': return 'Отклонил заявку';
    case 'adjust_balance': return 'Изменил баланс';
    case 'process_withdrawal': return 'Обработал вывод';
    default: return action;
  }
}

export function getActionIcon(action: string) {
  switch (action) {
    case 'approve_submission': 
      return React.createElement(Check, { className: "h-4 w-4 text-gaming-success" });
    case 'reject_submission': 
      return React.createElement(X, { className: "h-4 w-4 text-destructive" });
    case 'adjust_balance': 
      return React.createElement(DollarSign, { className: "h-4 w-4 text-gaming-primary" });
    case 'process_withdrawal': 
      return React.createElement(CreditCard, { className: "h-4 w-4 text-blue-500" });
    default: 
      return React.createElement(AlertCircle, { className: "h-4 w-4" });
  }
}

export function getMethodIcon(method: string) {
  switch (method) {
    case 'card':
      return '💳';
    case 'crypto':
      return '₿';
    case 'paypal':
      return '💌';
    case 'telegram':
      return '✈️';
    default:
      return '💰';
  }
}

export function getMethodLabel(method: string) {
  switch (method) {
    case 'card':
      return 'Банковская карта';
    case 'crypto':
      return 'Криптовалюта (USDT TRC20)';
    case 'paypal':
      return 'PayPal';
    case 'telegram':
      return 'Telegram';
    default:
      return method;
  }
}

export function getWithdrawalStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return React.createElement(Badge, { variant: "secondary" }, 
        React.createElement(Clock, { className: "h-3 w-3 mr-1" }),
        "Ожидает"
      );
    case 'processing':
      return React.createElement(Badge, { className: "bg-blue-500" },
        React.createElement(Loader2, { className: "h-3 w-3 mr-1 animate-spin" }),
        "В обработке"
      );
    case 'completed':
      return React.createElement(Badge, { className: "bg-green-500" },
        React.createElement(CheckCircle, { className: "h-3 w-3 mr-1" }),
        "Завершен"
      );
    case 'rejected':
      return React.createElement(Badge, { variant: "destructive" },
        React.createElement(XCircle, { className: "h-3 w-3 mr-1" }),
        "Отклонен"
      );
    default:
      return React.createElement(Badge, { variant: "secondary" }, status);
  }
}

export function parseActionDetails(details: string) {
  try {
    return JSON.parse(details);
  } catch {
    return details;
  }
}