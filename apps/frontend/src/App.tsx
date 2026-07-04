import { useSelector } from 'react-redux';
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import { Footer } from './components/Footer';
import SidebarLayout from './components/SidebarLayout';
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
    <div className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <Outlet />
      {!hideFooter && <Footer />}
    </div>
  );
};

const AuthLayout = () => (
  <div className="min-h-screen bg-surface text-on-surface">
    <Outlet />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useSelector(selectCurrentUser);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
ProtectedRoute.displayName = 'ProtectedRoute';

const TeacherRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useSelector(selectCurrentUser);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'TEACHER') return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};
TeacherRoute.displayName = 'TeacherRoute';

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useSelector(selectCurrentUser);
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
PublicRoute.displayName = 'PublicRoute';

const NotFound = () => (
  <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
    <div className="border-[4px] border-on-surface brutal-shadow p-12 text-center bg-surface">
      <h1 className="text-8xl font-black text-on-surface mb-4 uppercase tracking-tighter">404</h1>
      <p className="font-label-mono text-on-surface-variant uppercase font-bold mb-8">Page not found</p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary border-[4px] border-on-surface font-label-caps uppercase font-bold brutal-shadow brutal-button hover:bg-primary-container"
      >
        <span className="material-symbols-outlined">arrow_back</span>
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
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        </Route>


        <Route element={<Layout />}>
          <Route path="/" element={<Onboarding />} />
        </Route>


        <Route element={<SidebarLayout />}>
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          <Route
            path="/assignment/:assignmentId/submissions"
            element={<TeacherRoute><AssignmentSubmissions /></TeacherRoute>}
          />


          <Route
            path="/upload/:assignmentId"
            element={<ProtectedRoute><AssignmentUpload /></ProtectedRoute>}
          />
        </Route>


        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
export default App;