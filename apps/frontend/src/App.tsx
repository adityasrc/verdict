import { useSelector } from 'react-redux';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import { selectCurrentUser } from './features/auth/authSlice';
import AssignmentSubmissions from './pages/AssignmentSubmissions';
import AssignmentUpload from './pages/AssignmentUpload';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Signup from './pages/Signup';
import { Toaster } from './components/ui/sonner';

const Layout = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#030712] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
            <Navbar />
            <Outlet />
            <Toaster richColors position="bottom-right" />
        </div>
    );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const user = useSelector(selectCurrentUser);
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const user = useSelector(selectCurrentUser);
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
};

function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<Onboarding />} />
                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    }
                />
                <Route
                    path="/signup"
                    element={
                        <PublicRoute>
                            <Signup />
                        </PublicRoute>
                    }
                />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/assignment/:assignmentId/submissions"
                    element={
                        <ProtectedRoute>
                            <AssignmentSubmissions />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/upload/:assignmentId"
                    element={
                        <ProtectedRoute>
                            <AssignmentUpload />
                        </ProtectedRoute>
                    }
                />
            </Route>
        </Routes>
    );
}

export default App;