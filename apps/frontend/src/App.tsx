import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from './components/Navbar';
import { Footer } from './components/Footer';
import SidebarLayout from './components/SidebarLayout';
import { useAuth } from './hooks/useAuth';
import AssignmentSubmissions from './pages/AssignmentSubmissions';
import AssignmentUpload from './pages/AssignmentUpload';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Signup from './pages/Signup';
import { Toaster } from './components/ui/sonner';

const ProtectedRoute = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
};
ProtectedRoute.displayName = 'ProtectedRoute';

const TeacherRoute = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'TEACHER') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};
TeacherRoute.displayName = 'TeacherRoute';

const PublicRoute = () => {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};
PublicRoute.displayName = 'PublicRoute';

const AuthLayout = () => (
  <div className="min-h-screen bg-canvas text-text-primary">
    <Outlet />
  </div>
);

const LayoutWithFooter = () => (
  <div className="min-h-screen bg-canvas text-text-primary flex flex-col">
    <Navbar />
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
  </div>
);

const NotFound = () => (
  <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4">
    <div className="text-center">
      <h1 className="text-[120px] font-semibold text-text-primary leading-none tracking-tight">404</h1>
      <p className="text-text-secondary mt-4 mb-8 text-body-lg">This page doesn't exist.</p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-6 py-3 bg-mist text-zinc-950 rounded-md font-semibold text-sm hover:bg-mist-hover transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Go to Dashboard
      </Link>
    </div>
  </div>
);

function App() {
  return (
    <>
      <Toaster richColors position="bottom-right" />
      <Routes>

        <Route element={<AuthLayout />}>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
        </Route>

        <Route element={<LayoutWithFooter />}>
          <Route path="/" element={<Onboarding />} />
        </Route>

        <Route element={<SidebarLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
          
          <Route element={<TeacherRoute />}>
            <Route path="/assignment/:assignmentId/submissions" element={<AssignmentSubmissions />} />
          </Route>

          <Route path="/upload/:assignmentId" element={<AssignmentUpload />} />
        </Route>

        <Route path="*" element={<NotFound />} />

      </Routes>
    </>
  );
}

export default App;
