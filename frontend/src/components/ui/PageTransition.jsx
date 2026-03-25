import React from 'react';
import { motion } from 'framer-motion';

/**
 * PageTransition - Wrapper component for smooth page transitions
 * Uses Framer Motion to create a fade-in/fade-out effect on route changes
 * Duration: 250ms with ease-out curve for a premium, non-jarring experience
 */
const PageTransition = ({ children }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
                duration: 0.25,
                ease: 'easeOut'
            }}
            style={{ width: '100%', height: '100%' }}
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
