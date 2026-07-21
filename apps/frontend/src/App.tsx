import { useSelector } from 'react-redux';
import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
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

const ProtectedRoute = () => {
  const user = useSelector(selectCurrentUser);
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
};
ProtectedRoute.displayName = 'ProtectedRoute';

const TeacherRoute = () => {
  const user = useSelector(selectCurrentUser);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'TEACHER') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};
TeacherRoute.displayName = 'TeacherRoute';

const PublicRoute = () => {
  const user = useSelector(selectCurrentUser);
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};
PublicRoute.displayName = 'PublicRoute';

const AuthLayout = () => (
  <div className="min-h-screen bg-surface text-on-surface">
    <Outlet />
  </div>
);

const LayoutWithFooter = () => (
  <div className="min-h-screen bg-surface text-on-surface flex flex-col">
    <Navbar />
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
  </div>
);

const NotFound = () => (
  <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
    <div className="border-[4px] border-on-surface brutal-shadow p-12 text-center bg-surface">
      <h1 className="text-8xl font-black text-on-surface mb-4 uppercase tracking-tighter">404</h1>
      <p className="font-label-mono text-on-surface-variant uppercase font-bold mb-8">Page not found</p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary border-[4px] border-on-surface font-label-caps uppercase font-bold brutal-shadow brutal-button hover:bg-primary-container transition-all duration-75"
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