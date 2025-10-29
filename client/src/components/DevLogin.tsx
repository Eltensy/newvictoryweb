import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export function DevLogin() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  
  // Показываем только в dev-режиме
  if (import.meta.env.PROD) return null;
  
  const handleDevLogin = async (presetUsername?: string) => {
    const loginUsername = presetUsername || username;
    if (!loginUsername.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername }),
      });
      
      if (response.ok) {
        const { token, user } = await response.json();
        login(user, token);
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Dev login failed:', error);
      alert('Dev login failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="fixed bottom-4 left-4 p-4 bg-yellow-500/10 border-2 border-yellow-500 z-50 min-w-[300px]">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
            DEV MODE
          </span>
        </div>
        
        <div className="flex gap-2">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDevLogin()}
            placeholder="username"
            disabled={isLoading}
            className="h-8 text-sm"
          />
          <Button 
            onClick={() => handleDevLogin()} 
            disabled={isLoading || !username.trim()}
            size="sm" 
            className="h-8 px-3"
          >
            {isLoading ? '...' : 'Login'}
          </Button>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Quick login:</p>
          <div className="flex flex-wrap gap-1">
            <Button 
              onClick={() => handleDevLogin('user1')} 
              disabled={isLoading}
              variant="outline" 
              size="sm" 
              className="h-7 text-xs"
            >
              👤 user1
            </Button>
            <Button 
              onClick={() => handleDevLogin('user2')} 
              disabled={isLoading}
              variant="outline" 
              size="sm" 
              className="h-7 text-xs"
            >
              👤 user2
            </Button>
            <Button 
              onClick={() => handleDevLogin('admin1')} 
              disabled={isLoading}
              variant="outline" 
              size="sm" 
              className="h-7 text-xs"
            >
              👑 admin1
            </Button>
            <Button 
              onClick={() => handleDevLogin('testadmin')} 
              disabled={isLoading}
              variant="outline" 
              size="sm" 
              className="h-7 text-xs"
            >
              👑 testadmin
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-yellow-500/20">
          <p>💡 Tip: usernames with "admin" get admin rights</p>
          <p>💰 Admins start with 10,000₽, users with 1,000₽</p>
        </div>
      </div>
    </Card>
  );
}