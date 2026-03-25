import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const appContainer = document.querySelector('.App');

        const handleScroll = () => {
            if (appContainer && appContainer.scrollTop > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        if (appContainer) {
            appContainer.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (appContainer) {
                appContainer.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    return (
        <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
            <div className="navbar-container">
                <Link to="/" className="navbar-logo">
                    ARGUS<span className="text-highlight">FL</span>
                </Link>
                <div className="nav-menu">
                    <Link to="/dashboard" className="nav-item">FL Demo</Link>
                    <Link to="/sentry" className="nav-item">Sentry System</Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
