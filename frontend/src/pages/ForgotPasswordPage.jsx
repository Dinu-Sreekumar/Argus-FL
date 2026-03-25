import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [linkSent, setLinkSent] = useState(false);
    const { forgotPassword } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        await forgotPassword(email);
        setLinkSent(true);
        setTimeout(() => {
            setSubmitted(true);
        }, 500);
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
                    RECOVERY MODE
                </h2>

                {submitted ? (
                    <motion.div
                        className="text-center space-y-4"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                    >
                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded mb-4 text-sm font-mono">
                            If an account exists with that email, a recovery link has been sent.
                        </div>
                        <p className="text-gray-400 text-xs">Please check your inbox (and spam folder).</p>
                        <button onClick={() => navigate('/login')} className="text-[#DC143C] hover:text-white transition-colors text-sm font-bold uppercase tracking-widest mt-4">
                            Return to Login
                        </button>
                    </motion.div>
                ) : (
                    <>
                        <p className="text-gray-400 text-xs text-center mb-6">Enter your identity credentials to initiate a security reset protocol.</p>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[10px] uppercase tracking-[2px] text-gray-500 mb-2 font-bold">Identity (Email)</label>
                                <input
                                    type="email"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#DC143C] focus:shadow-[0_0_15px_rgba(220,20,60,0.1)] transition-all placeholder-gray-700"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={linkSent}
                                className="w-full font-bold py-3 rounded-lg tracking-widest text-sm transition-all"
                                style={{
                                    backgroundColor: linkSent ? '#4ade80' : '#DC143C',
                                    boxShadow: linkSent
                                        ? '0 0 30px rgba(74, 222, 128, 0.5)'
                                        : '0 0 20px rgba(220, 20, 60, 0.3)',
                                    animation: linkSent
                                        ? 'successPulse 300ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                                        : 'none'
                                }}
                            >
                                {linkSent ? '✓ LINK SENT' : 'SEND RECOVERY LINK'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <button onClick={() => navigate('/login')} className="text-xs text-gray-500 hover:text-[#DC143C] transition-colors uppercase tracking-wider">
                                Cancel Protocol
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default ForgotPasswordPage;
