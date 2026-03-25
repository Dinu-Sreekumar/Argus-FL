import React from 'react';
import './Skeleton.css';

const Skeleton = ({ width = '100%', height = '20px', style = {} }) => {
    return (
        <div
            className="skeleton"
            style={{
                width,
                height,
                ...style
            }}
        />
    );
};

export default Skeleton;
