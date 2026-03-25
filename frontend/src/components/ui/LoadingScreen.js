import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = () => {
    return (
        <div className="loading-screen">
            <div className="loading-content">
                {/* Pulsing Logo */}
                <div className="loading-logo">
                    ARGUS<span className="text-highlight">FL</span>
                </div>
                {/* Loading Text with Blinking Cursor */}
                <div className="loading-text">
                    INITIALIZING SECURE LINK<span className="blinking-cursor">_</span>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
