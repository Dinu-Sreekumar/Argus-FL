import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    BarChart as RechartsBarChart, Bar, Legend, ReferenceLine
} from 'recharts';
import {
    Monitor, Smartphone, Tablet, RotateCcw, Square, Rocket, Download, Mail, Shield,
    Activity, BarChart
} from 'lucide-react';
import './DashboardSection.css';
import './StitchEnhancements.css';
import FLProcessVisualization from './FLProcessVisualization';
import FLStepsOverview from './FLStepsOverview';
import Skeleton from './ui/Skeleton';
import '../components/ui/Skeleton.css';


const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
};


const DashboardSection = ({ onMetricsUpdate }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [viewMode, setViewMode] = useState('process'); // 'process' or 'metrics'
    const [activeStep, setActiveStep] = useState(0);
    const [showRestartConfirm, setShowRestartConfirm] = useState(false);
    const [currentRound, setCurrentRound] = useState(0);
    const [metrics, setMetrics] = useState([]);
    const [nodes, setNodes] = useState([
        { id: 1, name: 'Smart Home Node 1', ip: 'Awaiting...', status: 'idle', packetLoss: 0.0, icon: Monitor },
        { id: 2, name: 'Smart Home Node 2', ip: 'Awaiting...', status: 'idle', packetLoss: 0.0, icon: Smartphone },
        { id: 3, name: 'Smart Home Node 3', ip: 'Awaiting...', status: 'idle', packetLoss: 0.0, icon: Tablet },
    ]);
    const [isConnected, setIsConnected] = useState(false);
    const [serverIP, setServerIP] = useState(null);
    const [latency, setLatency] = useState(null);
    const socketRef = useRef(null);
    const pingIntervalRef = useRef(null);
    const restartGuardRef = useRef(false);

    // Interaction state for the chart
    const [hoveredMetric, setHoveredMetric] = useState(null);

    // Animation refs for scroll-triggered animations
    const gridRef = useRef(null);
    const isGridInView = useInView(gridRef, { once: false, amount: 0.3 });

    useEffect(() => {
        console.log('Connecting to Socket.IO server at http://127.0.0.1:5001...');
        socketRef.current = io('http://127.0.0.1:5001', { transports: ['websocket'] });

        socketRef.current.on('connect', () => {
            console.log('✅ Socket connected successfully!');
            setIsConnected(true);

            // Start ping interval for latency measurement
            pingIntervalRef.current = setInterval(() => {
                if (socketRef.current?.connected) {
                    const start = Date.now();
                    socketRef.current.emit('ping', { timestamp: start });
                }
            }, 2000); // Ping every 2 seconds
        });

        socketRef.current.on('pong', (data) => {
            const latencyMs = Date.now() - data.timestamp;
            setLatency(latencyMs);
        });

        socketRef.current.on('disconnect', () => {
            console.log('❌ Socket disconnected!');
            setIsConnected(false);
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error);
            setIsConnected(false);
        });

        socketRef.current.on('server_info', (data) => {
            console.log('Received server info:', data);
            setServerIP(data.ip);
        });

        socketRef.current.on('training_metrics', (data) => {
            // Ignore stale metrics arriving after a restart
            if (restartGuardRef.current) {
                console.log('Ignoring training_metrics (restart guard active)');
                return;
            }
            console.log('Received training_metrics:', data);
            // Sync running state — handles returning to page mid-training
            setIsRunning(true);
            const newMetric = {
                round: data.round,
                accuracy: data.accuracy,
                loss: data.loss,
                f1_score: data.f1_score || 0,
                precision: data.precision || 0,
                recall: data.recall || 0,
                tp: data.tp || 0,
                tn: data.tn || 0,
                fp: data.fp || 0,
                fn: data.fn || 0
            };
            setMetrics((prev) => {
                const updated = [...prev, newMetric];
                if (onMetricsUpdate) onMetricsUpdate(updated);
                return updated;
            });
            setCurrentRound(data.round);
            setNodes((prev) =>
                prev.map((node) => ({ ...node, status: 'training' }))
            );
        });

        socketRef.current.on('training_complete', () => {
            setIsRunning(false);
            setNodes((prev) =>
                prev.map((node) => ({ ...node, status: 'idle' }))
            );
        });

        // Listen for real-time node updates from clients
        socketRef.current.on('nodes_update', (data) => {
            if (restartGuardRef.current) return;
            console.log('Received nodes_update:', data);
            if (data.nodes && Array.isArray(data.nodes)) {
                setNodes((prev) => {
                    // Merge incoming node data with existing nodes
                    const updatedNodes = prev.map((node) => {
                        const serverNode = data.nodes.find((n) => n.id === node.id);
                        if (serverNode) {
                            return {
                                ...node,
                                ip: serverNode.ip || node.ip,
                                packetLoss: serverNode.loss || node.packetLoss,
                                status: serverNode.status?.toLowerCase() || node.status,
                            };
                        }
                        return node;
                    });
                    return updatedNodes;
                });
            }
        });

        return () => {
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [onMetricsUpdate]);

    const handleStart = () => {
        if (isRunning) {
            handleStop();
        } else {
            handleQuickStart(50);
        }
    };

    const handleQuickStart = (rounds) => {
        console.log(`Starting training with ${rounds} rounds`);
        setMetrics([]);
        setCurrentRound(0);
        setIsRunning(true);
        setNodes((prev) =>
            prev.map((node) => ({ ...node, status: 'training' }))
        );
        if (socketRef.current?.connected) {
            console.log('Socket is connected, emitting start_training');
            socketRef.current.emit('start_training', { rounds: rounds });
        } else {
            console.error('Socket is NOT connected!');
        }
    };

    const handleStop = () => {
        // Guard against stale metrics arriving after stop
        restartGuardRef.current = true;
        setTimeout(() => { restartGuardRef.current = false; }, 3000);

        if (socketRef.current?.connected) {
            console.log('Emitting stop_training');
            socketRef.current.emit('stop_training');
        }
        setIsRunning(false);
        setMetrics([]);
        setCurrentRound(0);
        setHoveredMetric(null);
        setNodes((prev) =>
            prev.map((node) => ({ ...node, status: 'idle' }))
        );
    };

    const handleRestart = () => {
        setShowRestartConfirm(true);
    };

    const confirmRestart = () => {
        // Activate restart guard to ignore stale metrics
        restartGuardRef.current = true;
        setTimeout(() => { restartGuardRef.current = false; }, 3000);

        if (socketRef.current?.connected) {
            console.log('Emitting stop_training + restart_system');
            socketRef.current.emit('stop_training');
            socketRef.current.emit('restart_system');
        }
        // Reset all training & metrics state
        setIsRunning(false);
        setMetrics([]);
        setCurrentRound(0);
        setHoveredMetric(null);
        setActiveStep(0);
        setViewMode('process');
        setNodes([
            { id: 1, name: 'Smart Home Node 1', ip: 'Awaiting...', status: 'idle', packetLoss: 0.0, icon: Monitor },
            { id: 2, name: 'Smart Home Node 2', ip: 'Awaiting...', status: 'idle', packetLoss: 0.0, icon: Smartphone },
            { id: 3, name: 'Smart Home Node 3', ip: 'Awaiting...', status: 'idle', packetLoss: 0.0, icon: Tablet },
        ]);
        setShowRestartConfirm(false);
    };

    // FL Report handlers
    const handleDownloadFLReport = () => {
        window.open('http://localhost:5001/api/fl-report/download', '_blank');
    };

    const handleEmailFLReport = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/fl-report/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            const data = await response.json();
            if (response.ok) {
                alert(data.message || 'FL Report sent to your email!');
            } else {
                alert(data.error || 'Failed to send FL report');
            }
        } catch (error) {
            console.error('Email failed:', error);
            alert('Failed to send FL report: ' + error.message);
        }
    };

    // Derived metrics for display
    const activeMetric = hoveredMetric || (metrics.length > 0 ? metrics[metrics.length - 1] : null);

    const displayF1 = activeMetric ? (activeMetric.f1_score * 100).toFixed(1) : '0.0';
    const displayPrecision = activeMetric ? (activeMetric.precision * 100).toFixed(1) : '0.0';
    const displayRecall = activeMetric ? (activeMetric.recall * 100).toFixed(1) : '0.0';
    const displayConfusion = activeMetric ? {
        tp: activeMetric.tp || 0,
        tn: activeMetric.tn || 0,
        fp: activeMetric.fp || 0,
        fn: activeMetric.fn || 0
    } : { tp: 0, tn: 0, fp: 0, fn: 0 };
    const displayRound = activeMetric ? activeMetric.round : (metrics.length > 0 ? metrics[metrics.length - 1].round : 0);

    return (
        <div id="fl-model" className="dashboard-main">
            {/* Enhanced Header */}
            <header className="enhanced-header">
                <div className="header-title-section">
                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <h1 className="header-title" style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '2px', cursor: 'pointer' }}>
                            ARGUS<span style={{ color: '#FFD700' }}>FL</span>
                        </h1>
                    </Link>
                </div>
                <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                    {/* Brand Cluster */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Logo is already in header-title-section, no additional items in brand cluster */}
                    </div>

                    {/* Action Cluster */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* View Mode Toggle */}
                        <div className="view-mode-toggle" style={{
                            display: 'flex',
                            background: 'rgba(0,0,0,0.4)',
                            borderRadius: '8px',
                            padding: '4px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <button
                                onClick={() => setViewMode('process')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: viewMode === 'process' ? 'rgba(220, 20, 60, 0.15)' : 'transparent',
                                    color: viewMode === 'process' ? '#DC143C' : '#64748b',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontWeight: 600,
                                    fontSize: '0.8rem'
                                }}
                            >
                                <Activity size={16} /> Visualization
                            </button>
                            <button
                                onClick={() => setViewMode('metrics')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: viewMode === 'metrics' ? 'rgba(220, 20, 60, 0.15)' : 'transparent',
                                    color: viewMode === 'metrics' ? '#DC143C' : '#64748b',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontWeight: 600,
                                    fontSize: '0.8rem'
                                }}
                            >
                                <BarChart size={16} /> Metrics
                            </button>
                        </div>
                        <Link to="/sentry" className="header-btn" style={{ textDecoration: 'none', borderColor: 'rgba(255, 215, 0, 0.5)', color: '#FFD700' }}>
                            <Shield size={16} /> Open Sentry IDS
                        </Link>
                        <button className="header-btn" onClick={handleRestart} disabled={!isConnected}>
                            <RotateCcw size={16} /> Restart
                        </button>
                    </div>

                    {/* Status Cluster */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                            <span className="stat-label-dash">ADMIN CONTROL</span>
                            <span className={`stat-value-dash ${isConnected ? 'connected' : 'disconnected'}`}>
                                {isConnected ? 'Secure Connection 🔒' : 'Disconnected ❌'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Grid */}
            <motion.div
                ref={gridRef}
                initial="hidden"
                animate={isGridInView ? "visible" : "hidden"}
                variants={staggerContainer}
                className="dashboard-grid-new"
            >
                {/* Control Panel */}
                <motion.div variants={scaleIn} className="control-card">
                    <h3 className="card-title-dash">FL Demo Control</h3>
                    <p className="card-desc">Visualize the training process (Runs 50 rounds, saves to demo_model.keras).</p>

                    <div className="power-button-container">
                        <button
                            className={`power-button ${isRunning ? 'running' : ''}`}
                            onClick={handleStart}
                            style={{
                                borderColor: isRunning ? 'var(--accent-red)' : 'var(--accent-gold)',
                                color: isRunning ? 'var(--accent-red)' : 'var(--accent-gold)'
                            }}
                        >
                            {isRunning ? <Square size={32} strokeWidth={2} /> : <Rocket size={32} strokeWidth={1.5} />}
                            <span>{isRunning ? 'STOP' : 'START'}</span>
                        </button>
                    </div>

                    <div className="training-status">
                        <span className={`status-text ${isRunning ? 'active' : ''}`}>
                            {isRunning ? `TRAINING ROUND ${currentRound} EXECUTING` : 'SYSTEM READY'}
                        </span>
                    </div>

                    {/* FL Report Buttons */}
                    <div className="fl-report-actions" style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                            onClick={handleDownloadFLReport}
                            disabled={metrics.length === 0}
                            className="rapid-btn"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                opacity: metrics.length === 0 ? 0.5 : 1,
                                cursor: metrics.length === 0 ? 'not-allowed' : 'pointer'
                            }}
                            title="Download FL Training Report"
                        >
                            <Download size={14} /> Export PDF
                        </button>
                        <button
                            onClick={handleEmailFLReport}
                            disabled={metrics.length === 0}
                            className="rapid-btn"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                borderColor: 'rgba(220, 20, 60, 0.3)',
                                color: '#DC143C',
                                opacity: metrics.length === 0 ? 0.5 : 1,
                                cursor: metrics.length === 0 ? 'not-allowed' : 'pointer'
                            }}
                            title="Email FL Report to Me"
                        >
                            <Mail size={14} /> Email Me
                        </button>
                    </div>
                </motion.div>

                <AnimatePresence mode="wait">
                    {viewMode === 'process' && (
                        <>
                            <motion.div
                                key="process-view"
                                style={{ gridArea: 'main', height: '100%' }}
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                            >
                                <FLProcessVisualization
                                    isTraining={isRunning}
                                    currentRound={currentRound}
                                    nodes={nodes}
                                    onActiveStepChange={setActiveStep}
                                />
                            </motion.div>
                            <motion.div
                                key="overview-view"
                                style={{ gridArea: 'overview' }}
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
                            >
                                <FLStepsOverview
                                    isTraining={isRunning}
                                    activeStep={activeStep}
                                />
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Performance Metrics View - shown when viewMode is 'metrics' */}
                <AnimatePresence mode="wait">
                    {viewMode === 'metrics' && (
                        <motion.div
                            key="metrics-view"
                            style={{
                                gridArea: 'main',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gridTemplateRows: 'auto auto',
                                gap: '3px'
                            }}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        >
                            {nodes.map((node) => {
                                const IconComponent = node.icon;
                                return (
                                    <div
                                        key={node.id}
                                        className={`node-card-new ${isRunning ? 'active' : ''}`}
                                        style={{ minHeight: '120px', padding: '12px' }}
                                    >
                                        <IconComponent size={24} className="node-icon" />

                                        <span className={`node-badge-new ${isRunning ? 'training' : ''}`}>
                                            {isRunning ? 'TRAINING' : 'IDLE'}
                                        </span>

                                        <div className="node-info-new">
                                            <h4>{node.name}</h4>
                                            <p className="node-ip">
                                                IP: {node.ip === 'Awaiting...' ? (
                                                    <span className="shimmer-text">{node.ip}</span>
                                                ) : (
                                                    node.ip
                                                )}
                                            </p>
                                        </div>
                                        <div className="packet-loss-new">
                                            <div className="packet-loss-header">
                                                <span>Packet Loss</span>
                                                <span>{(node.packetLoss * 100).toFixed(2)}%</span>
                                            </div>
                                            <div className={`packet-loss-bar-container`}>
                                                <div
                                                    className={`packet-loss-bar-fill`}
                                                    style={{ width: `${Math.min(node.packetLoss * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Performance Chart */}
                            <div
                                className="performance-card"
                                style={{ gridColumn: '1 / -1' }}
                            >
                                <div className="performance-header">
                                    <div>
                                        <h3 className="card-title-dash">Model Convergence History</h3>
                                        <p className="card-desc">Real-time accuracy & security metrics (Hover chart for history).</p>
                                    </div>
                                    <div className="accuracy-display">
                                        <span className="accuracy-label">
                                            {hoveredMetric ? `ROUND ${displayRound} F1-SCORE` : 'CURRENT F1-SCORE'}
                                        </span>
                                        <span className="accuracy-value" style={{ color: parseFloat(displayF1) > 80 ? '#4ade80' : parseFloat(displayF1) > 50 ? '#DC143C' : '#DC143C' }}>
                                            {displayF1}%
                                        </span>
                                    </div>
                                </div>

                                {/* Chart + Confusion Matrix */}
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
                                    {/* Combo Chart: Convergence + Delta */}
                                    <div className="chart-container" style={{ flex: 2 }}>
                                        {metrics.length === 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '380px', gap: '20px', padding: '40px' }}>
                                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '10px', textAlign: 'center', letterSpacing: '0.5px' }}>
                                                    Click <span style={{ color: '#FFD700', fontWeight: 600 }}>START</span> to begin FL Demo and view performance metrics
                                                </p>
                                                <Skeleton width="60%" height="30px" />
                                                <Skeleton width="80%" height="30px" />
                                                <Skeleton width="40%" height="30px" />
                                            </div>
                                        ) : (
                                            <>
                                                {/* Primary: Convergence Line Chart */}
                                                <ResponsiveContainer width="100%" height={260}>
                                                    <LineChart
                                                        data={metrics.map((m) => ({ ...m, f1: m.f1_score * 100, acc: m.accuracy * 100 }))}
                                                        onMouseMove={(state) => {
                                                            if (state.activePayload) {
                                                                setHoveredMetric(state.activePayload[0].payload);
                                                            }
                                                        }}
                                                        onMouseLeave={() => setHoveredMetric(null)}
                                                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(220,20,60,0.08)" />
                                                        <XAxis
                                                            dataKey="round"
                                                            stroke="#6b7280"
                                                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                                                            axisLine={{ stroke: 'rgba(220,20,60,0.15)' }}
                                                        />
                                                        <YAxis
                                                            domain={[0, 100]}
                                                            stroke="#6b7280"
                                                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                                                            axisLine={{ stroke: 'rgba(220,20,60,0.15)' }}
                                                            label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
                                                            tickFormatter={(v) => `${v}%`}
                                                        />
                                                        <Tooltip
                                                            contentStyle={{
                                                                background: 'rgba(10, 11, 16, 0.95)',
                                                                border: '1px solid rgba(220, 20, 60, 0.4)',
                                                                borderRadius: '10px',
                                                                color: '#fff',
                                                                boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
                                                            }}
                                                            formatter={(value, name) => {
                                                                if (name === 'f1') return [`${value.toFixed(1)}%`, 'F1-Score'];
                                                                if (name === 'acc') return [`${value.toFixed(1)}%`, 'Accuracy'];
                                                                return [value, name];
                                                            }}
                                                            labelFormatter={(label) => `Round ${label}`}
                                                        />
                                                        <Legend
                                                            verticalAlign="top"
                                                            height={28}
                                                            formatter={(value) => {
                                                                if (value === 'f1') return 'F1-Score';
                                                                if (value === 'acc') return 'Accuracy';
                                                                return value;
                                                            }}
                                                            wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }}
                                                        />
                                                        <Line
                                                            type="natural"
                                                            dataKey="f1"
                                                            stroke="#DC143C"
                                                            strokeWidth={3}
                                                            dot={{ r: 4, fill: '#DC143C', stroke: '#1a1a2e', strokeWidth: 2 }}
                                                            activeDot={{ r: 7, fill: '#DC143C', stroke: '#fff', strokeWidth: 2 }}
                                                        />
                                                        <Line
                                                            type="linear"
                                                            dataKey="acc"
                                                            stroke="#38bdf8"
                                                            strokeWidth={1.5}
                                                            strokeDasharray="8 4"
                                                            dot={false}
                                                            activeDot={{ r: 4, fill: '#38bdf8' }}
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>

                                                {/* Secondary: Delta Bar Chart */}
                                                <div className="delta-chart-section">
                                                    <span className="delta-chart-label">Accuracy – F1 Gap (magnified)</span>
                                                    <ResponsiveContainer width="100%" height={110}>
                                                        <RechartsBarChart
                                                            data={metrics.map((m) => ({
                                                                round: m.round,
                                                                delta: Math.abs((m.accuracy - m.f1_score) * 100)
                                                            }))}
                                                            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,215,0,0.06)" />
                                                            <XAxis
                                                                dataKey="round"
                                                                stroke="#6b7280"
                                                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                                axisLine={{ stroke: 'rgba(255,215,0,0.15)' }}
                                                                label={{ value: 'Round', position: 'bottom', fill: '#94a3b8', fontSize: 11, offset: -5 }}
                                                            />
                                                            <YAxis
                                                                stroke="#6b7280"
                                                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                                axisLine={{ stroke: 'rgba(255,215,0,0.15)' }}
                                                                label={{ value: 'Δ (pp)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                                                                tickFormatter={(v) => `${v.toFixed(1)}`}
                                                            />
                                                            <Tooltip
                                                                contentStyle={{
                                                                    background: 'rgba(10, 11, 16, 0.95)',
                                                                    border: '1px solid rgba(255, 215, 0, 0.4)',
                                                                    borderRadius: '10px',
                                                                    color: '#fff',
                                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                                                                }}
                                                                formatter={(value) => [`${value.toFixed(2)} pp`, '|Acc − F1| Gap']}
                                                                labelFormatter={(label) => `Round ${label}`}
                                                            />
                                                            <ReferenceLine y={0} stroke="rgba(255,215,0,0.2)" />
                                                            <Bar
                                                                dataKey="delta"
                                                                fill="rgba(255, 215, 0, 0.6)"
                                                                radius={[3, 3, 0, 0]}
                                                                maxBarSize={20}
                                                            />
                                                        </RechartsBarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Enhanced Confusion Matrix */}
                                    <div className="confusion-matrix-enhanced" style={{ flex: 1 }}>
                                        <h4 className="matrix-title">
                                            {hoveredMetric ? `Confusion Matrix (Round ${displayRound})` : 'Confusion Matrix (Latest)'}
                                        </h4>

                                        <div className="matrix-grid">
                                            <div></div>
                                            <div className="matrix-label">Pred. Normal</div>
                                            <div className="matrix-label">Pred. Attack</div>

                                            <div className="matrix-label vertical">Normal Traffic</div>
                                            <div className="matrix-cell positive">
                                                <AnimatePresence mode="wait">
                                                    <motion.div
                                                        key={`tn-${displayConfusion.tn}-${displayRound}`}
                                                        className="matrix-cell-value"
                                                        initial={{ scale: 1.3, opacity: 0.5 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                                    >
                                                        {displayConfusion.tn}
                                                    </motion.div>
                                                </AnimatePresence>
                                                <div className="matrix-cell-label">TN</div>
                                            </div>
                                            <div className="matrix-cell negative">
                                                <AnimatePresence mode="wait">
                                                    <motion.div
                                                        key={`fp-${displayConfusion.fp}-${displayRound}`}
                                                        className="matrix-cell-value"
                                                        initial={{ scale: 1.3, opacity: 0.5 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                                    >
                                                        {displayConfusion.fp}
                                                    </motion.div>
                                                </AnimatePresence>
                                                <div className="matrix-cell-label">FP</div>
                                            </div>

                                            <div className="matrix-label vertical">Real Attacks</div>
                                            <div className="matrix-cell negative">
                                                <AnimatePresence mode="wait">
                                                    <motion.div
                                                        key={`fn-${displayConfusion.fn}-${displayRound}`}
                                                        className="matrix-cell-value"
                                                        initial={{ scale: 1.3, opacity: 0.5 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                                    >
                                                        {displayConfusion.fn}
                                                    </motion.div>
                                                </AnimatePresence>
                                                <div className="matrix-cell-label">FN</div>
                                            </div>
                                            <div className="matrix-cell positive">
                                                <AnimatePresence mode="wait">
                                                    <motion.div
                                                        key={`tp-${displayConfusion.tp}-${displayRound}`}
                                                        className="matrix-cell-value"
                                                        initial={{ scale: 1.3, opacity: 0.5 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                                    >
                                                        {displayConfusion.tp}
                                                    </motion.div>
                                                </AnimatePresence>
                                                <div className="matrix-cell-label">TP</div>
                                            </div>
                                        </div>

                                        <div className="metrics-summary">
                                            <div className="metric-item">
                                                <AnimatePresence mode="wait">
                                                    <motion.div
                                                        key={`prec-${displayPrecision}-${displayRound}`}
                                                        className="metric-value"
                                                        initial={{ opacity: 0.5, y: -4 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        {displayPrecision}%
                                                    </motion.div>
                                                </AnimatePresence>
                                                <div className="metric-label">Precision</div>
                                            </div>
                                            <div className="metric-item">
                                                <AnimatePresence mode="wait">
                                                    <motion.div
                                                        key={`rec-${displayRecall}-${displayRound}`}
                                                        className="metric-value"
                                                        initial={{ opacity: 0.5, y: -4 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        {displayRecall}%
                                                    </motion.div>
                                                </AnimatePresence>
                                                <div className="metric-label">Recall</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </motion.div>

            {/* Restart Confirmation Toast */}
            <AnimatePresence>
                {showRestartConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999,
                        }}
                        onClick={() => setShowRestartConfirm(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'rgba(17, 24, 39, 0.95)',
                                border: '1px solid rgba(220, 20, 60, 0.3)',
                                borderRadius: '16px',
                                padding: '28px 32px',
                                maxWidth: '400px',
                                width: '90%',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 40px rgba(220, 20, 60, 0.1)',
                                backdropFilter: 'blur(20px)',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'rgba(220, 20, 60, 0.15)',
                                border: '1px solid rgba(220, 20, 60, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                            }}>
                                <RotateCcw size={22} color="#DC143C" />
                            </div>
                            <h3 style={{
                                color: '#fff',
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                marginBottom: '8px',
                                letterSpacing: '0.5px',
                            }}>Confirm System Restart</h3>
                            <p style={{
                                color: '#94a3b8',
                                fontSize: '0.85rem',
                                marginBottom: '24px',
                                lineHeight: 1.5,
                            }}>This will terminate all running processes, reset training progress, and restart the system.</p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setShowRestartConfirm(false)}
                                    style={{
                                        padding: '10px 24px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        color: '#94a3b8',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        letterSpacing: '1px',
                                        textTransform: 'uppercase',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = '#fff'; }}
                                    onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = '#94a3b8'; }}
                                >Cancel</button>
                                <button
                                    onClick={confirmRestart}
                                    style={{
                                        padding: '10px 24px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: '#DC143C',
                                        color: '#fff',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        letterSpacing: '1px',
                                        textTransform: 'uppercase',
                                        boxShadow: '0 0 20px rgba(220, 20, 60, 0.3)',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => { e.target.style.background = '#B22222'; e.target.style.boxShadow = '0 0 30px rgba(220,20,60,0.5)'; }}
                                    onMouseLeave={(e) => { e.target.style.background = '#DC143C'; e.target.style.boxShadow = '0 0 20px rgba(220,20,60,0.3)'; }}
                                >Restart</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DashboardSection;
