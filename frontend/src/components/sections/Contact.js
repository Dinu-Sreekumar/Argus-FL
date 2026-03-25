import React from 'react';
import { Mail, Github, Twitter } from 'lucide-react';
import AnimatedSection from '../ui/AnimatedSection';

const Contact = () => {
    return (
        <section id="contact" className="section contact-wrapper">
            <div className="section-container">
                <AnimatedSection>
                    <h2 className="section-title">Get In Touch</h2>
                    <p className="section-subtitle">
                        Ready to deploy Argus in your infrastructure?
                    </p>
                </AnimatedSection>

                <AnimatedSection delay={0.2} className="contact-actions" style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
                    <a href="mailto:contact@argus-fl.dev" className="quick-btn" style={{ padding: '16px 32px', fontSize: '16px' }}>
                        <Mail size={20} /> Contact Team
                    </a>
                    <a href="https://github.com/argus-fl" target="_blank" rel="noopener noreferrer" className="quick-btn" style={{ padding: '16px 32px', fontSize: '16px' }}>
                        <Github size={20} /> GitHub
                    </a>
                    <a href="https://twitter.com/argus_fl" target="_blank" rel="noopener noreferrer" className="quick-btn" style={{ padding: '16px 32px', fontSize: '16px' }}>
                        <Twitter size={20} /> Twitter
                    </a>
                </AnimatedSection>
            </div>
        </section>
    );
};

export default Contact;
