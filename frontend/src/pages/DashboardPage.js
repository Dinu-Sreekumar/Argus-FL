import React, { useState, useEffect, useCallback } from 'react';
import DashboardSection from '../components/DashboardSection';
import { useLenis } from '../components/layout/SmoothScrollWrapper';

// Dashboard page sections for navigation
const SECTIONS = [
    { id: 'fl-model', label: 'FL Demo' }
];

const DashboardPage = () => {
    const [metrics, setMetrics] = useState([]);
    const [activeSection, setActiveSection] = useState('fl-model');
    const lenis = useLenis();

    // Scroll to section helper
    const scrollToSection = useCallback((id) => {
        if (lenis) {
            lenis.scrollTo(`#${id}`);
        } else {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [lenis]);

    // Navigate to adjacent section
    const navigateSection = useCallback((direction) => {
        const currentIndex = SECTIONS.findIndex(s => s.id === activeSection);
        const nextIndex = direction === 'next'
            ? Math.min(currentIndex + 1, SECTIONS.length - 1)
            : Math.max(currentIndex - 1, 0);
        scrollToSection(SECTIONS[nextIndex].id);
    }, [activeSection, scrollToSection]);

    // Ensure we start at the top on load/reload
    useEffect(() => {
        // Disable browser's automatic scroll restoration
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        // Immediate scroll
        window.scrollTo(0, 0);

        // Delayed scroll to override any browser behavior
        const timeoutId = setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }, 0);

        return () => clearTimeout(timeoutId);
    }, []);

    // Intersection Observer to track active section
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { threshold: 0.3 }
        );

        SECTIONS.forEach(section => {
            const element = document.getElementById(section.id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                // Modified: Only keep basic scrolling if needed, or remove completely since there's only 1 section now.
                // Keeping minimal handlers in case we add more sections later.
                case 'Home':
                    e.preventDefault();
                    scrollToSection('fl-model');
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigateSection, scrollToSection]);

    return (
        <div className="dashboard-scroll-container">
            <DashboardSection onMetricsUpdate={setMetrics} />
        </div>
    );
};

export default DashboardPage;
