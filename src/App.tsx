import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/providers/auth-provider";
import { LanguageProvider } from "./components/providers/language-provider";
import { ProtectedRoute } from "./components/auth/protected-route";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import SalesAnalytics from "./pages/SalesAnalytics";
import CRM from "./pages/CRM";
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
import Datos from "./pages/crm/Datos";
import Docs from "./pages/crm/Docs";
import Stock from "./pages/crm/Stock";
import Negocio from "./pages/crm/Negocio";
import Equipo from "./pages/crm/Equipo";
import Pagos from "./pages/crm/Pagos";
import Metricas from "./pages/crm/Metricas";
import ChatbotIA from "./pages/crm/ChatbotIA";
import Chatbot from "./pages/Chatbot";
import DevChatbot from "./pages/DevChatbot";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Integrations from "./pages/Integrations";
import SuperAdmin from "./pages/SuperAdmin";
import AppLayout from "./layouts/AppLayout";
import CrmLayout from "./layouts/CrmLayout";
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
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/sales-analytics" element={<SalesAnalytics />} />
              <Route path="/chatbot" element={<Chatbot />} />
              <Route path="/dev-chatbot" element={<DevChatbot />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/super-admin" element={<SuperAdmin />} />
            </Route>
            
            {/* CRM sub-app routes */}
            <Route
              element={
                <ProtectedRoute>
                  <CrmLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/crm" element={<CRM />} />
              <Route path="/crm/customers" element={<Customers />} />
              <Route path="/crm/customers/new" element={<CustomerNew />} />
              <Route path="/crm/customers/:id" element={<CustomerDetail />} />
              <Route path="/crm/bookings" element={<Bookings />} />
              <Route path="/crm/bookings/new" element={<BookingNew />} />
              <Route path="/crm/bookings/:id" element={<BookingDetail />} />
              <Route path="/crm/leads" element={<Leads />} />
              <Route path="/crm/follow-ups" element={<FollowUps />} />
              <Route path="/crm/work-orders" element={<WorkOrders />} />
              <Route path="/crm/timeline" element={<Timeline />} />
              <Route path="/crm/inbox" element={<Inbox />} />
              <Route path="/crm/services" element={<Services />} />
              <Route path="/crm/datos" element={<Datos />} />
              <Route path="/crm/docs" element={<Docs />} />
              <Route path="/crm/stock" element={<Stock />} />
              <Route path="/crm/negocio" element={<Negocio />} />
              <Route path="/crm/equipo" element={<Equipo />} />
              <Route path="/crm/pagos" element={<Pagos />} />
              <Route path="/crm/metricas" element={<Metricas />} />
              <Route path="/crm/chatbot-ia" element={<ChatbotIA />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
