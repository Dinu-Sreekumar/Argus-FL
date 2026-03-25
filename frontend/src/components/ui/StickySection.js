import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const StickySection = ({ leftContent, rightContent, className = "" }) => {
    const containerRef = useRef(null);
    const leftRef = useRef(null);

    useEffect(() => {
        let ctx = gsap.context(() => {
            const container = containerRef.current;
            const leftCol = leftRef.current;

            ScrollTrigger.matchMedia({
                // Desktop only
                "(min-width: 768px)": function () {
                    ScrollTrigger.create({
                        trigger: container,
                        start: "top top+=100", // Start pinning when top of container is 100px from top
                        end: "bottom bottom",  // Stop when bottom of container hits bottom of viewport
                        pin: leftCol,          // Pin the left column
                        pinSpacing: false,     // Often better false for side-by-side
                    });
                }
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <div ref={containerRef} className={`flex flex-col md:flex-row gap-10 py-20 relative ${className}`}>
            {/* Left Column (Sticky on Desktop) */}
            <div ref={leftRef} className="md:w-1/3 h-fit">
                {leftContent}
            </div>

            {/* Right Column (Scrollable) */}
            <div className="md:w-2/3">
                {rightContent}
            </div>
        </div>
    );
};

export default StickySection;
