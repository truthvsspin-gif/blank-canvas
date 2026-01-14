import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/providers/auth-provider";
import { LanguageProvider } from "./components/providers/language-provider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Customers from "./pages/crm/Customers";
import CustomerDetail from "./pages/crm/CustomerDetail";
import CustomerNew from "./pages/crm/CustomerNew";
import Bookings from "./pages/crm/Bookings";
import BookingDetail from "./pages/crm/BookingDetail";
import BookingNew from "./pages/crm/BookingNew";
import Leads from "./pages/crm/Leads";
import Inbox from "./pages/crm/Inbox";
import Services from "./pages/crm/Services";
import Chatbot from "./pages/Chatbot";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
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
            
            {/* Protected app routes */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/crm/customers" element={<Customers />} />
              <Route path="/crm/customers/new" element={<CustomerNew />} />
              <Route path="/crm/customers/:id" element={<CustomerDetail />} />
              <Route path="/crm/bookings" element={<Bookings />} />
              <Route path="/crm/bookings/new" element={<BookingNew />} />
              <Route path="/crm/bookings/:id" element={<BookingDetail />} />
              <Route path="/crm/leads" element={<Leads />} />
              <Route path="/crm/inbox" element={<Inbox />} />
              <Route path="/crm/services" element={<Services />} />
              <Route path="/chatbot" element={<Chatbot />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
