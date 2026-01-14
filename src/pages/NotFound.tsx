import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <p className="text-muted-foreground">Page not found</p>
        <Link to="/" className="text-primary hover:underline">
          Go back home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
