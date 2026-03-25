import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

const ResetPasswordPage = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [resetSuccess, setResetSuccess] = useState(false);
    const { resetPassword } = useAuth();
    const navigate = useNavigate();
    const { token } = useParams();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setStatus('mismatch');
            return;
        }

        setStatus('loading');
        const success = await resetPassword(token, password);

        if (success) {
            setStatus('success');
            setResetSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } else {
            setStatus('error');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen text-white relative overflow-hidden">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'linear-gradient(rgba(220,20,60,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(220,20,60,0.05) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }}
            ></div>
            {/* Background Blob for aesthetics */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(220,20,60,0.1)_0%,transparent_50%)] z-0"></div>
            <div className="absolute w-96 h-96 bg-[#DC143C] rounded-full blur-[150px] opacity-10 top-1/4 left-1/4 animate-pulse"></div>

            <motion.div
                className="relative z-10 bg-[#13141b]/80 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-96"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
                <h2 className="text-3xl font-bold mb-6 text-center tracking-wider text-transparent bg-clip-text bg-[#DC143C] drop-shadow-[0_2px_10px_rgba(220,20,60,0.3)]">
                    OVERRIDE PASSCODE
                </h2>

                {status === 'success' && (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-2 rounded mb-4 text-sm text-center font-mono animate-pulse">
                        Passcode successfully updated. Redirecting...
                    </div>
                )}

                {status === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2 rounded mb-4 text-sm text-center font-mono">
                        Link expired or invalid.
                    </div>
                )}

                {status === 'mismatch' && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-2 rounded mb-4 text-sm text-center font-mono">
                        Passcodes do not match.
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] uppercase tracking-[2px] text-gray-500 mb-2 font-bold">New Passcode</label>
                        <input
                            type="password"
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#DC143C] focus:shadow-[0_0_15px_rgba(220,20,60,0.1)] transition-all placeholder-gray-700"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-[2px] text-gray-500 mb-2 font-bold">Confirm Passcode</label>
                        <input
                            type="password"
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#DC143C] focus:shadow-[0_0_15px_rgba(220,20,60,0.1)] transition-all placeholder-gray-700"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'loading' || status === 'success'}
                        className={`w-full font-bold py-3 rounded-lg transition-all tracking-widest text-sm ${status === 'loading' ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        style={
                            resetSuccess
                                ? {
                                    backgroundColor: '#4ade80',
                                    boxShadow: '0 0 30px rgba(74, 222, 128, 0.5)',
                                    animation: 'successPulse 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    color: 'white'
                                }
                                : {
                                    backgroundColor: '#DC143C',
                                    boxShadow: '0 0 20px rgba(220, 20, 60, 0.3)',
                                    color: 'white'
                                }
                        }
                    >
                        {resetSuccess ? '✓ PASSCODE UPDATED' : status === 'loading' ? 'UPDATING...' : 'SET NEW PASSCODE'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default ResetPasswordPage;
