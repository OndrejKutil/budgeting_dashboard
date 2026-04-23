import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { MobileSidebarTrigger } from './AppSidebar';
import { UserNav } from './UserNav';
import { cn } from '@/lib/utils';

interface TopbarProps {
  onMobileMenuClick: () => void;
}

export function Topbar({ onMobileMenuClick }: TopbarProps) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, [isRefreshing, queryClient]);

  return (
    <header className="safe-top sticky top-0 z-30 flex h-16 box-content items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-4">
        <MobileSidebarTrigger onClick={onMobileMenuClick} />
        <Button variant="link" asChild className="hidden text-sm text-muted-foreground lg:block px-0 h-auto font-normal hover:no-underline hover:text-foreground transition-colors">
          <Link to="/how-it-works">
            See how it works
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        {/* Mobile refresh button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="lg:hidden min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground"
          aria-label="Refresh data"
        >
          <RefreshCw className={cn(
            "h-4 w-4 transition-transform",
            isRefreshing && "animate-spin"
          )} />
        </Button>

        {/* User menu */}
        <UserNav />
      </div>
    </header>
  );
}
