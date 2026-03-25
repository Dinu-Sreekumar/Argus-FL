import React from 'react';
import { Link } from 'react-scroll';
import { Shield, ChevronDown } from 'lucide-react';

function HeroSection() {
    return (
        <div id="hero" className="hero-section">
            <div className="hero-content">
                <div className="hero-brand">
                    <Shield size={64} className="hero-logo" />
                    <h1 className="hero-title">ARGUS-FL</h1>
                </div>
                <p className="hero-tagline">The All-Seeing Guardian of Federated Learning</p>
                <p className="hero-subtext">
                    Decentralized Intelligence. Uncompromising Privacy. Advanced Simulation.
                </p>

                <Link
                    to="dashboard"
                    smooth={true}
                    duration={800}
                    className="hero-btn primary"
                >
                    Launch System
                </Link>
            </div>

            <Link
                to="methodology"
                smooth={true}
                duration={500}
                className="scroll-indicator"
            >
                <ChevronDown size={32} />
            </Link>
        </div>
    );
}

export default HeroSection;
