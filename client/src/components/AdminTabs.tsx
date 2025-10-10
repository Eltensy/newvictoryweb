import { useState } from "react";
import { TabType } from "@/types/admin";
import { Menu, X } from "lucide-react";

interface AdminTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { id: "submissions" as const, label: "Заявки", testId: "tab-submissions" },
    { id: "users" as const, label: "Пользователи", testId: "tab-users" },
    { id: "subscriptions" as const, label: "Скриншоты", testId: "tab-subscriptions" },
    { id: "withdrawals" as const, label: "Выводы", testId: "tab-withdrawals" },
    { id: "premium" as const, label: "Премиум", testId: "tab-premium" },
    { id: "tournaments" as const, label: "Турниры", testId: "tab-tournaments" },
    { id: "dropmap" as const, label: "Карты", testId: "tab-dropmap" },
    { id: "logs" as const, label: "Логи", testId: "tab-logs" },
  ];

  return (
    <div className="border-b border-border bg-card/30">
      <div className="container mx-auto px-4">
        {/* Desktop Tabs */}
        <div className="hidden md:flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`py-4 px-2 font-gaming transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => onTabChange(tab.id)}
              data-testid={tab.testId}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mobile Burger */}
        <div className="md:hidden flex items-center justify-between py-3">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="p-2 text-foreground hover:text-primary transition"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="flex flex-col gap-2 pb-4 md:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`py-2 px-3 rounded-lg text-left font-gaming transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  onTabChange(tab.id);
                  setMenuOpen(false);
                }}
                data-testid={tab.testId}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}