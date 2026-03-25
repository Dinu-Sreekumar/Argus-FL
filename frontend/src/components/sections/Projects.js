import React from 'react';
import { Link } from 'react-router-dom'; // Using React Router for page navigation
import { Activity, ShieldCheck, Zap } from 'lucide-react';
import AnimatedSection from '../ui/AnimatedSection';

const Projects = () => {
    return (
        <section id="projects" className="section projects-wrapper">
            <div className="section-container">
                <AnimatedSection>
                    <h2 className="section-title">Use Cases & Demos</h2>
                    <p className="section-subtitle">Explore the capabilities of the Argus Federation.</p>
                </AnimatedSection>

                <div className="methodology-grid"> {/* Reusing grid class for consistency */}
                    <AnimatedSection className="method-card" delay={0.2}>
                        <Link to="/project/iot-security" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="icon-box">
                                <ShieldCheck size={32} color="#DC143C" />
                            </div>
                            <h3>IoT Security</h3>
                            <p>
                                Detecting anomalies in distributed IoT sensor networks without centralized data collection.
                            </p>
                            <span className="hero-btn primary" style={{ padding: '8px 16px', fontSize: '12px', marginTop: '16px' }}>View Case Study</span>
                        </Link>
                    </AnimatedSection>

                    <AnimatedSection className="method-card" delay={0.4}>
                        <Link to="/project/healthcare-privacy" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="icon-box">
                                <Activity size={32} color="#DC143C" />
                            </div>
                            <h3>Healthcare Privacy</h3>
                            <p>
                                Collaborative medical diagnosis model training across hospitals while maintaining patient confidentiality.
                            </p>
                            <span className="hero-btn primary" style={{ padding: '8px 16px', fontSize: '12px', marginTop: '16px' }}>View Case Study</span>
                        </Link>
                    </AnimatedSection>

                    <AnimatedSection className="method-card" delay={0.6}>
                        <Link to="/project/latency-opt" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="icon-box">
                                <Zap size={32} color="#DC143C" />
                            </div>
                            <h3>Latency Optimization</h3>
                            <p>
                                Real-time edge computation benchmarks demonstrating superior latency vs cloud training.
                            </p>
                            <span className="hero-btn primary" style={{ padding: '8px 16px', fontSize: '12px', marginTop: '16px' }}>View Case Study</span>
                        </Link>
                    </AnimatedSection>
                </div>
            </div>
        </section>
    );
};

export default Projects;
