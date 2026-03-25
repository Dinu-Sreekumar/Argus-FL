import React, { useEffect } from 'react';
import SentrySection from '../components/SentrySection';

const SentryPage = () => {
    // Scroll to top on load
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return <SentrySection />;
};

export default SentryPage;
