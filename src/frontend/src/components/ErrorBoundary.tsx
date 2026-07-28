import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Last-resort catch for render-time crashes. Without this, an uncaught error anywhere in the
 * tree unmounts the whole app and leaves a blank white screen — there was no boundary in the
 * app at all before this.
 *
 * Must be a class component: `componentDidCatch`/`getDerivedStateFromError` have no hook
 * equivalent yet.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // The only client-side error surface today — matches NotFound.tsx's existing console.error
    // for 404s. No error-tracking service is wired up.
    console.error('Unhandled render error:', error, errorInfo.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-destructive/8 rounded-full blur-[140px]" />
        </div>

        <div className="relative z-10 flex max-w-md flex-col items-center px-8 text-center">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-destructive mb-6">
            Something broke
          </span>
          <h1 className="font-display font-bold text-3xl tracking-tight text-foreground mb-3">
            This page hit an error
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-10">
            Reloading usually fixes it. If it keeps happening, your data is safe — nothing here
            touches your accounts or transactions.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="gap-2" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
              Reload
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <a href="/">
                <Home className="h-4 w-4" />
                Go home
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
