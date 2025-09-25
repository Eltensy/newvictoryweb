// client/src/components/AdminFilters.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Search } from "lucide-react";
import { TabType } from "@/types/admin";

interface AdminFiltersProps {
  activeTab: TabType;
  searchTerm: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function AdminFilters({ 
  activeTab, 
  searchTerm, 
  statusFilter, 
  onSearchChange, 
  onStatusChange 
}: AdminFiltersProps) {
  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'submissions': return "Поиск по файлу или ID пользователя...";
      case 'users': return "Поиск по имени пользователя...";
      case 'withdrawals': return "Поиск по пользователю или ID заявки...";
      default: return "Поиск...";
    }
  };

  const showStatusFilter = activeTab === 'submissions' || activeTab === 'withdrawals' || activeTab === 'subscriptions';

  const getStatusOptions = () => {
    if (activeTab === 'submissions') {
      return [
        { value: 'all', label: 'Все статусы' },
        { value: 'pending', label: 'На рассмотрении' },
        { value: 'approved', label: 'Одобрено' },
        { value: 'rejected', label: 'Отклонено' },
      ];
    }
    if (activeTab === 'withdrawals') {
      return [
        { value: 'all', label: 'Все статусы' },
        { value: 'pending', label: 'Ожидает' },
        { value: 'processing', label: 'В обработке' },
        { value: 'completed', label: 'Завершен' },
        { value: 'rejected', label: 'Отклонен' },
      ];
    }
    if (activeTab === 'subscriptions') {
      return [
          { value: 'all', label: 'Все статусы' },
          { value: 'pending', label: 'Ожидает' },
          { value: 'approved', label: 'Одобрено' },
          { value: 'rejected', label: 'Отклонено' }
        ]; 
    }   
    return [];  
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="font-gaming flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Фильтры
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="search">Поиск</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder={getSearchPlaceholder()}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
          </div>
          {showStatusFilter && (
            <div className="w-48">
              <Label htmlFor="status">Статус</Label>
              <Select value={statusFilter} onValueChange={onStatusChange}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getStatusOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}