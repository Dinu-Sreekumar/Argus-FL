import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Experience from './Experience';

const Background3D = () => {
    return (
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
            <Canvas
                shadows
                camera={{ position: [0, 0, 8], fov: 35 }}
                gl={{ alpha: true, antialias: true }}
            >
                <Suspense fallback={null}>
                    <Experience />
                </Suspense>
            </Canvas>
        </div>
    );
};

export default Background3D;
