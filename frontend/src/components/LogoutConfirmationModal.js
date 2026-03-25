import React, { useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LogoutConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-card w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden"
                >
                    <div className="p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                                <LogOut className="text-red-500" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-text">Log Out</h3>
                                <p className="text-sm text-text-muted">Are you sure you want to sign out?</p>
                            </div>
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 mb-8">
                            You will need to sign in again to access your portfolio and watchlist.
                        </p>

                        <div className="flex gap-4">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-text font-medium rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-500/20"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default LogoutConfirmationModal;
