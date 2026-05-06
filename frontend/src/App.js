import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import CreateMeeting from "@/pages/CreateMeeting";
import MeetingDetail from "@/pages/MeetingDetail";
import CalendarPage from "@/pages/CalendarPage";
import Notifications from "@/pages/Notifications";
import Analytics from "@/pages/Analytics";
import PublicPoll from "@/pages/PublicPoll";
import { Toaster } from "sonner";

function HomeRedirect() {
  const { user, ready } = useAuth();
  if (!ready) return <div className="min-h-screen flex items-center justify-center hex-bg"><div className="mono-label">loading...</div></div>;
  return user ? <Navigate to="/dashboard" replace /> : <Landing />;
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Toaster richColors position="top-right" />
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/poll/:token" element={<PublicPoll />} />

            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/meetings/new" element={<ProtectedRoute><CreateMeeting /></ProtectedRoute>} />
            <Route path="/meetings/:id" element={<ProtectedRoute><MeetingDetail /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
