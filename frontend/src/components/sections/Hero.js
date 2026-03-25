import { Link } from 'react-scroll';
import { Link as RouterLink } from 'react-router-dom';
import { Shield, ChevronDown, Lock, Zap, Activity } from 'lucide-react';
import AnimatedSection from '../ui/AnimatedSection';
import ParallaxImage from '../ui/ParallaxImage';
import StaggeredText from '../ui/StaggeredText';

const Hero = () => {
    return (
        <section id="hero" className="hero-section">
            <div className="hero-container">
                <AnimatedSection className="hero-content-left" priority={true}>
                    <div className="system-badge">
                        SYSTEM OPERATIONAL
                    </div>

                    <StaggeredText>
                        <h1 className="hero-title-new">
                            THE ALL-SEEING<br />
                            <span className="text-cyan">GUARDIAN</span>
                        </h1>
                    </StaggeredText>

                    <StaggeredText className="mt-6">
                        <p className="hero-subtext-new">
                            Secure your decentralized intelligence. Train models across millions
                            of devices without ever exposing raw data. <span className="text-highlight">Privacy by design.</span><br />
                            Security by force.
                        </p>
                    </StaggeredText>

                    <div className="hero-actions">
                        <RouterLink to="/dashboard" className="hero-btn primary glow">
                            INITIALIZE PROTOCOL
                        </RouterLink>
                        <a href="#docs" className="hero-btn outline">
                            VIEW DOCUMENTATION
                        </a>
                    </div>

                    <div className="hero-stats">
                        <div className="stat-block">
                            <span className="stat-val">3</span>
                            <span className="stat-lbl">EDGE NODES</span>
                        </div>
                        <div className="stat-block">
                            <span className="stat-val">100%</span>
                            <span className="stat-lbl">DATA PRIVACY</span>
                        </div>
                        <div className="stat-block">
                            <span className="stat-val">5</span>
                            <span className="stat-lbl">TRAINING ROUNDS</span>
                        </div>
                    </div>
                </AnimatedSection>

                <AnimatedSection className="hero-visual-right" delay={0.2} priority={true}>
                    <ParallaxImage speed={0.8}>
                        <div className="security-card">
                            <div className="radar-circles">
                                <div className="circle c1"></div>
                                <div className="circle c2"></div>
                                <div className="circle c3"></div>
                            </div>
                            <Shield size={80} className="shield-icon-large" />
                            <div className="security-status">
                                <Lock size={14} />
                                <span>PROTECTION ACTIVE</span>
                            </div>
                        </div>
                    </ParallaxImage>
                </AnimatedSection>
            </div>

            <Link
                to="features"
                smooth={true}
                duration={500}
                className="scroll-indicator"
            >
                <ChevronDown size={32} />
            </Link>
        </section>
    );
};

export default Hero;
