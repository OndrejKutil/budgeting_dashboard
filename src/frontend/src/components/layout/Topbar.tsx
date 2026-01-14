import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { MobileSidebarTrigger } from './AppSidebar';
import { UserNav } from './UserNav';

interface TopbarProps {
  onMobileMenuClick: () => void;
}

export function Topbar({ onMobileMenuClick }: TopbarProps) {


  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-4">
        <MobileSidebarTrigger onClick={onMobileMenuClick} />
        <Button variant="link" asChild className="hidden text-sm text-muted-foreground lg:block px-0 h-auto font-normal hover:no-underline hover:text-foreground transition-colors">
          <Link to="/how-it-works">
            See how it works
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">

        {/* User menu */}
        <UserNav />
      </div>
    </header>
  );
}
