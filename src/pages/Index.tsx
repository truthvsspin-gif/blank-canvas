import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8fafc' }}>
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold" style={{ color: '#0f172a' }}>El Detailer Pro</h1>
        <p style={{ color: '#64748b' }}>Professional Auto Detailing CRM</p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link to="/login">Login</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/signup">Sign Up</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
