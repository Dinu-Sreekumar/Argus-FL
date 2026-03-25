import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import DashboardPage from './pages/DashboardPage';
import SentryPage from './pages/SentryPage'; // Import new page
import ScrollToTop from './components/ui/ScrollToTop';
import SmoothScrollWrapper from './components/layout/SmoothScrollWrapper';
import MainLayout from './components/layout/MainLayout';
import LoadingScreen from './components/ui/LoadingScreen';
import PageTransition from './components/ui/PageTransition';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import WhyLoginPage from './pages/WhyLoginPage';
import { AuthProvider, useAuth } from './AuthContext';
import './App.css';

// Disable browser scroll restoration globally
if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
}

// Protected Route Wrapper
const PrivateRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <LoadingScreen />;

    return user ? children : <Navigate to="/login" state={{ from: location }} replace />;
};

// Wrapper to conditionally render Navbar and handle layout classes
const AppContent = () => {
    const location = useLocation();
    const isDashboard = location.pathname === '/dashboard';
    const isSentry = location.pathname === '/sentry';
    const isHome = location.pathname === '/';

    const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password' || location.pathname.startsWith('/reset-password') || location.pathname === '/why-login';

    // Show Navbar only on non-dashboard/non-sentry pages (they have their own headers)
    const showNavbar = !isHome && !isAuthPage && !isDashboard && !isSentry;

    return (
        <MainLayout className={isHome ? "" : "dashboard-layout"}>
            <ScrollToTop />
            {showNavbar && <Navbar />}
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
                    <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
                    <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />
                    <Route path="/forgot-password" element={<PageTransition><ForgotPasswordPage /></PageTransition>} />
                    <Route path="/reset-password/:token" element={<PageTransition><ResetPasswordPage /></PageTransition>} />
                    <Route path="/why-login" element={<PageTransition><WhyLoginPage /></PageTransition>} />

                    {/* Protected Routes */}
                    <Route
                        path="/dashboard"
                        element={
                            <PageTransition>
                                <PrivateRoute>
                                    <DashboardPage />
                                </PrivateRoute>
                            </PageTransition>
                        }
                    />
                    <Route
                        path="/sentry"
                        element={
                            <PageTransition>
                                <PrivateRoute>
                                    <SentryPage />
                                </PrivateRoute>
                            </PageTransition>
                        }
                    />
                </Routes>
            </AnimatePresence>
        </MainLayout>
    );
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <SmoothScrollWrapper>
                    <AppContent />
                </SmoothScrollWrapper>
            </Router>
        </AuthProvider>
    );
}

export default App;
