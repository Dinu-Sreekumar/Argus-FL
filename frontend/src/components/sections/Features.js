import React from 'react';
import { Database, Lock, Server } from 'lucide-react';
import AnimatedSection from '../ui/AnimatedSection';
import StickySection from '../ui/StickySection';
import StaggeredText from '../ui/StaggeredText';

const Features = () => {
    return (
        <section id="features" className="section methodology-wrapper">
            <div className="section-container">
                <StickySection
                    leftContent={
                        <div className="sticky-content-wrapper">
                            <StaggeredText>
                                <h2 className="section-title">How It Works</h2>
                            </StaggeredText>
                            <StaggeredText>
                                <p className="section-subtitle mt-4 text-xl text-gray-400">
                                    Data never leaves the device.<br /> Only intelligence is shared.
                                </p>
                            </StaggeredText>
                        </div>
                    }
                    rightContent={
                        <div className="methodology-grid space-y-24">
                            <AnimatedSection className="method-card" delay={0.1}>
                                <div className="icon-box">
                                    <Database size={32} color="#DC143C" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">1. Edge Training</h3>
                                <p className="text-gray-300">
                                    IoT devices (Laptops, Phones, Sensors) train a local machine learning model
                                    using their own private data. Raw data <strong>never</strong> uploads to the cloud.
                                </p>
                            </AnimatedSection>

                            <AnimatedSection className="method-card" delay={0.1}>
                                <div className="icon-box">
                                    <Lock size={32} color="#DC143C" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">2. Secure Updates</h3>
                                <p className="text-gray-300">
                                    Only the mathematical weights (learning patterns) are encrypted and sent
                                    to the central server. This guarantees 100% data privacy.
                                </p>
                            </AnimatedSection>

                            <AnimatedSection className="method-card" delay={0.1}>
                                <div className="icon-box">
                                    <Server size={32} color="#DC143C" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">3. Global Aggregation</h3>
                                <p className="text-gray-300">
                                    The ARGUS server averages the weights using the <strong>FedAvg</strong> algorithm
                                    to create a smarter Global Model, which is then redistributed to all nodes.
                                </p>
                            </AnimatedSection>
                        </div>
                    }
                />
            </div>
        </section>
    );
};

export default Features;
