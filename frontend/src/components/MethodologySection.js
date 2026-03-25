import React from 'react';
import { Database, Lock, Server } from 'lucide-react';

function MethodologySection() {
    return (
        <div id="methodology" className="section methodology-wrapper">
            <div className="section-container">
                <h2 className="section-title">How It Works</h2>
                <p className="section-subtitle">
                    Data never leaves the device. Only intelligence is shared.
                </p>

                <div className="methodology-grid">
                    <div className="method-card">
                        <div className="icon-box">
                            <Database size={32} color="#DC143C" />
                        </div>
                        <h3>1. Edge Training</h3>
                        <p>
                            IoT devices (Laptops, Phones, Sensors) train a local machine learning model
                            using their own private data. Raw data <strong>never</strong> uploads to the cloud.
                        </p>
                    </div>

                    <div className="method-card">
                        <div className="icon-box">
                            <Lock size={32} color="#DC143C" />
                        </div>
                        <h3>2. Secure Updates</h3>
                        <p>
                            Only the mathematical weights (learning patterns) are encrypted and sent
                            to the central server. This guarantees 100% data privacy.
                        </p>
                    </div>

                    <div className="method-card">
                        <div className="icon-box">
                            <Server size={32} color="#DC143C" />
                        </div>
                        <h3>3. Global Aggregation</h3>
                        <p>
                            The ARGUS server averages the weights using the <strong>FedAvg</strong> algorithm
                            to create a smarter Global Model, which is then redistributed to all nodes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MethodologySection;
