import type { ReactNode } from 'react';

type PanelSidebarVariant = 'citizen' | 'admin';

const VARIANT_CLASS: Record<PanelSidebarVariant, string> = {
  citizen: 'border-teal-900 bg-teal-800',
  admin: 'border-slate-900 bg-slate-800',
};

interface PanelSidebarHeaderProps {
  variant: PanelSidebarVariant;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}

export function PanelSidebarHeader({
  variant,
  title,
  subtitle,
  icon,
}: PanelSidebarHeaderProps) {
  return (
    <div
      className={`shrink-0 border-b px-3.5 py-3 text-white sm:px-4 ${VARIANT_CLASS[variant]}`}
    >
      <div className="flex items-start gap-2.5">
        {icon ? <div className="shrink-0">{icon}</div> : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold leading-snug">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm leading-relaxed text-white/85">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CitizenLocationIcon() {
  return (
    <span
      className="flex h-9 w-9 items-center justify-center border border-white/40 bg-white/10"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
      </svg>
    </span>
  );
}

export function AdminPolicyIcon() {
  return (
    <span
      className="flex h-9 w-9 items-center justify-center border border-white/30 bg-white/10"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    </span>
  );
}
