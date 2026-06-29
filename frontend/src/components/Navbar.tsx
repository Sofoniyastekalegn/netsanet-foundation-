import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Menu, X, User, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { Language } from '../contexts/LanguageContext';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const location = useLocation();
    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const { lang, setLang, t } = useLanguage();
    const userMenuRef = useRef<HTMLDivElement>(null);

    const isActive = (path: string) => location.pathname === path;

    // Close menus on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Close mobile menu on route change
    useEffect(() => { setIsMenuOpen(false); }, [location.pathname]);

    const handleLogout = () => { logout(); setIsUserMenuOpen(false); };

    const navItems = [
        { path: '/', label: t('nav.home') },
        { path: '/legal-advisor', label: t('nav.legalAdvisor') },
        { path: '/appeal-generator', label: t('nav.appealGenerator') },
        { path: '/case-stories', label: t('nav.caseStories') },
        { path: '/support-directory', label: t('nav.supportDirectory') },
        ...(isAuthenticated && !isAdmin ? [{ path: '/story-wall', label: t('nav.storyWall') }] : []),
    ];

    const langOptions: { value: Language; label: string; flag: string }[] = [
        { value: 'en', label: 'EN', flag: '🇬🇧' },
        { value: 'am', label: 'አማ', flag: '🇪🇹' },
    ];

    return (
        <nav className="bg-white shadow-lg fixed w-full top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center gap-2 mr-8">
                            <Heart className="w-7 h-7 text-primary-500" />
                            <span className="text-xl font-bold text-gray-900">Netsanet</span>
                        </Link>

                        {/* Desktop nav */}
                        <div className="hidden lg:flex items-center gap-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.path)
                                        ? 'bg-primary-50 text-primary-600'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2">
                        {/* Language toggle */}
                        <div className="flex items-center bg-gray-100 rounded-full p-0.5 gap-0.5">
                            {langOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setLang(opt.value)}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${lang === opt.value
                                        ? 'bg-white text-primary-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <span>{opt.flag}</span>
                                    <span>{opt.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Auth */}
                        {isAuthenticated ? (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 focus:outline-none"
                                >
                                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4 text-primary-600" />
                                    </div>
                                    <span className="hidden sm:block text-sm font-medium">{user?.username}</span>
                                </button>

                                {isUserMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-1 z-50 border border-gray-100 overflow-hidden">
                                        <div className="px-4 py-2.5 border-b border-gray-100">
                                            <div className="font-semibold text-sm text-gray-900">{user?.username}</div>
                                            <div className="text-xs text-gray-500">{user?.email}</div>
                                            {isAdmin && (
                                                <div className="flex items-center mt-1 gap-1">
                                                    <Shield className="w-3 h-3 text-primary-500" />
                                                    <span className="text-xs text-primary-600 font-medium">Admin</span>
                                                </div>
                                            )}
                                        </div>
                                        {!isAdmin && (
                                            <Link to="/my-dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsUserMenuOpen(false)}>
                                                {t('nav.myDashboard')}
                                            </Link>
                                        )}
                                        {isAdmin && (
                                            <Link to="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsUserMenuOpen(false)}>
                                                {t('nav.adminDashboard')}
                                            </Link>
                                        )}
                                        <button onClick={handleLogout} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                            <LogOut className="w-4 h-4" />
                                            {t('nav.signOut')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="hidden md:flex items-center gap-2">
                                <Link to="/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    {t('nav.signIn')}
                                </Link>
                                <Link to="/register" className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                    {t('nav.signUp')}
                                </Link>
                            </div>
                        )}

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
                        >
                            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu — animated slide down */}
            <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-3 pt-2 pb-4 space-y-1 bg-white border-t border-gray-100 shadow-lg">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item.path)
                                ? 'bg-primary-50 text-primary-600'
                                : 'text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                    {!isAuthenticated && (
                        <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
                            <Link to="/login" className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50">
                                {t('nav.signIn')}
                            </Link>
                            <Link to="/register" className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600">
                                {t('nav.signUp')}
                            </Link>
                        </div>
                    )}
                    {isAuthenticated && (
                        <button onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 mt-1">
                            <LogOut className="w-4 h-4" />
                            {t('nav.signOut')}
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
