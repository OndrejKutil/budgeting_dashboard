import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { MobileDock } from './MobileDock';
import { PullToRefresh } from './PullToRefresh';
import { useAddTransactionShortcut } from '@/hooks/use-add-transaction';

export function DashboardLayout() {
  useAddTransactionShortcut();

  return (
    <div className="app-shell min-h-screen">
      <div className="dashboard-content min-h-screen">
        <Topbar />
        {/* Bottom padding clears the floating mobile dock (about 5rem) plus the home indicator. */}
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1160px] px-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-5 md:px-14 md:pb-16 md:pt-8"
        >
          <PullToRefresh>
            <Outlet />
          </PullToRefresh>
        </main>
      </div>

      <MobileDock />
    </div>
  );
}
