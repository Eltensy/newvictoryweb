// client/src/components/AdminTabs.tsx
import { TabType } from "@/types/admin";

interface AdminTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  const tabs = [
    { id: 'submissions' as const, label: 'Заявки', testId: 'tab-submissions' },
    { id: 'users' as const, label: 'Пользователи', testId: 'tab-users' },
    { id: 'subscriptions' as const, label: 'Скриншоты', testId: 'tab-subscriptions' },
    { id: 'withdrawals' as const, label: 'Выводы', testId: 'tab-withdrawals' },
    { id: 'logs' as const, label: 'Логи', testId: 'tab-logs' },
  ];

  return (
    <div className="border-b border-border bg-card/30">
      <div className="container mx-auto px-4">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`py-4 px-2 font-gaming transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onTabChange(tab.id)}
              data-testid={tab.testId}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}