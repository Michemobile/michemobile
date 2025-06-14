import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";

// Import pages directly to avoid any bundling issues
import { IndexPage, Services, Professionals, HowItWorks, Login, SignUp, 
  JoinAsPro, JoinConfirmation, NotFound, ServiceDetail, Booking, AuthCallback, Dashboard, 
  AuthTest } from "./pages";
import ProfessionalDetail from "./pages/ProfessionalDetail";
import ProfessionalOnboardingComplete from "./pages/ProfessionalOnboardingComplete";
import ClientDashboard from "./pages/dashboard/ClientDashboard";
import ProfessionalDashboard from "./pages/dashboard/ProfessionalDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AdminDashboard from "./pages/dashboard/admin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import StripeReturn from './pages/dashboard/StripeReturn';
import { registerServiceWorker } from "./utils/notifications";
import StripeConnect from './pages/dashboard/professional/StripeConnect';
import { BookingSuccess, BookingCancel } from './pages';

const queryClient = new QueryClient();

// Register the service worker for push notifications
registerServiceWorker();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<IndexPage />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:id" element={<ServiceDetail />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/booking/success" element={<BookingSuccess />} />
            <Route path="/booking/cancel" element={<BookingCancel />} />
            <Route path="/professionals" element={<Professionals />} />
            <Route path="/professionals/:id" element={<ProfessionalDetail />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/join-as-pro" element={<JoinAsPro />} />
            <Route path="/join-confirmation" element={<JoinConfirmation />} />
            <Route path="/pro-onboarding-complete" element={<ProfessionalOnboardingComplete />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth-test" element={<AuthTest />} />

            <Route 
              path="/dashboard/client" 
              element={
                <ProtectedRoute>
                  <ClientDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/professional/*" 
              element={
                <ProtectedRoute>
                  <ProfessionalDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            
            {/* Admin Routes */}
            <Route element={<AdminRoute />}>
              <Route path="/dashboard/admin/*" element={<AdminDashboard />} />
            </Route>
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard/professional/stripe-connect" element={<StripeConnect />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
