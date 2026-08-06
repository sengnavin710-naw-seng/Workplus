import type { ReactNode } from "react";

interface AuthButtonContentProps {
  children: ReactNode;
  isLoading: boolean;
  leadingIcon?: ReactNode;
  loadingLabel: string;
}

export function LoadingSpinner({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`auth-loading-spinner ${className}`} />;
}

export function AuthButtonContent({
  children,
  isLoading,
  leadingIcon,
  loadingLabel,
}: AuthButtonContentProps) {
  return (
    <span className="auth-button-content">
      <span aria-hidden="true" className="auth-button-leading">
        {isLoading ? <LoadingSpinner /> : leadingIcon}
      </span>
      <span aria-live="polite">{isLoading ? loadingLabel : children}</span>
      <span aria-hidden="true" className="auth-button-leading" />
    </span>
  );
}
