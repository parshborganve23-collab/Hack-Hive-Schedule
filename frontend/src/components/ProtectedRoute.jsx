import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center hex-bg">
        <div className="font-mono text-sm uppercase tracking-widest">Loading hive...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
