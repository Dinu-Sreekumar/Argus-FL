import React from 'react';

import Background3D from '../background/Background3D';

// The "Infinite Canvas" Shell
const MainLayout = ({ children, className = "" }) => {
    return (
        <div className={`min-h-screen w-full text-white overflow-x-hidden selection:bg-primary selection:text-white ${className}`}>
            <Background3D />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};

// The "Stage" Container (Optional use for pages that need it)
export const Container = ({ children, className = "" }) => {
    return (
        <div className={`max-w-7xl w-full mx-auto px-6 relative z-10 ${className}`}>
            {children}
        </div>
    );
};

export default MainLayout;
