import React from 'react';
import { Eye } from 'lucide-react';
import AnimatedSection from '../ui/AnimatedSection';

const About = () => {
    return (
        <section id="about" className="section story-wrapper">
            <div className="section-container story-container">
                <AnimatedSection className="story-content">
                    <div className="story-header">
                        <Eye size={48} className="story-icon" />
                        <h2 className="section-title">Why "ARGUS"?</h2>
                    </div>
                    <p className="story-text">
                        In Greek mythology, <strong>Argus Panoptes</strong> was a primordial giant with
                        <strong> one hundred eyes</strong>. He was the perfect guardian—even when sleeping,
                        some of his eyes were always awake, watching for threats.
                    </p>
                    <p className="story-text">
                        <strong>ARGUS-FL</strong> embodies this vigilant spirit. In a decentralized network,
                        threats like data poisoning and adversarial attacks are subtle and distributed.
                        Our system acts as the "Hundred-Eyed Guardian," monitoring the health,
                        latency, and integrity of every node in the federation without ever invading
                        the privacy of the data itself.
                    </p>
                    <blockquote className="story-quote">
                        "We see the patterns without seeing the data."
                    </blockquote>
                </AnimatedSection>
            </div>
        </section>
    );
};

export default About;
