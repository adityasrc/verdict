import { useSelector } from 'react-redux';
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import { Footer } from './components/Footer';
import { selectCurrentUser } from './features/auth/authSlice';
import AssignmentSubmissions from './pages/AssignmentSubmissions';
import AssignmentUpload from './pages/AssignmentUpload';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Signup from './pages/Signup';
import { Toaster } from './components/ui/sonner';

const FOOTER_HIDDEN_ROUTES = ['/login', '/signup', '/dashboard'];

const Layout = () => {
  const location = useLocation();
  const hideFooter =
    FOOTER_HIDDEN_ROUTES.some((path) => location.pathname.startsWith(path)) ||
    location.pathname.startsWith('/assignment') ||
    location.pathname.startsWith('/upload');

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <Outlet />
      {!hideFooter && <Footer />}
      <Toaster richColors position="bottom-right" />
    </div>
  );
};

const AuthLayout = () => (
  <div className="min-h-screen bg-zinc-950 text-white">
    <Outlet />
    <Toaster richColors position="bottom-right" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useSelector(selectCurrentUser);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
ProtectedRoute.displayName = 'ProtectedRoute';

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useSelector(selectCurrentUser);
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
PublicRoute.displayName = 'PublicRoute';

const NotFound = () => (
  <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
    <h1 className="text-6xl font-bold text-zinc-800 mb-4">404</h1>
    <p className="text-zinc-500 mb-6">Page not found</p>
    <Link
      to="/dashboard"
      className="px-4 py-2 bg-white text-zinc-950 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
    >
      Go to Dashboard
    </Link>
  </div>
);

function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      </Route>
      <Route element={<Layout />}>
        <Route path="/" element={<Onboarding />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/assignment/:assignmentId/submissions" element={<ProtectedRoute><AssignmentSubmissions /></ProtectedRoute>} />
        <Route path="/upload/:assignmentId" element={<ProtectedRoute><AssignmentUpload /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;