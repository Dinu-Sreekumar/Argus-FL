import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const StaggeredText = ({ children, className = "", stagger = 0.1 }) => {
    const elementRef = useRef(null);

    useEffect(() => {
        let ctx = gsap.context(() => {
            const element = elementRef.current;

            gsap.fromTo(element,
                { y: "100%", opacity: 0 },
                {
                    y: "0%",
                    opacity: 1,
                    duration: 1.2,
                    ease: "power4.out", // "Luxury" ease
                    scrollTrigger: {
                        trigger: element,
                        start: "top 85%", // Trigger when element is 15% up from bottom
                        toggleActions: "play reverse play reverse"
                    }
                }
            );
        }, elementRef);

        return () => ctx.revert();
    }, []);

    // The key is overflow-hidden on the wrapper to create the "mask"
    return (
        <div className={`overflow-hidden ${className}`}>
            <div ref={elementRef} className="will-change-transform">
                {children}
            </div>
        </div>
    );
};

export default StaggeredText;
