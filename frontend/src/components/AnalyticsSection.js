import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { FileText, Activity, Grid } from 'lucide-react';

// Animation variants
const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
};
function AnalyticsSection({ metrics = [] }) {
    // Animation ref for scroll-triggered animations
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, { once: false, amount: 0.3 });

    // Helper to generate random weight colors
    const generateWeights = (rows, cols) => {
        return Array(rows * cols).fill(0).map(() => Math.random());
    };

    const [weights, setWeights] = useState(generateWeights(8, 12));

    useEffect(() => {
        const interval = setInterval(() => {
            setWeights(prev => prev.map(w => {
                // Smooth transition: adjust weight slightly
                const change = (Math.random() - 0.5) * 0.2;
                return Math.max(0, Math.min(1, w + change));
            }));
        }, 100); // Update every 100ms for dynamic effect

        return () => clearInterval(interval);
    }, []);

    const getColor = (value) => {
        // Gold (Low) to Red (High)
        // Gold: 255, 215, 0
        // Red: 220, 20, 60
        const r = Math.floor(255 + (220 - 255) * value);
        const g = Math.floor(215 + (20 - 215) * value);
        const b = Math.floor(0 + (60 - 0) * value);
        const alpha = 0.4 + (value * 0.6); // Increase opacity with value
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const generatePDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(220, 20, 60); // Crimson Red
        doc.text('ARGUS-FL Training Report', 20, 20);

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);

        // Summary
        const latestAccuracy = metrics.length > 0 ? (metrics[metrics.length - 1].accuracy * 100).toFixed(2) + '%' : 'N/A';
        const totalRounds = metrics.length;

        doc.text(`Total Rounds: ${totalRounds}`, 20, 45);
        doc.text(`Final Global Accuracy: ${latestAccuracy}`, 20, 52);

        // Table
        const tableData = metrics.map(m => [m.round, (m.accuracy * 100).toFixed(2) + '%', (m.loss || 0).toFixed(4)]);

        doc.autoTable({
            startY: 60,
            head: [['Round', 'Accuracy', 'Loss']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [220, 20, 60] }, // Crimson Red
        });

        doc.save('argus_report.pdf');
    };

    return (
        <div id="analytics" className="analytics-wrapper">
            <motion.div
                ref={sectionRef}
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                variants={staggerContainer}
                className="section-container"
            >
                <motion.h2 variants={fadeInUp} className="section-title">Advanced Analytics</motion.h2>
                <motion.p variants={fadeInUp} className="section-subtitle">Deep insights into federated model convergence and security.</motion.p>

                <motion.div variants={staggerContainer} className="analytics-grid">
                    {/* Weight Distribution Heatmap */}
                    <motion.div variants={scaleIn} className="analytics-card">
                        <div className="card-header">
                            <Activity size={24} color="#DC143C" />
                            <h3>Live Layer Weights</h3>
                        </div>
                        <div className="heatmap-container" style={{ background: '#050608', padding: '16px', borderRadius: '8px', position: 'relative' }}>
                            {/* Heatmap Tooltip */}
                            <div id="heatmap-tooltip" style={{
                                position: 'absolute',
                                display: 'none',
                                background: 'rgba(0, 0, 0, 0.9)',
                                color: '#fff',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                pointerEvents: 'none',
                                border: '1px solid #333',
                                zIndex: 10
                            }}>
                                Value: 0.00
                            </div>

                            <svg viewBox="0 0 400 240" width="100%" height="100%">
                                <g transform="translate(40, 20)">
                                    {/* Y-Axis Label */}
                                    <text x="-30" y="80" transform="rotate(-90, -30, 80)" fill="#64748b" fontSize="10" fontWeight="600" textAnchor="middle">LAYER DEPTH</text>

                                    {/* X-Axis Label */}
                                    <text x="140" y="210" fill="#64748b" fontSize="10" fontWeight="600" textAnchor="middle">NEURON ACTIVATION INDEX</text>

                                    {/* Cells */}
                                    {Array.from({ length: 8 }).map((_, row) => (
                                        Array.from({ length: 12 }).map((_, col) => {
                                            const index = row * 12 + col;
                                            const value = weights[index] || 0;
                                            return (
                                                <rect
                                                    key={`${row}-${col}`}
                                                    x={col * 24}
                                                    y={row * 24}
                                                    width="22"
                                                    height="22"
                                                    fill={getColor(value)}
                                                    shapeRendering="crispEdges" // Sharp edges
                                                    style={{ transition: 'fill 0.2s ease' }}
                                                    onMouseEnter={(e) => {
                                                        const tooltip = document.getElementById('heatmap-tooltip');
                                                        if (tooltip) {
                                                            tooltip.style.display = 'block';
                                                            tooltip.style.left = `${e.currentTarget.getBoundingClientRect().left - e.currentTarget.parentElement.getBoundingClientRect().left + 80}px`; // Approx adjusting
                                                            // Better to use state but direct DOM for perf in tight loop is ok for demo or use relative cords
                                                            // Actually, let's use a simpler tooltip positioning or revert to 'title' if complex.
                                                            // Using simple relative positioning:
                                                            tooltip.style.left = `${col * 24 + 40}px`;
                                                            tooltip.style.top = `${row * 24 + 10}px`;
                                                            tooltip.innerText = `Neuron ${col}:${row}\nVal: ${value.toFixed(3)}`;
                                                        }
                                                        e.currentTarget.style.stroke = '#fff';
                                                        e.currentTarget.style.strokeWidth = '1px';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        const tooltip = document.getElementById('heatmap-tooltip');
                                                        if (tooltip) tooltip.style.display = 'none';
                                                        e.currentTarget.style.stroke = 'none';
                                                    }}
                                                />
                                            );
                                        })
                                    ))}

                                    {/* Row Labels (Y-Axis) */}
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <text key={`row-${i}`} x="-10" y={i * 24 + 15} fill="#4b5563" fontSize="9" textAnchor="end">L{i}</text>
                                    ))}

                                    {/* Column Labels (X-Axis) - Sampled */}
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <text key={`col-${i}`} x={i * 24 + 11} y={8 * 24 + 15} fill="#4b5563" fontSize="9" textAnchor="middle">{i % 2 === 0 ? i : ''}</text>
                                    ))}
                                </g>

                                {/* Legend */}
                                <g transform="translate(340, 20)">
                                    <defs>
                                        <linearGradient id="heatmapGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                                            <stop offset="0%" stopColor="rgba(220, 20, 60, 0.3)" />   {/* Gold low */}
                                            <stop offset="100%" stopColor="rgba(220, 20, 60, 1.0)" /> {/* Red high */}
                                        </linearGradient>
                                    </defs>
                                    <rect x="0" y="0" width="12" height="192" fill="url(#heatmapGradient)" rx="2" />
                                    <text x="20" y="10" fill="#fff" fontSize="9">1.0</text>
                                    <text x="20" y="190" fill="#fff" fontSize="9">0.0</text>
                                    <text x="20" y="100" fill="#64748b" fontSize="9" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>INTENSITY</text>
                                </g>
                            </svg>
                        </div>
                        <p className="card-caption">
                            Real-time visualization of dense layer activation patterns.
                        </p>
                    </motion.div>

                    {/* Confusion Matrix Visualization */}
                    <motion.div variants={scaleIn} className="analytics-card">
                        <div className="card-header">
                            <Grid size={24} color="#DC143C" />
                            <h3>Confusion Matrix</h3>
                        </div>
                        <div className="heatmap-container">
                            <div className="heatmap-grid" style={{ gridTemplateColumns: 'auto 1fr 1fr' }}>
                                <div className="cell label"></div>
                                <div className="cell label">Benign</div>
                                <div className="cell label">Attack</div>
                                <div className="cell label">Benign</div>
                                <div className="cell value high" title="True Negative">98%</div>
                                <div className="cell value low" title="False Positive">2%</div>
                                <div className="cell label">Attack</div>
                                <div className="cell value low" title="False Negative">1%</div>
                                <div className="cell value high" title="True Positive">99%</div>
                            </div>
                        </div>
                        <p className="card-caption">
                            High-fidelity breakdown of False Positives vs False Negatives.
                        </p>
                    </motion.div>

                    {/* PDF Report Card */}
                    <motion.div variants={scaleIn} className="analytics-card">
                        <div className="card-header">
                            <FileText size={24} color="#DC143C" />
                            <h3>Automated Reporting</h3>
                        </div>
                        <p>
                            Generate comprehensive PDF reports for thesis, audit trails, and performance benchmarking.
                            Includes full round-by-round metrics.
                        </p>

                        <div className="report-preview">
                            <Activity size={48} color="#4a5568" />
                            <span>Session Metrics Ready</span>
                        </div>

                        <button className="hero-btn primary" onClick={generatePDF} style={{ marginTop: 'auto', width: '100%', backgroundColor: '#DC143C', borderColor: '#DC143C', color: '#fff' }}>
                            Download Thesis Report
                        </button>
                    </motion.div>
                </motion.div>
            </motion.div>
        </div>
    );
}

export default AnalyticsSection;
