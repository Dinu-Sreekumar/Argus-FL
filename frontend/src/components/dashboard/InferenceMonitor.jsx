import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Download, Mail, Shield, Cpu, HardDrive, Upload, Download as DownloadIcon, Zap, AlertTriangle, Wifi, Radio, Clock, Trash2, Brain, Bell, BellOff } from 'lucide-react';
import '../StitchEnhancements.css';

// Binary intrusion detection — simplified from multi-class
const getAttackInfo = () => {
    return {
        name: 'INTRUSION DETECTED',
        description: 'Malicious network activity detected by FL Model',
        icon: AlertTriangle,
        severity: 'CRITICAL',
        severityColor: '#DC143C'
    };
};


const SENTRY_TIMEOUT_MS = 5000; // Mark offline if no stats for 5 seconds

const InferenceMonitor = () => {
    const [stats, setStats] = useState({ cpu: 0, ram: 0, bytes_sent: 0, bytes_recv: 0 });
    const [intrusionAlert, setIntrusionAlert] = useState(null);
    const [status, setStatus] = useState('OFFLINE');
    const [detectionDelay, setDetectionDelay] = useState(null);
    const [attackHistory, setAttackHistory] = useState([]); // Attack history log
    const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
    const lastAlertTimestamp = useRef(null);
    const lastStatsTime = useRef(0); // Track last system_stats received

    // Fetch initial email alert preference
    useEffect(() => {
        const fetchEmailPref = async () => {
            try {
                const res = await fetch('http://localhost:5001/api/get_email_alert_status', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setEmailAlertsEnabled(data.enabled);
                }
            } catch (err) {
                console.warn("Failed to fetch email preference:", err);
            }
        };
        fetchEmailPref();
    }, []);

    const handleToggleEmailAlerts = async () => {
        try {
            const res = await fetch('http://localhost:5001/api/toggle_email_alerts', {
                method: 'POST',
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setEmailAlertsEnabled(data.enabled);
            } else {
                console.error("Failed to toggle alerts, maybe not logged in.");
                alert("Please log in to change alert settings.");
            }
        } catch (err) {
            console.error("Toggle request failed:", err);
        }
    };

    useEffect(() => {
        const socket = io('http://localhost:5001');

        socket.on('connect', () => {
            console.log("Connected to Monitor Stream");
        });

        socket.on('sentry_status', (data) => {
            setStatus(data.status.toUpperCase());
            lastStatsTime.current = Date.now();
        });

        socket.on('system_stats', (data) => {
            setStats(data);
            setStatus('ACTIVE MONITORING');
            lastStatsTime.current = Date.now();
        });

        // Check for timeout every second - mark offline if no stats received
        const timeoutChecker = setInterval(() => {
            const timeSinceLastStats = Date.now() - lastStatsTime.current;
            if (lastStatsTime.current > 0 && timeSinceLastStats > SENTRY_TIMEOUT_MS) {
                setStatus('OFFLINE');
            }
        }, 1000);

        socket.on('intrusion_alert', (data) => {
            // === SUPPRESSED IP ADDRESSES ===
            const suppressedIPs = [
                '2409:40f3:12:4ccc:25fe:e9bc:902c:47a2'
            ];

            // Skip alerts from suppressed IPs
            if (suppressedIPs.includes(data.attacker_ip)) {
                console.log(`[Sentry] Alert suppressed from IP: ${data.attacker_ip}`);
                return;
            }

            // === DETECTION DELAY TRACKING ===
            const receiveTime = Date.now();
            const eventTime = data.timestamp ? data.timestamp * 1000 : receiveTime; // Backend sends Unix timestamp
            const delay = Math.round(receiveTime - eventTime);

            // Only update if this is a new alert (not a duplicate)
            if (!lastAlertTimestamp.current || eventTime !== lastAlertTimestamp.current) {
                setDetectionDelay(delay > 0 ? delay : 1); // Minimum 1ms
                lastAlertTimestamp.current = eventTime;
            }

            setIntrusionAlert(data);

            // Add to attack history log
            const attackInfo = getAttackInfo(data.payload);
            setAttackHistory(prev => [
                {
                    id: Date.now(),
                    timestamp: new Date(),
                    attackerIp: data.attacker_ip,
                    type: attackInfo.name,
                    severity: attackInfo.severity,
                    severityColor: attackInfo.severityColor,
                    detectionMs: delay > 0 ? delay : 1
                },
                ...prev.slice(0, 49) // Keep last 50
            ]);

            // Auto clear alert after 10 seconds for UX
            setTimeout(() => setIntrusionAlert(null), 10000);
        });



        return () => {
            socket.disconnect();
            clearInterval(timeoutChecker);
        };
    }, []);

    const handleDownloadReport = async () => {
        try {
            window.open('http://localhost:5001/api/report/download', '_blank');
        } catch (error) {
            console.error("Download failed:", error);
        }
    };

    const handleEmailReport = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/report/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                if (response.ok) {
                    setIntrusionAlert(null); // Clear any existing alerts
                    alert(data.message || 'Email sent successfully!');
                } else {
                    alert(`Error: ${data.error || 'Server rejected request'}`);
                }
            } else {
                const text = await response.text();
                console.error("Non-JSON response:", text);
                alert(`Server Error (${response.status}): ${response.statusText}`);
            }
        } catch (error) {
            console.error("Email failed:", error);
            alert(`Network or Logic Fail: ${error.message}`);
        }
    };

    return (
        <div className="stitch-card" style={{
            background: intrusionAlert
                ? 'rgba(220, 20, 60, 0.15)'
                : undefined,
            borderColor: intrusionAlert ? 'rgba(220, 20, 60, 0.4)' : undefined,
            animation: intrusionAlert ? 'mild-pulse 2.5s infinite ease-in-out' : undefined
        }}>
            {/* Header */}
            <div className="stitch-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        padding: '10px',
                        background: 'rgba(220, 20, 60, 0.1)',
                        borderRadius: '12px',
                        border: '1px solid rgba(220, 20, 60, 0.2)'
                    }}>
                        <Shield size={22} style={{ color: '#DC143C' }} />
                    </div>
                    <div>
                        <h3 className="stitch-card-title">Network Sentry</h3>
                        <span style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: status === 'ACTIVE MONITORING' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                            border: status === 'ACTIVE MONITORING' ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)',
                            color: status === 'ACTIVE MONITORING' ? '#4ade80' : '#64748b'
                        }}>
                            {status}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleToggleEmailAlerts}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            border: `1px solid ${emailAlertsEnabled ? 'rgba(74, 222, 128, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
                            background: emailAlertsEnabled ? 'rgba(74, 222, 128, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                            color: emailAlertsEnabled ? '#4ade80' : '#64748b',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        title={emailAlertsEnabled ? "Disable Auto-Email Alerts" : "Enable Auto-Email Alerts"}
                    >
                        {emailAlertsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                        {emailAlertsEnabled ? 'Auto-Alerts ON' : 'Auto-Alerts OFF'}
                    </button>
                    <button
                        onClick={handleDownloadReport}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            border: '1px solid rgba(220, 20, 60, 0.2)',
                            background: 'rgba(220, 20, 60, 0.05)',
                            color: '#DC143C',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        title="Download Security PDF"
                    >
                        <Download size={14} /> Export PDF
                    </button>
                    <button
                        onClick={handleEmailReport}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            border: '1px solid rgba(220, 20, 60, 0.2)',
                            background: 'rgba(220, 20, 60, 0.05)',
                            color: '#DC143C',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        title="Email Report to Me"
                    >
                        <Mail size={14} /> Email Me
                    </button>
                </div>
            </div>

            {/* ENHANCED ALERT BANNER */}
            {intrusionAlert && (() => {
                const attackInfo = getAttackInfo(intrusionAlert.payload);
                const AttackIcon = attackInfo.icon;

                return (
                    <div className="alert-banner-enhanced">
                        {/* Attack Type Header */}
                        <div className="alert-header">
                            <div className="alert-icon">
                                <AttackIcon size={28} style={{ color: '#fff', animation: 'pulse 1s infinite' }} />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <h2 className="alert-title">
                                    {attackInfo.name}
                                </h2>
                                <p className="alert-description">{attackInfo.description}</p>
                            </div>
                            <div className="alert-icon">
                                <AttackIcon size={28} style={{ color: '#fff', animation: 'pulse 1s infinite' }} />
                            </div>
                        </div>

                        {/* Severity Badge */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                            <span className="alert-severity-badge" style={{ color: attackInfo.severityColor, borderColor: attackInfo.severityColor }}>
                                ⚠️ SEVERITY: {attackInfo.severity}
                            </span>
                        </div>

                        {/* Attacker Info */}
                        <div style={{ textAlign: 'center' }}>
                            <p className="alert-attacker-ip">
                                ATTACKER IP: {intrusionAlert.attacker_ip}
                            </p>
                            {detectionDelay && (
                                <p className="alert-detection-time">
                                    Detection Time: <span>{detectionDelay}ms</span>
                                </p>
                            )}
                        </div>

                        {/* Action Badges */}
                        <div className="alert-actions">
                            <div className="alert-action-badge">
                                ACTION: PACKET BLOCKED & ADMIN ALERTED
                            </div>
                            {intrusionAlert.payload?.detected_by && (
                                <div className="alert-action-badge ml">
                                    <Brain size={14} />
                                    {intrusionAlert.payload.detected_by}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}



            {/* ENHANCED SYSTEM STATS GRID */}
            <div className="stats-grid-enhanced">
                {/* CPU */}
                <div className="stat-card-enhanced" style={{ '--stat-border': 'rgba(220, 20, 60, 0.2)', '--stat-hover-border': 'rgba(220, 20, 60, 0.4)' }}>
                    <div className="stat-header">
                        <Cpu size={14} className="stat-icon" style={{ color: '#DC143C' }} />
                        <span className="stat-label">Core Load</span>
                    </div>
                    <div className="stat-value-enhanced" style={{ color: '#DC143C' }}>
                        {stats.cpu}<span className="stat-unit">%</span>
                    </div>
                    <div className="stat-bar">
                        <div className="stat-bar-fill" style={{ width: `${stats.cpu}%`, background: 'linear-gradient(90deg, #DC143C, #b91c3a)', boxShadow: '0 0 10px rgba(220, 20, 60, 0.5)' }}></div>
                    </div>
                </div>

                {/* RAM */}
                <div className="stat-card-enhanced" style={{ '--stat-border': 'rgba(255, 215, 0, 0.2)', '--stat-hover-border': 'rgba(255, 215, 0, 0.4)' }}>
                    <div className="stat-header">
                        <HardDrive size={14} className="stat-icon" style={{ color: '#FFD700' }} />
                        <span className="stat-label">Memory</span>
                    </div>
                    <div className="stat-value-enhanced" style={{ color: '#FFD700' }}>
                        {stats.ram}<span className="stat-unit">%</span>
                    </div>
                    <div className="stat-bar">
                        <div className="stat-bar-fill" style={{ width: `${stats.ram}%`, background: 'linear-gradient(90deg, #FFD700, #d4a800)', boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}></div>
                    </div>
                </div>

                {/* Network Out */}
                <div className="stat-card-enhanced" style={{ '--stat-border': 'rgba(74, 222, 128, 0.2)', '--stat-hover-border': 'rgba(74, 222, 128, 0.4)' }}>
                    <div className="stat-header">
                        <Upload size={14} className="stat-icon" style={{ color: '#4ade80' }} />
                        <span className="stat-label">Network Out</span>
                    </div>
                    <div className="stat-value-enhanced" style={{ color: '#4ade80' }}>
                        {(stats.bytes_sent / 1024 / 1024).toFixed(2)}<span className="stat-unit">MB</span>
                    </div>
                </div>

                {/* Network In */}
                <div className="stat-card-enhanced" style={{ '--stat-border': 'rgba(220, 20, 60, 0.2)', '--stat-hover-border': 'rgba(220, 20, 60, 0.4)' }}>
                    <div className="stat-header">
                        <DownloadIcon size={14} className="stat-icon" style={{ color: '#DC143C' }} />
                        <span className="stat-label">Network In</span>
                    </div>
                    <div className="stat-value-enhanced" style={{ color: '#DC143C' }}>
                        {(stats.bytes_recv / 1024 / 1024).toFixed(2)}<span className="stat-unit">MB</span>
                    </div>
                </div>

                {/* Detection Speed */}
                <div className="stat-card-enhanced" style={{
                    '--stat-border': detectionDelay !== null
                        ? detectionDelay < 100 ? 'rgba(74, 222, 128, 0.4)' : detectionDelay < 500 ? 'rgba(220, 20, 60, 0.4)' : 'rgba(220, 20, 60, 0.4)'
                        : 'rgba(100, 116, 139, 0.2)',
                    '--stat-hover-border': detectionDelay !== null
                        ? detectionDelay < 100 ? 'rgba(74, 222, 128, 0.6)' : detectionDelay < 500 ? 'rgba(220, 20, 60, 0.6)' : 'rgba(220, 20, 60, 0.6)'
                        : 'rgba(100, 116, 139, 0.4)'
                }}>
                    <div className="stat-header">
                        <Zap size={14} className="stat-icon" style={{
                            color: detectionDelay !== null
                                ? detectionDelay < 100 ? '#4ade80' : detectionDelay < 500 ? '#DC143C' : '#DC143C'
                                : '#64748b'
                        }} />
                        <span className="stat-label">Detection Speed</span>
                    </div>
                    <div className="stat-value-enhanced" style={{
                        color: detectionDelay !== null
                            ? detectionDelay < 100 ? '#4ade80' : detectionDelay < 500 ? '#DC143C' : '#DC143C'
                            : '#64748b'
                    }}>
                        {detectionDelay !== null ? detectionDelay : '---'}<span className="stat-unit">ms</span>
                    </div>
                    <div className="stat-rating">
                        {detectionDelay !== null
                            ? detectionDelay < 100 ? 'EXCELLENT' : detectionDelay < 500 ? 'GOOD' : 'SLOW'
                            : 'AWAITING DETECTION'}
                    </div>
                </div>
            </div>

            {/* ENHANCED ATTACK HISTORY LOG */}
            <div className="attack-history-enhanced">
                <div className="attack-history-header">
                    <div className="attack-history-title">
                        <Clock size={16} style={{ color: '#DC143C' }} />
                        Attack History
                        <span className="attack-history-count">({attackHistory.length} events)</span>
                    </div>
                    {attackHistory.length > 0 && (
                        <button className="attack-history-clear" onClick={() => setAttackHistory([])}>
                            <Trash2 size={12} /> Clear
                        </button>
                    )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    {attackHistory.length === 0 ? (
                        <div className="attack-history-empty">
                            No attacks detected yet. History will appear here.
                        </div>
                    ) : (
                        <table className="attack-history-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Attacker IP</th>
                                    <th>Severity</th>
                                    <th>Speed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attackHistory.map((attack) => (
                                    <tr key={attack.id}>
                                        <td>{attack.timestamp.toLocaleTimeString()}</td>
                                        <td>{attack.attackerIp}</td>
                                        <td>
                                            <span
                                                className="severity-badge"
                                                style={{
                                                    backgroundColor: `${attack.severityColor}22`,
                                                    color: attack.severityColor
                                                }}
                                            >
                                                {attack.severity}
                                            </span>
                                        </td>
                                        <td>{attack.detectionMs}ms</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div >
    );
};

export default InferenceMonitor;
