import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import InferenceMonitor from './dashboard/InferenceMonitor';
import { ShieldCheck, ShieldOff, LayoutDashboard, Clock } from 'lucide-react';
import './DashboardSection.css';
import './StitchEnhancements.css';

const SENTRY_TIMEOUT_MS = 5000; // Mark offline if no stats for 5 seconds

const SentrySection = () => {
    const [sentryStatus, setSentryStatus] = useState('OFFLINE');
    const [latency, setLatency] = useState(null);
    const [serverIP, setServerIP] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const lastStatsTime = useRef(0);
    const pingIntervalRef = useRef(null);

    // Live clock - update every second
    useEffect(() => {
        const clockInterval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(clockInterval);
    }, []);

    // Listen for sentry status updates with timeout detection
    useEffect(() => {
        const socket = io('http://localhost:5001');

        socket.on('connect', () => {
            // Start ping interval for latency measurement
            pingIntervalRef.current = setInterval(() => {
                if (socket.connected) {
                    const start = Date.now();
                    socket.emit('ping', { timestamp: start });
                }
            }, 2000);
        });

        socket.on('pong', (data) => {
            const latencyMs = Date.now() - data.timestamp;
            setLatency(latencyMs);
        });

        socket.on('server_info', (data) => {
            setServerIP(data.ip);
        });

        socket.on('sentry_status', (data) => {
            setSentryStatus(data.status?.toUpperCase() || 'OFFLINE');
            lastStatsTime.current = Date.now();
        });

        socket.on('system_stats', () => {
            // If we're receiving system stats, sentry is active
            setSentryStatus('ACTIVE');
            lastStatsTime.current = Date.now();
        });

        // Check for timeout every second
        const timeoutChecker = setInterval(() => {
            const timeSinceLastStats = Date.now() - lastStatsTime.current;
            if (lastStatsTime.current > 0 && timeSinceLastStats > SENTRY_TIMEOUT_MS) {
                setSentryStatus('OFFLINE');
            }
        }, 1000);

        return () => {
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            socket.disconnect();
            clearInterval(timeoutChecker);
        };
    }, []);

    const isActive = sentryStatus === 'ACTIVE' || sentryStatus === 'ACTIVE MONITORING';

    return (
        <div id="sentry" className="dashboard-main">
            {/* Enhanced Header */}
            <header className="enhanced-header">
                <div className="header-title-section">
                    <div>
                        <Link to="/" style={{ textDecoration: 'none' }}>
                            <h1 className="header-title" style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '2px', cursor: 'pointer' }}>
                                ARGUS<span style={{ color: '#FFD700' }}>FL</span>
                            </h1>
                        </Link>
                    </div>
                </div>
                <div className="header-actions">
                    <Link to="/dashboard" className="header-btn" style={{ textDecoration: 'none', borderColor: 'rgba(220, 20, 60, 0.5)', color: '#DC143C' }}>
                        <LayoutDashboard size={16} /> Switch to FL Demo
                    </Link>
                    <div className="header-stat">
                        <span className="stat-label-dash">LIVE CLOCK</span>
                        <span className="stat-value-dash" style={{ color: '#38bdf8', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '1px' }}>
                            <Clock size={14} /> {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </span>
                    </div>
                    <div className="header-stat">
                        <span className="stat-label-dash">NETWORK LATENCY</span>
                        <span className="stat-value-dash" style={{ color: latency && latency < 50 ? '#4ade80' : latency && latency < 150 ? '#DC143C' : '#f87171' }}>
                            {latency !== null ? `${latency}ms` : '...'} {latency !== null && (latency < 50 ? '▼' : latency < 150 ? '●' : '▲')}
                        </span>
                    </div>
                    <div className="header-stat">
                        <span className="stat-label-dash">SERVER IP</span>
                        <span className="stat-value-dash" style={{ color: '#fff', fontFamily: 'monospace' }}>
                            {serverIP || 'SCANNING...'}
                        </span>
                    </div>
                    <div className="header-stat">
                        <span className="stat-label-dash">SYSTEM MODE</span>
                        <span
                            className={`stat-value-dash ${isActive ? 'connected' : ''}`}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: isActive ? '#4ade80' : '#f87171'
                            }}
                        >
                            {isActive ? (
                                <><ShieldCheck size={14} /> IDS Active</>
                            ) : (
                                <><ShieldOff size={14} /> IDS Offline</>
                            )}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div style={{ padding: '16px 24px', flex: 1, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <InferenceMonitor />
            </div>
        </div>
    );
};

export default SentrySection;
