import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ParallaxImage = ({ children, speed = 0.5, className = "" }) => {
    const triggerRef = useRef(null);
    const targetRef = useRef(null);

    useEffect(() => {
        let ctx = gsap.context(() => {
            const trigger = triggerRef.current;
            const target = targetRef.current;

            // Calculate movement: (1 - speed) * 100 ensures slower movement than scroll
            // speed < 1 = lag (far away), speed > 1 = accelerated (foreground)
            const yOffset = (1 - speed) * 100;

            gsap.fromTo(target,
                { yPercent: -yOffset },
                {
                    yPercent: yOffset,
                    ease: "none",
                    scrollTrigger: {
                        trigger: trigger,
                        start: "top bottom", // Start when top of container hits bottom of viewport
                        end: "bottom top",   // End when bottom of container hits top of viewport
                        scrub: 0,            // Direct sync with scrollbar (physics handled by Lenis)
                    }
                }
            );
        }, triggerRef);

        return () => ctx.revert();
    }, [speed]);

    return (
        <div ref={triggerRef} className={`parallax-wrapper overflow-hidden ${className}`}>
            <div ref={targetRef} className="parallax-inner will-change-transform">
                {children}
            </div>
        </div>
    );
};

export default ParallaxImage;
