import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, ArrowRight, GitMerge } from 'lucide-react';
import './FLStepsOverview.css';

const flSteps = [
    {
        id: 1,
        title: 'Local Training',
        description: 'Each node trains on its local CIC-IoT-2023 data partition (3 epochs)',
        icon: Cpu,
        color: '#4ade80'
    },
    {
        id: 2,
        title: 'Weight Upload',
        description: 'Nodes send model weights (not raw data) to central server',
        icon: ArrowRight,
        color: '#DC143C'
    },
    {
        id: 3,
        title: 'FedAvg Aggregation',
        description: 'Server performs weighted averaging: W = Σ(nᵢ×Wᵢ)/N',
        icon: GitMerge,
        color: '#60A5FA'
    },
    {
        id: 4,
        title: 'Global Model Update',
        description: 'Updated global model broadcast to all nodes',
        icon: ArrowRight,
        color: '#c084fc'
    }
];

// Entrance animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.4, ease: 'easeOut' }
    }
};




const techRowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1, y: 0,
        transition: { duration: 0.5, ease: 'easeOut', delay: 0.3 }
    }
};

const FLStepsOverview = ({ isTraining, activeStep }) => {
    return (
        <motion.div
            className="fl-steps-overview-container"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            {/* FL Steps Progress */}
            <div className="fl-steps-row">
                {flSteps.map((step, index) => {
                    const StepIcon = step.icon;
                    const isActive = isTraining && activeStep === index;
                    return (
                        <motion.div
                            key={step.id}
                            className={`fl-step-card ${isActive ? 'active' : ''}`}
                            animate={{
                                borderColor: isActive ? step.color : 'rgba(255, 255, 255, 0.1)',
                                backgroundColor: isActive ? `${step.color}15` : 'rgba(0, 0, 0, 0.3)',
                                boxShadow: isActive
                                    ? `0 0 20px ${step.color}25, 0 4px 15px rgba(0,0,0,0.3)`
                                    : '0 2px 8px rgba(0,0,0,0.2)'
                            }}
                            whileHover={{
                                scale: 1.03,
                                borderColor: step.color,
                                transition: { duration: 0.2 }
                            }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="fl-step-header">
                                <motion.div
                                    className="fl-step-icon-wrapper"
                                    style={{ borderColor: step.color, color: step.color }}
                                    animate={isActive ? {
                                        boxShadow: [`0 0 8px ${step.color}40`, `0 0 16px ${step.color}60`, `0 0 8px ${step.color}40`]
                                    } : {
                                        boxShadow: '0 0 0px transparent'
                                    }}
                                    transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
                                >
                                    <StepIcon size={18} />
                                </motion.div>
                                <span className="fl-step-number">Step {step.id}</span>
                            </div>
                            <h4 className="fl-step-title" style={{ color: isActive ? step.color : '#fff' }}>
                                {step.title}
                            </h4>
                            <p className="fl-step-desc">{step.description}</p>
                        </motion.div>
                    );
                })}
            </div>

            {/* Technical Details Footer */}
            <motion.div className="fl-tech-details" variants={techRowVariants}>
                <div className="fl-tech-item">
                    <span className="fl-tech-label">Dataset</span>
                    <span className="fl-tech-value">CIC-IoT-2023</span>
                </div>
                <div className="fl-tech-item">
                    <span className="fl-tech-label">Architecture</span>
                    <span className="fl-tech-value">128→64→32→1</span>
                </div>
                <div className="fl-tech-item">
                    <span className="fl-tech-label">Classes</span>
                    <span className="fl-tech-value">2 (Binary)</span>
                </div>
                <div className="fl-tech-item">
                    <span className="fl-tech-label">Local Epochs</span>
                    <span className="fl-tech-value">3 per round</span>
                </div>
                <div className="fl-tech-item">
                    <span className="fl-tech-label">Aggregation</span>
                    <span className="fl-tech-value">FedAvg</span>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default FLStepsOverview;
