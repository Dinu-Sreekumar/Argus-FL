import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Ensure ScrollTrigger is registered (safe to call multiple times)
gsap.registerPlugin(ScrollTrigger);

/**
 * RevealOnScroll Component
 * 
 * Wraps children in a GSAP ScrollTrigger animation.
 * 
 * @param {ReactNode} children - The content to animate.
 * @param {string} animation - Type of animation: 'fade-up' (default), 'scale', 'blur-reveal', 'fade-in'.
 * @param {number} duration - Animation duration in seconds.
 * @param {number} delay - Delay in seconds.
 * @param {boolean} pin - Not used in this simple version, but kept for API shape.
 * @param {string} className - Additional classes for the wrapper.
 */
const RevealOnScroll = ({
    children,
    animation = 'fade-up',
    duration = 1.0,
    delay = 0,
    className = ""
}) => {
    const ref = useRef(null);

    useGSAP(() => {
        const element = ref.current;
        if (!element) return;

        let initialVars = {};
        let finalVars = {
            opacity: 1,
            duration: duration,
            ease: "power3.out",
            delay: delay,
            scrollTrigger: {
                trigger: element,
                start: "top 85%", // Trigger when top of element hits 85% of viewport height
                end: "bottom 20%",
                toggleActions: "play reverse play reverse", // Animates in/out in both directions
                // markers: true, // Uncomment for debugging
            }
        };

        // Configuration based on animation type
        switch (animation) {
            case 'fade-up':
                initialVars = { opacity: 0, y: 100 };
                finalVars.y = 0;
                break;
            case 'scale':
                initialVars = { opacity: 0, scale: 0.8 };
                finalVars.scale = 1;
                break;
            case 'blur-reveal':
                initialVars = { opacity: 0, filter: 'blur(20px)', y: 50 };
                finalVars.filter = 'blur(0px)';
                finalVars.y = 0;
                break;
            case 'fade-in':
                initialVars = { opacity: 0 };
                break;
            default:
                initialVars = { opacity: 0, y: 50 };
                finalVars.y = 0;
        }

        // Set initial state
        gsap.set(element, initialVars);

        // Animate to final state
        gsap.to(element, finalVars);

    }, { scope: ref });

    return (
        <div ref={ref} className={`reveal-on-scroll ${className}`}>
            {children}
        </div>
    );
};

export default RevealOnScroll;
