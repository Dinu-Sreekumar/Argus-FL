import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');

    // 'register' or 'verify'
    const [step, setStep] = useState('register');
    const [registerSuccess, setRegisterSuccess] = useState(false);

    const { register, verifyOtp } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await register(name, email, password);
        setLoading(false);

        if (result.success) {
            setRegisterSuccess(true);
            setTimeout(() => {
                setStep('verify');
            }, 600);
        } else {
            setError(result.message);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await verifyOtp(email, otp);
        setLoading(false);

        if (result.success) {
            navigate('/login');
        } else {
            setError(result.message);
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
            <div className="absolute w-96 h-96 bg-[#DC143C] rounded-full blur-[150px] opacity-10 bottom-1/4 right-1/4 animate-pulse"></div>

            <motion.div
                className="relative z-10 bg-[#13141b]/80 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-96"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
                <h2 className="text-3xl font-bold mb-6 text-center tracking-wider text-transparent bg-clip-text bg-[#DC143C] drop-shadow-[0_2px_10px_rgba(220,20,60,0.3)]">
                    {step === 'register' ? 'NEW AGENT' : 'VERIFY IDENTITY'}
                </h2>

                {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2 rounded mb-4 text-sm text-center font-mono">{error}</div>}

                {step === 'register' ? (
                    <form onSubmit={handleRegister} className="space-y-6">
                        <div>
                            <label className="block text-[10px] uppercase tracking-[2px] text-gray-500 mb-2 font-bold">Codename</label>
                            <input
                                type="text"
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#DC143C] focus:shadow-[0_0_15px_rgba(220,20,60,0.1)] transition-all placeholder-gray-700"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
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
                        <div>
                            <label className="block text-[10px] uppercase tracking-[2px] text-gray-500 mb-2 font-bold">Set Passcode</label>
                            <input
                                type="password"
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#DC143C] focus:shadow-[0_0_15px_rgba(220,20,60,0.1)] transition-all placeholder-gray-700"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || registerSuccess}
                            className="w-full font-bold py-3 rounded-lg transition-all tracking-widest text-sm disabled:opacity-50"
                            style={{
                                backgroundColor: registerSuccess ? '#4ade80' : '#DC143C',
                                boxShadow: registerSuccess
                                    ? '0 0 30px rgba(74, 222, 128, 0.5)'
                                    : '0 0 20px rgba(220, 20, 60, 0.3)',
                                animation: registerSuccess ? 'successPulse 300ms cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (!registerSuccess && !loading) {
                                    e.target.style.backgroundColor = '#B22222';
                                    e.target.style.boxShadow = '0 0 30px rgba(220, 20, 60, 0.5)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!registerSuccess && !loading) {
                                    e.target.style.backgroundColor = '#DC143C';
                                    e.target.style.boxShadow = '0 0 20px rgba(220, 20, 60, 0.3)';
                                }
                            }}
                        >
                            {registerSuccess ? '✓ IDENTITY CREATED' : (loading ? 'INITIALIZING...' : 'INITIALIZE')}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerify} className="space-y-6">
                        <div className="text-center text-sm text-gray-400 mb-4">
                            Details transmitted to <span className="text-[#DC143C]">{email}</span>.
                            <br />Enter secure code below.
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-[2px] text-gray-500 mb-2 font-bold">Security Code</label>
                            <input
                                type="text"
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-[#DC143C] focus:shadow-[0_0_15px_rgba(220,20,60,0.1)] transition-all placeholder-gray-700"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                maxLength={6}
                                required
                                placeholder="000000"
                            />
                        </div>

                        <button type="submit" disabled={loading} className="w-full bg-[#DC143C] hover:bg-[#B22222] text-black font-bold py-3 rounded-lg transition-all shadow-[0_0_20px_rgba(220,20,60,0.3)] hover:shadow-[0_0_30px_rgba(220,20,60,0.5)] tracking-widest text-sm disabled:opacity-50">
                            {loading ? 'VERIFYING...' : 'CONFIRM IDENTITY'}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center">
                    <button onClick={() => navigate('/login')} className="text-xs text-gray-500 hover:text-[#DC143C] transition-colors uppercase tracking-wider">
                        Already have access? Login
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default RegisterPage;
