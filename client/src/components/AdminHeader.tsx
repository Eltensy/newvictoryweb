// client/src/components/AdminHeader.tsx
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, RefreshCw, House } from "lucide-react";
import { TabType } from "@/types/admin";

interface AdminHeaderProps {
  activeTab: TabType;
  onRefresh: () => void;
  isLoading: boolean;
}

export function AdminHeader({ activeTab, onRefresh, isLoading }: AdminHeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold font-gaming">Admin Panel</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = "/"}
          >
            <House className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="font-gaming">
            Администратор
          </Badge>
          <div className="w-8 h-8 rounded-full bg-destructive"></div>
        </div>
      </div>
    </header>
  );
}