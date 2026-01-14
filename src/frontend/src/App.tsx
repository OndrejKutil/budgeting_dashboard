import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, RequireAuth } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import NotFound from "./pages/NotFound";
import FaqPage from "./pages/FaqPage";
import HowItWorksPage from "./pages/HowItWorksPage";

// Dashboard
import { DashboardLayout } from "./components/layout/DashboardLayout";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import TransactionsPage from "./pages/dashboard/TransactionsPage";
import AccountsPage from "./pages/dashboard/AccountsPage";
import CategoriesPage from "./pages/dashboard/CategoriesPage";
import FundsPage from "./pages/dashboard/FundsPage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import MonthlyAnalyticsPage from "./pages/dashboard/analytics/MonthlyAnalyticsPage";
import YearlyAnalyticsPage from "./pages/dashboard/analytics/YearlyAnalyticsPage";
import EmergencyFundPage from "./pages/dashboard/analytics/EmergencyFundPage";
import BudgetMaker from "./pages/dashboard/BudgetMaker";
import InvestingCalculator from "./pages/dashboard/InvestingCalculator";

const STALE_TIME: number = 1000 * 60 * 5;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME,
      refetchOnWindowFocus: false,
    },
  },
});

const AppContent = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />

            {/* Protected dashboard routes */}
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardLayout />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardOverview />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="funds" element={<FundsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="analytics/monthly" element={<MonthlyAnalyticsPage />} />
              <Route path="analytics/yearly" element={<YearlyAnalyticsPage />} />
              <Route path="analytics/emergency-fund" element={<EmergencyFundPage />} />
              <Route path="budget-maker" element={<BudgetMaker />} />
              <Route path="investing-calculator" element={<InvestingCalculator />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
