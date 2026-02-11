import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./components/providers/auth-provider";
import { LanguageProvider } from "./components/providers/language-provider";
import { ProtectedRoute } from "./components/auth/protected-route";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import SalesAnalytics from "./pages/SalesAnalytics";
import Customers from "./pages/crm/Customers";
import CustomerDetail from "./pages/crm/CustomerDetail";
import CustomerNew from "./pages/crm/CustomerNew";
import Bookings from "./pages/crm/Bookings";
import BookingDetail from "./pages/crm/BookingDetail";
import BookingNew from "./pages/crm/BookingNew";
import Leads from "./pages/crm/Leads";
import FollowUps from "./pages/crm/FollowUps";
import Inbox from "./pages/crm/Inbox";
import Services from "./pages/crm/Services";
import WorkOrders from "./pages/crm/WorkOrders";
import Timeline from "./pages/crm/Timeline";
import Chatbot from "./pages/Chatbot";
import DevChatbot from "./pages/DevChatbot";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Integrations from "./pages/Integrations";
import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            {/* Auth routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Route>
            
            {/* Public landing page */}
            <Route path="/" element={<Index />} />
            
            {/* Protected app routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Panel */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Órdenes */}
              <Route path="/ordenes" element={<Bookings />} />
              <Route path="/ordenes/new" element={<BookingNew />} />
              <Route path="/ordenes/:id" element={<BookingDetail />} />
              <Route path="/ordenes/work-orders" element={<WorkOrders />} />

              {/* Datos */}
              <Route path="/datos" element={<Customers />} />
              <Route path="/datos/new" element={<CustomerNew />} />
              <Route path="/datos/:id" element={<CustomerDetail />} />
              <Route path="/datos/leads" element={<Leads />} />
              <Route path="/datos/follow-ups" element={<FollowUps />} />
              <Route path="/datos/timeline" element={<Timeline />} />

              {/* Docs (knowledge base) */}
              <Route path="/docs" element={<Chatbot />} />

              {/* Stock (services) */}
              <Route path="/stock" element={<Services />} />

              {/* Negocio */}
              <Route path="/negocio" element={<Admin />} />
              <Route path="/negocio/integraciones" element={<Integrations />} />
              <Route path="/negocio/chatbot" element={<Chatbot />} />
              <Route path="/negocio/chatbot-test" element={<DevChatbot />} />

              {/* Equipo */}
              <Route path="/equipo" element={<Admin />} />

              {/* Pagos */}
              <Route path="/pagos" element={<SalesAnalytics />} />

              {/* WhatsApp */}
              <Route path="/whatsapp" element={<Inbox />} />

              {/* Métricas */}
              <Route path="/metricas" element={<SalesAnalytics />} />

              {/* Perfil */}
              <Route path="/perfil" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />

              {/* Legacy redirects */}
              <Route path="/crm/*" element={<Navigate to="/ordenes" replace />} />
              <Route path="/chatbot" element={<Navigate to="/docs" replace />} />
              <Route path="/dev-chatbot" element={<Navigate to="/negocio/chatbot-test" replace />} />
              <Route path="/integrations" element={<Navigate to="/negocio/integraciones" replace />} />
              <Route path="/profile" element={<Navigate to="/perfil" replace />} />
              <Route path="/sales-analytics" element={<Navigate to="/metricas" replace />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
