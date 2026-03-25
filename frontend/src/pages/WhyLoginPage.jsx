import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const WhyLoginPage = () => {
    return (
        <div style={{
            minHeight: '100vh',
            background: '#0a0b10',
            backgroundImage: 'linear-gradient(rgba(220,20,60,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(220,20,60,0.05) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header - matches HomePage */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0b10]/90 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-8 py-5">
                    <Link to="/" className="inline-block" style={{ textDecoration: 'none' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '2px', color: '#fff', margin: 0, cursor: 'pointer' }}>
                            ARGUS<span style={{ color: '#FFD700' }}>FL</span>
                        </h1>
                    </Link>
                </div>
            </header>

            {/* Title */}
            <motion.div
                style={{ textAlign: 'center', padding: '100px 20px 20px' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'rgba(220, 20, 60, 0.1)',
                    border: '1px solid rgba(220, 20, 60, 0.3)',
                    borderRadius: '9999px',
                    color: '#DC143C',
                    fontSize: '14px',
                    fontWeight: 500,
                    marginBottom: '16px'
                }}>
                    Why Login?
                </div>
                <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '8px' }}>
                    User Registration & Login Flow
                </h2>
                <p style={{ color: '#9ca3af', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
                    How Argus-FL uses authentication to deliver personalized, per-user intrusion detection and reporting.
                </p>
            </motion.div>

            {/* Flowchart SVG */}
            <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                padding: '20px 40px 60px',
                overflow: 'auto'
            }}>
                <div style={{
                    background: '#13141b',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    padding: '24px',
                    maxWidth: '1000px',
                    width: '100%',
                    overflow: 'auto'
                }}>
                    <img
                        src={process.env.PUBLIC_URL + '/login-flowchart.svg'}
                        alt="User Registration and Login Flowchart"
                        style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                            opacity: 0.9,
                            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))',
                            borderRadius: '8px'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default WhyLoginPage;
