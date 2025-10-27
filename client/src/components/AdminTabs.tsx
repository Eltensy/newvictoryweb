// client/src/components/AdminTabs.tsx
import { useState } from "react";
import { TabType } from "@/types/admin";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { id: "submissions" as const, label: "Заявки", testId: "tab-submissions" },
    { id: "kills" as const, label: "Киллы", testId: "tab-kills" },
    { id: "users" as const, label: "Пользователи", testId: "tab-users" },
    { id: "subscriptions" as const, label: "Скриншоты", testId: "tab-subscriptions" },
    { id: "withdrawals" as const, label: "Выводы", testId: "tab-withdrawals" },
    { id: "premium" as const, label: "Премиум", testId: "tab-premium" },
    { id: "tournaments" as const, label: "Турниры", testId: "tab-tournaments" },
    { id: "dropmap" as const, label: "Карты", testId: "tab-dropmap" },
    { id: "logs" as const, label: "Логи", testId: "tab-logs" },
  ];

  return (
    <div className="border-b border-border/50 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Tabs */}
        <nav className="hidden md:flex -mb-px space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`
                whitespace-nowrap py-3 px-1 text-sm font-medium transition-colors
                border-b-2 -mb-px
                ${
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }
              `}
              onClick={() => onTabChange(tab.id)}
              data-testid={tab.testId}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Mobile Tabs */}
        <div className="md:hidden">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm font-medium">
              {tabs.find(t => t.id === activeTab)?.label}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMenuOpen(!menuOpen)}
              className="h-8 w-8 p-0"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>

          {/* Mobile Dropdown */}
          {menuOpen && (
            <div className="pb-3 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`
                    block w-full text-left px-3 py-2 text-sm rounded-md transition-colors
                    ${
                      activeTab === tab.id
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
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
    </div>
  );
}