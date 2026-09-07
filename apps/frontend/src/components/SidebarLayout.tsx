import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, Upload, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { logout, selectCurrentUser } from '../features/auth/authSlice';
import { BrandMark } from './BrandMark';

interface NavItem {
    path: string;
    label: string;
    icon: LucideIcon;
}

const SidebarLayout: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAppSelector(selectCurrentUser);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/');
    };

    const navLinks: NavItem[] = user
        ? [{ path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }]
        : [{ path: location.pathname, label: 'Submission Portal', icon: Upload }];

    const getLinkClass = (path: string) => {
        const isActive = location.pathname === path || (path === '/dashboard' && location.pathname.startsWith('/upload'));
        return `flex items-center gap-3 px-3 py-2 rounded-md text-body-sm font-medium transition-colors ${
            isActive
                ? 'bg-white/5 text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
        }`;
    };

    return (
        <div className="bg-canvas text-text-primary flex flex-col md:flex-row min-h-screen">
            {/* Sidebar (Desktop) */}
            <nav className="hidden md:flex flex-col h-screen w-64 border-r border-border bg-surface fixed left-0 top-0 py-6 z-40">
                <div className="px-5 mb-8">
                    <BrandMark />
                </div>

                <div className="flex-1 px-3 space-y-1">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                            <Link key={link.label} to={link.path} className={getLinkClass(link.path)}>
                                <Icon className="h-4 w-4 shrink-0" />
                                {link.label}
                            </Link>
                        );
                    })}
                </div>

                <div className="px-3 mt-auto space-y-3">
                    {user && (
                        <>
                            <div className="border-t border-border pt-3">
                                <p className="text-body-sm font-medium text-text-primary truncate">
                                    {user.name || user.email?.split('@')[0]}
                                </p>
                                <p className="font-mono text-[11px] text-text-muted uppercase tracking-wider mt-0.5">
                                    {user?.role === 'TEACHER' ? 'Educator' : 'Student'}
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-body-sm text-text-secondary hover:text-error hover:bg-error-muted transition-colors"
                            >
                                <LogOut className="h-4 w-4 shrink-0" />
                                Logout
                            </button>
                        </>
                    )}
                </div>
            </nav>

            {/* Top Nav (Mobile) */}
            <nav className="flex md:hidden justify-between items-center px-4 py-3 w-full sticky top-0 z-50 bg-canvas/90 backdrop-blur-md border-b border-border">
                <BrandMark compact />
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
                    aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                >
                    {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </nav>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 top-[56px] z-40 bg-surface flex flex-col p-4">
                    <div className="flex-1 space-y-1">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.label}
                                    to={link.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={getLinkClass(link.path)}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                    <div className="mt-auto space-y-3 pt-4 border-t border-border">
                        {user && (
                            <>
                                <div className="border-t border-border pt-3 pb-1">
                                    <span className="block text-body-sm font-medium text-text-primary truncate">
                                        {user.name || user.email?.split('@')[0]}
                                    </span>
                                    <span className="font-mono text-[11px] text-text-muted uppercase tracking-wider mt-0.5 block">
                                        {user?.role === 'TEACHER' ? 'Educator' : 'Student'}
                                    </span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-body-sm text-text-secondary hover:text-error hover:bg-error-muted transition-colors"
                                >
                                    <LogOut className="h-4 w-4 shrink-0" />
                                    Logout
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 w-full md:ml-64 p-4 md:p-8 bg-canvas min-h-screen">
                <Outlet />
            </main>
        </div>
    );
};

export default SidebarLayout;
