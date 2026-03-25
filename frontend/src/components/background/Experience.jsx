import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useLenis } from '../layout/SmoothScrollWrapper';
import * as THREE from 'three';
import SynapticNetwork from './SynapticNetwork';

const Experience = () => {
    const { camera, scene } = useThree();
    const lenis = useLenis();

    // Mutable state for scroll data
    const scrollState = useRef({
        y: 0,
        velocity: 0
    });

    useEffect(() => {
        if (!lenis) return;

        const updateScroll = (e) => {
            scrollState.current.y = e.scroll;
            scrollState.current.velocity = e.velocity;
        };

        // Subscribe to Lenis scroll events
        lenis.on('scroll', updateScroll);

        return () => {
            lenis.off('scroll', updateScroll);
        };
    }, [lenis]);

    useFrame((state, delta) => {
        const { y, velocity } = scrollState.current;

        // 1. Move Camera Forward based on Scroll
        // We move negative Z to go "into" the screen
        // Divide by 50 to scale scroll pixels to 3D units
        const targetZ = -(y * 0.05);

        // Smoothly interpolate camera position
        camera.position.z += (targetZ - camera.position.z) * 0.1;

        // 2. Warp Effect (FOV Change)
        // Base FOV is 35. Increase up to 45 with speed.
        const targetFOV = 35 + Math.min(Math.abs(velocity) * 0.5, 20);
        camera.fov += (targetFOV - camera.fov) * 0.1;
        camera.updateProjectionMatrix();

        // 3. Infinite Tunnel Logic (Optional but good)
        // If we fly past the stars, we might need to reset.
        // For now, let's rely on a very deep field or loop the camera.
        // Simple modulo loop: if camera goes < -100, reset to 0?
        // No, that causes jump. Better to move the field.
        // Let's stick to linear for now, assuming the user won't scroll 100,000px.
    });

    return (
        <>
            {/* Fog to hide the end of the tunnel */}
            <fog attach="fog" args={['#050505', 0, 50]} />

            <ambientLight intensity={0.5} />

            {/* Synaptic Network Graph */}
            <SynapticNetwork nodeCount={10000} connectionThreshold={25} />

            {/* Secondary Layer for depth */}
            <group position={[0, 0, -50]}>
                <SynapticNetwork nodeCount={2500} connectionThreshold={25} />
            </group>
        </>
    );
};

export default Experience;
