import type { HTMLAttributes, ReactNode } from 'react';
import { usePrivacyMode } from '@/contexts/privacy-context';
import { cn } from '@/lib/utils';

interface SensitiveValueProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  disabled?: boolean;
}

export function SensitiveValue({
  children,
  className,
  disabled = false,
  ...props
}: SensitiveValueProps) {
  const { isPrivacyMode } = usePrivacyMode();
  const isHidden = isPrivacyMode && !disabled;

  return (
    <span
      className={cn(
        'inline-block',
        isHidden && 'select-none blur-[9px]',
        className,
      )}
      aria-hidden={isHidden ? true : undefined}
      {...props}
    >
      {children}
    </span>
  );
}
