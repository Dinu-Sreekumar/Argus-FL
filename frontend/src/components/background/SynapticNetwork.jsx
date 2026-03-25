import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SynapticNetwork = ({ nodeCount = 1500, connectionThreshold = 15 }) => {
    const groupRef = useRef();

    // Generate Nodes and Connections
    const { nodes, lines } = useMemo(() => {
        const nodePositions = new Float32Array(nodeCount * 3);
        const nodeColors = new Float32Array(nodeCount * 3);

        // 1. Create Nodes
        for (let i = 0; i < nodeCount; i++) {
            // Widen the X/Y slightly for a grander feel
            const x = (Math.random() - 0.5) * 70;
            const y = (Math.random() - 0.5) * 70;
            // Deep Z range for infinite travel
            const z = (Math.random() * 3000) - 2000;

            nodePositions[i * 3] = x;
            nodePositions[i * 3 + 1] = y;
            nodePositions[i * 3 + 2] = z;

            // Colors: Gold/Yellow with White highlights for Argus theme
            const colorMix = Math.random();
            if (colorMix > 0.9) { // Bright White (Active)
                nodeColors[i * 3] = 1; nodeColors[i * 3 + 1] = 1; nodeColors[i * 3 + 2] = 1;
            } else { // Yellow Gold (#DC143C -> 1, 0.84, 0)
                nodeColors[i * 3] = 1; nodeColors[i * 3 + 1] = 0.84; nodeColors[i * 3 + 2] = 0;
            }
        }

        // 2. Create Connections (Brute force optimized)
        // We accumulate pairs of vertices for lines
        const lineVertices = [];
        const pos = nodePositions;

        // Limiting checks for performance:
        // For 1500 nodes, O(N^2) is 2.25M iterations. JS might handle it in useMemo, but let's be safe.
        // We'll only check the forward neighbors in the array to avoid doubles and reduce count.
        // Also we can optimizations, but simple distance check is robust enough for useMemo.

        for (let i = 0; i < nodeCount; i++) {
            // OPTIMIZATION: Check only the next 150 nodes in the array. 
            // Since positions are random, this acts as a random set. 
            // Avoids O(N^2) complexity which would crash at 10k nodes (100M iter).
            // now O(N * 150) = 1.5M iterations. Safe.

            let connections = 0;
            const limit = Math.min(i + 150, nodeCount);

            for (let j = i + 1; j < limit; j++) {
                const dx = pos[i * 3] - pos[j * 3];
                const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
                const dz = pos[i * 3 + 2] - pos[j * 3 + 2];

                // Quick distance squared check
                const distSq = dx * dx + dy * dy + dz * dz;

                if (distSq < connectionThreshold * connectionThreshold) {
                    // Add Line Pair
                    lineVertices.push(
                        pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], // Start
                        pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]  // End
                    );
                    connections++;
                    if (connections > 3) break; // Lower fan-out limit for cleaner look with high density
                }
            }
        }

        return {
            nodes: { positions: nodePositions, colors: nodeColors },
            lines: new Float32Array(lineVertices)
        };
    }, [nodeCount, connectionThreshold]);

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        // Slow rotation of the whole web
        groupRef.current.rotation.z += delta * 0.08;
    });

    return (
        <group ref={groupRef}>
            {/* Render Nodes */}
            <points>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={nodes.positions.length / 3}
                        array={nodes.positions}
                        itemSize={3}
                    />
                    <bufferAttribute
                        attach="attributes-color"
                        count={nodes.colors.length / 3}
                        array={nodes.colors}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={0.6} // Visible size
                    sizeAttenuation={true}
                    vertexColors={true}
                    transparent={true}
                    opacity={0.9}
                    blending={THREE.AdditiveBlending}
                />
            </points>

            {/* Render Connections */}
            <lineSegments>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={lines.length / 3}
                        array={lines}
                        itemSize={3}
                    />
                </bufferGeometry>
                <lineBasicMaterial
                    color="#DC143C" // Crimson Red for lines
                    transparent={true}
                    opacity={0.6} // Bold lines
                    linewidth={2} // Best effort for thickness
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </lineSegments>
        </group>
    );
};

export default SynapticNetwork;
