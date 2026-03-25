import React from 'react';
import { Eye } from 'lucide-react';
import StaggeredText from './ui/StaggeredText';
import AnimatedSection from './ui/AnimatedSection';

function StorySection() {
    return (
        <div id="story" className="section story-wrapper">
            <div className="section-container story-container">
                <div className="story-content">
                    <StaggeredText>
                        <div className="story-header">
                            <Eye size={48} className="story-icon" />
                            <h2 className="section-title">Why "ARGUS"?</h2>
                        </div>
                    </StaggeredText>
                    <StaggeredText delay={0.1}>
                        <p className="story-text">
                            In Greek mythology, <strong>Argus Panoptes</strong> was a primordial giant with
                            <strong> one hundred eyes</strong>. He was the perfect guardian—even when sleeping,
                            some of his eyes were always awake, watching for threats.
                        </p>
                    </StaggeredText>
                    <StaggeredText delay={0.2}>
                        <p className="story-text">
                            <strong>ARGUS-FL</strong> embodies this vigilant spirit. In a decentralized network,
                            threats like data poisoning and adversarial attacks are subtle and distributed.
                            Our system acts as the "Hundred-Eyed Guardian," monitoring the health,
                            latency, and integrity of every node in the federation without ever invading
                            the privacy of the data itself.
                        </p>
                    </StaggeredText>
                    <AnimatedSection delay={0.4}>
                        <blockquote className="story-quote">
                            "We see the patterns without seeing the data."
                        </blockquote>
                    </AnimatedSection>
                </div>
            </div>
        </div>
    );
}

export default StorySection;
