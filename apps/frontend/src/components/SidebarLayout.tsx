import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/store';
import { logout, selectCurrentUser } from '../features/auth/authSlice';

const SidebarLayout: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAppSelector(selectCurrentUser);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    // Only include nav links that have real pages
    const navLinks = [
        { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    ];

    const getLinkClass = (path: string) => {
        const isActive = location.pathname === path;
        return `flex items-center gap-4 px-4 py-3 font-label-caps text-label-caps uppercase transition-colors brutal-button ${
            isActive
                ? 'bg-secondary text-on-secondary border-[2px] border-on-surface brutal-shadow'
                : 'text-on-surface-variant hover:bg-surface-variant border-[2px] border-transparent hover:border-on-surface'
        }`;
    };

    return (
        <div className="font-body-md bg-surface text-on-surface flex flex-col md:flex-row min-h-screen selection:bg-primary selection:text-on-primary">
            {/* Sidebar (Desktop) */}
            <nav className="hidden md:flex flex-col h-screen w-64 border-r-[4px] border-on-surface bg-surface fixed left-0 top-0 pt-24 pb-8 z-40">
                <div className="px-gutter mb-12">
                    {/* Link to landing page */}
                    <Link to="/" className="block">
                        <h1 className="font-headline-md text-headline-md text-on-surface uppercase tracking-tighter hover:text-primary transition-colors">Verdict</h1>
                        <p className="font-label-mono text-label-mono text-on-surface-variant mt-2 border-t-[2px] border-on-surface pt-2">AI Grading Engine</p>
                    </Link>
                </div>

                <div className="flex-1 px-4 space-y-4">
                    {navLinks.map((link) => (
                        <Link key={link.label} to={link.path} className={getLinkClass(link.path)}>
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === link.path ? "'FILL' 1" : "" }}>
                                {link.icon}
                            </span>
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="px-4 mt-auto space-y-4">
                    {/* Logged-in user */}
                    {user && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-surface-variant border-[2px] border-on-surface">
                            <span className="material-symbols-outlined text-on-surface-variant">person</span>
                            <span className="font-label-mono text-xs text-on-surface-variant uppercase truncate">
                                {user.email?.split('@')[0]}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-4 py-3 text-error hover:bg-error-container border-[2px] border-transparent hover:border-error transition-colors font-label-caps text-label-caps uppercase"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        Logout
                    </button>
                </div>
            </nav>

            {/* Top Nav (Mobile) */}
            <nav className="flex md:hidden justify-between items-center px-margin-mobile py-4 w-full sticky top-0 z-50 bg-surface border-b-[4px] border-on-surface brutal-shadow">
                <h1 className="font-headline-md text-headline-md font-black text-on-surface uppercase tracking-tighter">Verdict</h1>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 border-[2px] border-on-surface brutal-shadow hover:bg-primary hover:text-on-primary transition-colors brutal-button"
                    aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                >
                    <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
                </button>
            </nav>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 top-[72px] z-40 bg-surface flex flex-col p-4 border-b-[4px] border-on-surface brutal-shadow">
                    <div className="flex-1 space-y-4">
                        {navLinks.map((link) => (
                            <Link key={link.label} to={link.path} onClick={() => setIsMobileMenuOpen(false)} className={getLinkClass(link.path)}>
                                <span className="material-symbols-outlined">{link.icon}</span>
                                {link.label}
                            </Link>
                        ))}
                    </div>
                    <div className="mt-8 space-y-4 pt-4 border-t-[4px] border-on-surface">
                        <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-3 text-error hover:bg-error-container border-[2px] border-transparent hover:border-error transition-colors font-label-caps text-label-caps uppercase brutal-button">
                            <span className="material-symbols-outlined">logout</span>
                            Logout
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Canvas */}
            <main className="flex-1 w-full md:ml-64 p-margin-mobile md:p-margin-desktop bg-surface min-h-screen">
                <Outlet />
            </main>
        </div>
    );
};

export default SidebarLayout;
