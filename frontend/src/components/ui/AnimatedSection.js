import React from 'react';
import { motion } from 'framer-motion';

const AnimatedSection = ({ children, className, id, delay = 0, priority = false }) => {
  return (
    <motion.div
      id={id}
      className={className}
      initial={priority ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      animate={priority ? { opacity: 1, y: 0 } : undefined}
      whileInView={priority ? undefined : { opacity: 1, y: 0 }}
      viewport={priority ? undefined : { once: false, amount: 0.2 }}
      transition={{ duration: 0.6, delay: delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedSection;
