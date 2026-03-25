import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, ChevronDown, Settings } from 'lucide-react';
import LogoutConfirmationModal from './LogoutConfirmationModal';

/**
 * UserButton Component
 * Shows user avatar with dropdown when logged in, or Login button when not authenticated.
 * Maintains consistent styling across all pages.
 */
const UserButton = () => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [userEmail, setUserEmail] = useState(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const token = localStorage.getItem('token');
    const isLoggedIn = !!token;

    // Parse user info from JWT token
    useEffect(() => {
        if (token) {
            try {
                // Decode JWT payload (base64)
                const payload = token.split('.')[1];
                const decoded = JSON.parse(atob(payload));
                setUserEmail(decoded.sub || decoded.email || 'User');
            } catch (e) {
                setUserEmail('User');
            }
        }
    }, [token]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogoutClick = () => {
        setShowDropdown(false);
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    // Get initials from email or name
    const getInitials = () => {
        if (!userEmail) return 'U';
        const name = userEmail.split('@')[0];
        return name.charAt(0).toUpperCase();
    };

    if (!isLoggedIn) {
        return (
            <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-black font-medium rounded-lg transition-colors"
            >
                <User size={18} />
                <span className="hidden sm:inline">Log In</span>
            </Link>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-colors"
            >
                <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                    {getInitials()}
                </div>
                <ChevronDown
                    size={16}
                    className={`text-gray-600 dark:text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-gray-200 dark:border-gray-800/20 rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {getInitials()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-text font-medium text-sm truncate">
                                    {userEmail?.split('@')[0] || 'User'}
                                </p>
                                <p className="text-text-muted text-xs truncate">
                                    {userEmail || 'user@email.com'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items - Alphabetical Order */}
                    <div className="py-2">
                        <Link
                            to="/portfolio"
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-text-muted hover:bg-gray-800/5 hover:text-text transition-colors"
                        >
                            <span className="text-sm">My Portfolio</span>
                        </Link>
                        <Link
                            to="/wishlist"
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-text-muted hover:bg-gray-800/5 hover:text-text transition-colors"
                        >
                            <span className="text-sm">My Watchlist</span>
                        </Link>
                        <Link
                            to="/settings"
                            onClick={() => setShowDropdown(false)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-text-muted hover:bg-gray-800/5 hover:text-text transition-colors"
                        >
                            <Settings size={16} />
                            <span className="text-sm">Settings</span>
                        </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-200 dark:border-gray-800 py-2">
                        <button
                            onClick={handleLogoutClick}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                        >
                            <LogOut size={16} />
                            <span className="text-sm">Log Out</span>
                        </button>
                    </div>
                </div>
            )}

            <LogoutConfirmationModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={confirmLogout}
            />
        </div>
    );
};

export default UserButton;
