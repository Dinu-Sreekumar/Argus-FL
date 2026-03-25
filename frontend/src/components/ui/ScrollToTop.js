import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        // Always scroll to top on route change
        const appContainer = document.querySelector('.App');
        if (appContainer) {
            appContainer.scrollTo(0, 0);
        } else {
            window.scrollTo(0, 0);
        }
    }, [pathname]);

    return null;
};

export default ScrollToTop;
