import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, RequireAuth } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import { PrivacyModeProvider } from "@/contexts/PrivacyContext";
import { AnalyticsSkeleton, BudgetMakerSkeleton, DashboardSkeleton } from "@/components/skeletons";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ThemeProvider } from "@/components/theme-provider";

// Pages
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const AuthCallbackPage = lazy(() => import("./pages/auth/AuthCallbackPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const FaqPage = lazy(() => import("./pages/FaqPage"));
const HowItWorksPage = lazy(() => import("./pages/HowItWorksPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));

// Dashboard
const DashboardOverview = lazy(() => import("./pages/dashboard/DashboardOverview"));
const TransactionsPage = lazy(() => import("./pages/dashboard/TransactionsPage"));
const AccountsPage = lazy(() => import("./pages/dashboard/AccountsPage"));
const CategoriesPage = lazy(() => import("./pages/dashboard/CategoriesPage"));
const FundsPage = lazy(() => import("./pages/dashboard/FundsPage"));
const ProfilePage = lazy(() => import("./pages/dashboard/ProfilePage"));
const MonthlyAnalyticsPage = lazy(() => import("./pages/dashboard/analytics/MonthlyAnalyticsPage"));
const YearlyAnalyticsPage = lazy(() => import("./pages/dashboard/analytics/YearlyAnalyticsPage"));
const EmergencyFundPage = lazy(() => import("./pages/dashboard/analytics/EmergencyFundPage"));
const BudgetMaker = lazy(() => import("./pages/dashboard/BudgetMaker"));
const InvestingCalculator = lazy(() => import("./pages/dashboard/InvestingCalculator"));
const DividendCalculator = lazy(() => import("./pages/dashboard/DividendCalculator"));

const STALE_TIME: number = 1000 * 60 * 5; // 5 minutes

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME,
      refetchOnWindowFocus: false,
    },
  },
});

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const withSuspense = (element: ReactNode, fallback: ReactNode = <PageFallback />) => (
  <Suspense fallback={fallback}>{element}</Suspense>
);

/**
 * Detects Supabase OAuth hash fragments (e.g. #access_token=...)
 * on any page and redirects to /auth/callback where they are processed.
 * This handles cases where Supabase redirects to the site root
 * instead of /auth/callback.
 */
function OAuthHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=') && window.location.pathname !== '/auth/callback') {
      // Use window.location.replace to preserve the hash fragment for AuthCallbackPage
      window.location.replace('/auth/callback' + hash);
    }
  }, []);

  return null;
}

const AppContent = () => {
  return (
    <BrowserRouter>
      <AuthProvider> {/* AuthProvider is used to provide authentication context to the app (access and refresh tokens, user id...) */}
        <UserProvider> {/* UserProvider is used to provide user context to the app (user data, profile initials, currency...) */}
          <PrivacyModeProvider>
            <OAuthHashRedirect />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={withSuspense(<LandingPage />)} />
              <Route path="/auth/login" element={withSuspense(<LoginPage />)} />
              <Route path="/auth/register" element={withSuspense(<RegisterPage />)} />
              <Route path="/auth/forgot-password" element={withSuspense(<ForgotPasswordPage />)} />
              <Route path="/auth/reset-password" element={withSuspense(<ResetPasswordPage />)} />
              <Route path="/auth/callback" element={withSuspense(<AuthCallbackPage />)} />
              <Route path="/terms" element={withSuspense(<TermsPage />)} />
              <Route path="/privacy" element={withSuspense(<PrivacyPage />)} />
              <Route path="/faq" element={withSuspense(<FaqPage />)} />
              <Route path="/how-it-works" element={withSuspense(<HowItWorksPage />)} />
              <Route path="/about" element={withSuspense(<AboutPage />)} />

              {/* Protected dashboard routes */}
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <DashboardLayout />
                  </RequireAuth>
                }
              >
                {/* Routes living under the /dashboard/{...} */}
                <Route index element={withSuspense(<DashboardOverview />, <DashboardSkeleton />)} />
                <Route path="transactions" element={withSuspense(<TransactionsPage />, <DashboardSkeleton />)} />
                <Route path="accounts" element={withSuspense(<AccountsPage />, <DashboardSkeleton />)} />
                <Route path="categories" element={withSuspense(<CategoriesPage />, <DashboardSkeleton />)} />
                <Route path="funds" element={withSuspense(<FundsPage />, <DashboardSkeleton />)} />
                <Route path="profile" element={withSuspense(<ProfilePage />, <DashboardSkeleton />)} />
                <Route path="analytics/monthly" element={withSuspense(<MonthlyAnalyticsPage />, <AnalyticsSkeleton />)} />
                <Route path="analytics/yearly" element={withSuspense(<YearlyAnalyticsPage />, <AnalyticsSkeleton />)} />
                <Route path="analytics/emergency-fund" element={withSuspense(<EmergencyFundPage />, <AnalyticsSkeleton />)} />
                <Route path="budget-maker" element={withSuspense(<BudgetMaker />, <BudgetMakerSkeleton />)} />
                <Route path="investing-calculator" element={withSuspense(<InvestingCalculator />, <DashboardSkeleton />)} />
                <Route path="dividend-calculator" element={withSuspense(<DividendCalculator />, <DashboardSkeleton />)} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={withSuspense(<NotFound />)} />
            </Routes>
          </PrivacyModeProvider>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
