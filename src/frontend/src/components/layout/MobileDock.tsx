import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MoreHorizontal, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/user-context';
import { useOpenAddTransaction } from '@/hooks/use-add-transaction';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  accountsItem,
  fundsItem,
  isPathActive,
  overviewItem,
  PROFILE_PATH,
  RECURRING_PATH,
  transactionsItem,
  type NavItem,
} from './nav-config';
import { useDueRecurringCount, useVisibleNavGroups } from './use-nav';

const dockButtonClass =
  'relative grid h-[46px] place-items-center rounded-2xl text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function ActiveDot() {
  return <span aria-hidden="true" className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />;
}

function DockLink({ item, active }: { item: NavItem; active: boolean }) {
  const { t } = useUser();
  return (
    <Link
      to={item.href}
      aria-label={t(item.labelKey)}
      aria-current={active ? 'page' : undefined}
      className={cn(dockButtonClass, active && 'text-foreground')}
    >
      <item.icon className={cn('h-[22px] w-[22px]', active && 'text-primary')} aria-hidden="true" />
      {active && <ActiveDot />}
    </Link>
  );
}

function SheetLink({ item, badge, active, onNavigate }: { item: NavItem; badge?: number; active: boolean; onNavigate: () => void }) {
  const { t } = useUser();
  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-foreground/10' : 'hover:bg-foreground/5',
      )}
    >
      <item.icon className={cn('h-[18px] w-[18px]', active ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
      <span className="flex-1">{t(item.labelKey)}</span>
      {badge ? (
        <span
          className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold leading-none text-destructive-foreground"
          aria-label={t('nav.recurringDue', { count: badge })}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </Link>
  );
}

export function MobileDock() {
  const { pathname } = useLocation();
  const { t } = useUser();
  const [moreOpen, setMoreOpen] = useState(false);
  const openAdd = useOpenAddTransaction();
  const groups = useVisibleNavGroups();
  const dueCount = useDueRecurringCount();

  const dockItems = [overviewItem, transactionsItem, fundsItem];
  const moreActive = !dockItems.some((item) => isPathActive(pathname, item.href));
  const closeMore = () => setMoreOpen(false);

  const profileItem: NavItem = { labelKey: 'nav.profile', href: PROFILE_PATH, icon: User };

  return (
    <>
      <nav
        aria-label={t('nav.mobileNavigation')}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 md:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="glass pointer-events-auto mx-auto grid max-w-sm grid-cols-5 items-center rounded-[26px] p-2">
          <DockLink item={overviewItem} active={isPathActive(pathname, overviewItem.href)} />
          <DockLink item={transactionsItem} active={isPathActive(pathname, transactionsItem.href)} />
          <button
            type="button"
            onClick={openAdd}
            aria-label={t('nav.addTransaction')}
            className="h-[46px] w-[46px] justify-self-center rounded-2xl bg-primary text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Plus className="mx-auto h-6 w-6" aria-hidden="true" />
          </button>
          <DockLink item={fundsItem} active={isPathActive(pathname, fundsItem.href)} />
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label={t('nav.more')}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={cn(dockButtonClass, moreActive && 'text-foreground')}
          >
            <MoreHorizontal className={cn('h-[22px] w-[22px]', moreActive && 'text-primary')} aria-hidden="true" />
            {moreActive && <ActiveDot />}
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="glass glass-dense max-h-[85vh] overflow-y-auto rounded-t-[30px] border-x-0 border-b-0 bg-transparent px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-6"
        >
          <SheetHeader className="mb-2">
            <SheetTitle>{t('nav.more')}</SheetTitle>
            <SheetDescription className="sr-only">{t('nav.moreSheetDescription')}</SheetDescription>
          </SheetHeader>
          <nav aria-label={t('nav.more')} className="space-y-4">
            <SheetLink item={accountsItem} active={isPathActive(pathname, accountsItem.href)} onNavigate={closeMore} />
            {groups.map((group) => (
              <div key={group.id}>
                <p className="px-3 pb-1 text-[13px] text-muted-foreground">{t(group.labelKey)}</p>
                {group.items.map((item) => (
                  <SheetLink
                    key={item.href}
                    item={item}
                    badge={item.href === RECURRING_PATH ? dueCount : undefined}
                    active={isPathActive(pathname, item.href)}
                    onNavigate={closeMore}
                  />
                ))}
              </div>
            ))}
            <div className="border-t border-border pt-3">
              <SheetLink item={profileItem} active={isPathActive(pathname, PROFILE_PATH)} onNavigate={closeMore} />
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
