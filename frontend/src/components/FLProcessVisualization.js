import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Monitor, Smartphone, Tablet, Server, Database, Brain,
    ArrowRight, Layers, Shield
} from 'lucide-react';
import './FLProcessVisualization.css';

const FLProcessVisualization = ({ isTraining, currentRound, totalRounds = 50, nodes, onActiveStepChange }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [showWeightFlow, setShowWeightFlow] = useState(false);

    // Animate through FL steps during training
    useEffect(() => {
        if (!isTraining) {
            setActiveStep(0);
            setShowWeightFlow(false);
            return;
        }

        // Cycle through FL steps during training
        const stepInterval = setInterval(() => {
            setActiveStep(prev => (prev + 1) % 4);
        }, 2000);

        // Show weight flow animation
        setShowWeightFlow(true);

        return () => clearInterval(stepInterval);
    }, [isTraining]);

    // Report activeStep changes to parent
    useEffect(() => {
        if (onActiveStepChange) {
            onActiveStepChange(activeStep);
        }
    }, [activeStep, onActiveStepChange]);



    const nodeIcons = [Monitor, Smartphone, Tablet];

    return (
        <div className="fl-process-container">
            {/* Header */}
            <div className="fl-process-header">
                <div className="fl-process-title">
                    <Brain className="fl-brain-icon" size={24} />
                    <h3>How FL Creates the Global Model</h3>
                </div>
                <div className="fl-round-indicator">
                    <span className="round-label">ROUND</span>
                    <span className="round-value">{currentRound}/{totalRounds}</span>
                </div>
            </div>

            {/* Main Visualization - HORIZONTAL LAYOUT */}
            <div className="fl-visualization-horizontal">
                {/* Nodes Column */}
                <div className="fl-nodes-column">
                    {nodes.map((node, index) => {
                        const NodeIcon = nodeIcons[index] || Monitor;
                        return (
                            <motion.div
                                key={node.id}
                                className={`fl-node-box ${isTraining && activeStep === 0 ? 'training' : ''}`}
                                animate={{
                                    boxShadow: isTraining && activeStep === 0
                                        ? ['0 0 20px rgba(74, 222, 128, 0.3)', '0 0 40px rgba(74, 222, 128, 0.6)', '0 0 20px rgba(74, 222, 128, 0.3)']
                                        : '0 0 10px rgba(220, 20, 60, 0.1)'
                                }}
                                transition={{ duration: 1, repeat: isTraining && activeStep === 0 ? Infinity : 0 }}
                            >
                                <NodeIcon size={24} className="fl-node-icon" />
                                <span className="fl-node-label">Node {node.id}</span>
                                <div className="fl-node-data">
                                    <Database size={10} />
                                    <span>Local Data</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Connection Arrow 1: Nodes to Server */}
                <div className="fl-horizontal-connection">
                    <svg className="fl-horizontal-svg" viewBox="0 0 120 200" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <linearGradient id="hWeightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#FFD700" />
                                <stop offset="100%" stopColor="#FFD700" />
                            </linearGradient>
                        </defs>
                        {/* Lines from nodes to center */}
                        <path d="M 10 33 L 110 100" className="fl-connection-path" stroke="rgba(255, 215, 0, 0.6)" />
                        <path d="M 10 100 L 110 100" className="fl-connection-path" stroke="rgba(255, 215, 0, 0.6)" />
                        <path d="M 10 167 L 110 100" className="fl-connection-path" stroke="rgba(255, 215, 0, 0.6)" />

                        {/* Weight labels */}
                        <text x="30" y="55" className="fl-weight-label">W₁</text>
                        <text x="50" y="95" className="fl-weight-label">W₂</text>
                        <text x="30" y="145" className="fl-weight-label">W₃</text>

                        {/* Animated Weight Particles */}
                        <AnimatePresence>
                            {showWeightFlow && activeStep === 1 && (
                                <>
                                    <motion.circle
                                        r="5"
                                        fill="url(#hWeightGradient)"
                                        initial={{ offsetDistance: '0%' }}
                                        animate={{ offsetDistance: '100%' }}
                                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                                        style={{ offsetPath: 'path("M 10 33 L 110 100")' }}
                                    />
                                    <motion.circle
                                        r="5"
                                        fill="url(#hWeightGradient)"
                                        initial={{ offsetDistance: '0%' }}
                                        animate={{ offsetDistance: '100%' }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear', delay: 0.2 }}
                                        style={{ offsetPath: 'path("M 10 100 L 110 100")' }}
                                    />
                                    <motion.circle
                                        r="5"
                                        fill="url(#hWeightGradient)"
                                        initial={{ offsetDistance: '0%' }}
                                        animate={{ offsetDistance: '100%' }}
                                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear', delay: 0.4 }}
                                        style={{ offsetPath: 'path("M 10 167 L 110 100")' }}
                                    />
                                </>
                            )}
                        </AnimatePresence>
                    </svg>
                </div>

                {/* Central Server */}
                <motion.div
                    className={`fl-server-box-horizontal ${isTraining && activeStep === 2 ? 'aggregating' : ''}`}
                    animate={{
                        boxShadow: isTraining && activeStep === 2
                            ? ['0 0 30px rgba(96, 165, 250, 0.4)', '0 0 60px rgba(96, 165, 250, 0.8)', '0 0 30px rgba(96, 165, 250, 0.4)']
                            : '0 0 20px rgba(220, 20, 60, 0.2)'
                    }}
                    transition={{ duration: 0.8, repeat: isTraining && activeStep === 2 ? Infinity : 0 }}
                >
                    <Server size={32} className="fl-server-icon" />
                    <span className="fl-server-label">ARGUS Server</span>
                    <div className="fl-aggregation-formula">
                        <Layers size={14} />
                        <span>FedAvg: W = Σ(nᵢ×Wᵢ)/N</span>
                    </div>
                </motion.div>

                {/* Connection Arrow 2: Server to Global Model */}
                <div className="fl-horizontal-arrow">
                    <ArrowRight size={32} className={`fl-arrow-icon ${isTraining && activeStep === 3 ? 'pulse' : ''}`}
                        style={{ color: '#c084fc' }} />
                </div>

                {/* Global Model Box */}
                <motion.div
                    className="fl-global-model-box-horizontal"
                    animate={{
                        scale: currentRound > 0 ? [1, 1.02, 1] : 1,
                        boxShadow: currentRound > 0
                            ? '0 0 30px rgba(220, 20, 60, 0.4)'
                            : '0 0 10px rgba(220, 20, 60, 0.1)'
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <Shield size={28} className="fl-model-icon" />
                    <span className="fl-model-label">Global Model</span>
                    <span className="fl-model-filename">demo_model.keras</span>
                </motion.div>
            </div>

        </div>
    );
};

export default FLProcessVisualization;
