import React, { useLayoutEffect, useRef, createContext, useContext } from 'react';
import Lenis from 'lenis';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Create Context
const LenisContext = createContext(null);

// Custom Hook to access Lenis
export const useLenis = () => useContext(LenisContext);

const SmoothScrollWrapper = ({ children }) => {
    const location = useLocation();
    const lenisRef = useRef(null);
    const [lenisInstance, setLenisInstance] = React.useState(null);

    useLayoutEffect(() => {
        // Initialize Lenis with "Luxury" configuration
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential decay
            direction: 'vertical',
            gestureDirection: 'vertical',
            smooth: true,
            mouseMultiplier: 1,
            smoothTouch: false,
            touchMultiplier: 2,
        });

        lenisRef.current = lenis;
        setLenisInstance(lenis);

        // Synchronize Lenis with GSAP ScrollTrigger
        lenis.on('scroll', ScrollTrigger.update);

        // Add Lenis's raf method to GSAP's ticker
        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });

        // Turn off GSAP lag smoothing
        // Turn off GSAP lag smoothing
        gsap.ticker.lagSmoothing(0);

        // REMOVED: Duplicate requestAnimationFrame loop. 
        // We are already using gsap.ticker.add() above.

        return () => {
            lenis.destroy();
            gsap.ticker.remove(lenis.raf);
        };
    }, []);

    // Handle Route Changes
    useLayoutEffect(() => {
        if (lenisRef.current) {
            lenisRef.current.scrollTo(0, { immediate: true });
        } else {
            window.scrollTo(0, 0);
        }
    }, [location.pathname]);

    return (
        <LenisContext.Provider value={lenisInstance}>
            {children}
        </LenisContext.Provider>
    );
};

export default SmoothScrollWrapper;
