import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Brain,
    Shield,
    ChevronDown,
    BarChart3,
    Zap,
    Lock,
    Eye,
    ArrowRight,
    AlertTriangle,
    Lightbulb,
    Network,
    ShieldCheck,
    Cpu,
    Home,
    Skull,
    FileText,
    Activity,
    Play,
    Radar,
    Code2,
    Database,
    Mail,
    Wifi,
    Server,
    Layers
} from 'lucide-react';
import Toast from '../components/Toast';
import RevealOnScroll from '../components/ui/RevealOnScroll';
import { useLenis } from '../components/layout/SmoothScrollWrapper';
// Section configuration for navigation
const SECTIONS = [
    { id: 'hero', label: 'Home' },
    { id: 'story', label: 'Why ARGUS' },
    { id: 'problem', label: 'The Problem' },
    { id: 'solution', label: 'The Solution' },
    { id: 'methodology', label: 'How It Works' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'demo', label: 'Live Demo' },
    { id: 'sentry', label: 'Sentry IDS' },
    { id: 'tech', label: 'Tech Stack' }
];

const HomePage = () => {
    const [activeSection, setActiveSection] = useState('hero');
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const containerRef = useRef(null);
    const lenis = useLenis();

    // Scroll to section helper
    const scrollToSection = useCallback((id) => {
        if (lenis) {
            lenis.scrollTo(`#${id}`);
        } else {
            // Fallback
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [lenis]);

    // Navigate to adjacent section
    const navigateSection = useCallback((direction) => {
        const currentIndex = SECTIONS.findIndex(s => s.id === activeSection);
        const nextIndex = direction === 'next'
            ? Math.min(currentIndex + 1, SECTIONS.length - 1)
            : Math.max(currentIndex - 1, 0);
        scrollToSection(SECTIONS[nextIndex].id);
    }, [activeSection, scrollToSection]);

    // Intersection Observer to track active section
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { threshold: 0.5 }
        );

        SECTIONS.forEach(section => {
            const element = document.getElementById(section.id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case 'ArrowDown':
                case 'PageDown':
                    e.preventDefault();
                    navigateSection('next');
                    break;
                case 'ArrowUp':
                case 'PageUp':
                    e.preventDefault();
                    navigateSection('prev');
                    break;
                case 'Home':
                    e.preventDefault();
                    scrollToSection('hero');
                    break;
                case 'End':
                    e.preventDefault();
                    scrollToSection('tech');
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigateSection, scrollToSection]);

    return (
        <div ref={containerRef} className="bg-transparent text-text relative w-full">
            {/* Navigation Dots */}
            <nav className="fixed right-12 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col items-end gap-4">
                {SECTIONS.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className="group flex items-center justify-end"
                        aria-label={`Go to ${section.label}`}
                    >
                        {/* Text Label - appears on hover */}
                        <span className={`mr-3 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ease-out origin-right scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 ${activeSection === section.id
                            ? 'bg-primary text-black'
                            : 'bg-card border border-gray-200 dark:border-gray-800 text-text-muted'
                            }`}>
                            {section.label}
                        </span>
                        {/* Dot */}
                        <span className={`rounded-full transition-all duration-300 ${activeSection === section.id
                            ? 'w-3 h-3 bg-primary shadow-lg shadow-primary/50'
                            : 'w-2 h-2 bg-gray-600 group-hover:w-3 group-hover:h-3 group-hover:bg-gray-400'
                            }`} />
                    </button>
                ))}
            </nav>
            {/* Fixed Header - Simple ARGUSFL branding */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0b10]/90 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-8 py-5">
                    <Link to="/" className="inline-block" style={{ textDecoration: 'none' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '2px', color: '#fff', margin: 0, cursor: 'pointer' }}>
                            ARGUS<span style={{ color: '#FFD700' }}>FL</span>
                        </h1>
                    </Link>
                </div>
            </header>

            {/* Section 1: Welcome / Hero */}
            <section
                id="hero"
                className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden pt-32 pb-20"
            >
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(0, 184, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 184, 255, 0.1) 1px, transparent 1px)',
                        backgroundSize: '50px 50px'
                    }}
                />

                <div className="max-w-7xl w-full mx-auto px-8 z-10 flex items-center justify-between gap-12">
                    {/* Left Content */}
                    <div className="flex-1 max-w-xl">
                        <RevealOnScroll animation="fade-up">
                            <div className="mb-8">
                                <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC143C]/10 border border-[#DC143C]/30 rounded text-[#DC143C] text-xs font-mono tracking-widest uppercase">
                                    SYSTEM OPERATIONAL
                                </span>
                            </div>

                            <h1 className="text-5xl md:text-6xl font-extrabold mb-2 leading-tight">
                                <span className="text-white">THE ALL-</span><br />
                                <span className="text-white">SEEING</span><br />
                                <span className="text-[#DC143C]">GUARDIAN</span>
                            </h1>

                            <p className="text-gray-400 text-base mt-6 mb-8 max-w-md leading-relaxed">
                                Secure your decentralized intelligence. Train models across millions of
                                devices without ever exposing raw data. <span className="text-white font-medium">Privacy by design.</span><br />
                                Security by force.
                            </p>

                            <div className="flex items-center gap-4 mb-12">
                                <Link
                                    to="/dashboard"
                                    className="px-6 py-3 bg-[#DC143C] text-black font-bold text-sm uppercase tracking-wider rounded transition-all shadow-lg shadow-[#DC143C]/30 hover:shadow-[#DC143C]/50 hover:scale-105"
                                >
                                    INITIALIZE PROTOCOL
                                </Link>
                                <Link
                                    to="/why-login"
                                    className="ml-2 px-4 py-2 bg-transparent border border-gray-600 hover:border-gold/50 text-white font-semibold text-xs uppercase tracking-wider rounded transition-colors opacity-70 hover:opacity-100"
                                >
                                    WHY LOGIN?
                                </Link>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-10">
                                <div>
                                    <div className="text-xl font-bold text-white">3</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">ACTIVE NODES</div>
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-white">100%</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">DATA PRIVACY</div>
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-white">4ms</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">AVG LATENCY</div>
                                </div>
                            </div>
                        </RevealOnScroll>
                    </div>

                    {/* Right Visual - Shield */}
                    <div className="flex-1 flex items-center justify-center">
                        <RevealOnScroll animation="scale" delay={0.3}>
                            <div className="relative">
                                {/* Shield Icon */}
                                <div className="relative z-10">
                                    <Shield size={180} className="text-[#DC143C]" strokeWidth={1} />
                                    <div className="absolute inset-0 blur-[60px] bg-[#DC143C]/20" />
                                </div>
                                {/* Protection Active Label */}
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-gray-500 text-xs">
                                    <Lock size={12} className="text-[#DC143C]" />
                                    <span className="uppercase tracking-wider">PROTECTION ACTIVE</span>
                                </div>
                            </div>
                        </RevealOnScroll>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
                    <RevealOnScroll animation="fade-in" delay={1.5}>
                        <button
                            onClick={() => scrollToSection('story')}
                            className="flex flex-col items-center gap-2 text-gray-500 hover:text-[#DC143C] transition-colors"
                        >
                            <ChevronDown size={24} className="animate-bounce" />
                        </button>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Section 2: Why "ARGUS"? (Brand Story) */}
            <section
                id="story"
                className="min-h-screen flex flex-col items-center justify-center py-32 px-6 bg-gradient-to-b from-transparent via-black/60 to-transparent backdrop-blur-[2px]"
            >
                <div className="max-w-4xl w-full text-center">
                    <RevealOnScroll animation="fade-up">
                        <div className="mb-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC143C]/10 border border-[#DC143C]/30 rounded-full text-[#DC143C] text-sm font-medium mb-4">
                                <Eye size={16} />
                                The Origin
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">Why "ARGUS"?</h2>
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll animation="fade-up" delay={0.2}>
                        <div className="space-y-6 text-left max-w-3xl mx-auto">
                            <p className="text-gray-300 text-lg leading-relaxed">
                                In Greek mythology, <strong className="text-[#DC143C]">Argus Panoptes</strong> was a primordial giant with
                                <strong className="text-[#DC143C]"> one hundred eyes</strong>. He was the perfect guardian—even when sleeping,
                                some of his eyes were always awake, watching for threats.
                            </p>
                            <p className="text-gray-300 text-lg leading-relaxed">
                                <strong className="text-white">ARGUS-FL</strong> embodies this vigilant spirit. In a decentralized network,
                                threats like data poisoning and adversarial attacks are subtle and distributed.
                                Our system acts as the "Hundred-Eyed Guardian," monitoring the health,
                                latency, and integrity of every node in the federation without ever invading
                                the privacy of the data itself.
                            </p>
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll animation="scale" delay={0.4}>
                        <blockquote
                            className="mt-12 text-2xl md:text-3xl font-semibold text-[#DC143C] italic border-l-4 border-[#DC143C] pl-6 text-left max-w-3xl mx-auto"
                            style={{ textShadow: '0 0 30px rgba(0, 184, 255, 0.3)' }}
                        >
                            "We see the threats without seeing the data."
                        </blockquote>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Section 3: The Problem */}
            <section
                id="problem"
                className="min-h-screen flex flex-col items-center justify-center py-32 px-6"
            >
                <div className="max-w-5xl w-full text-center">
                    <RevealOnScroll animation="fade-up">
                        <div className="mb-12">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full text-red-400 text-sm font-medium mb-4">
                                <AlertTriangle size={16} />
                                The Challenge
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                                Why Traditional ML Falls Short
                            </h2>
                            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                                Regular machine learning requires centralizing all data in one place for training—making it impossible to protect user privacy while detecting threats.
                            </p>
                        </div>
                    </RevealOnScroll>

                    <div className="grid md:grid-cols-3 gap-6">
                        <RevealOnScroll animation="scale" delay={0.1}>
                            <div className="bg-[#13141b] border border-gray-800 rounded-2xl p-6 text-left h-full hover:border-gold/50 transition-all group">
                                <Home size={32} className="text-red-400 mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="text-lg font-bold text-white mb-2">Data Must Leave Your Device</h3>
                                <p className="text-gray-500 text-sm">
                                    Traditional ML requires uploading raw network data to central servers—exposing your sensitive traffic patterns.
                                </p>
                            </div>
                        </RevealOnScroll>
                        <RevealOnScroll animation="scale" delay={0.2}>
                            <div className="bg-[#13141b] border border-gray-800 rounded-2xl p-6 text-left h-full hover:border-gold/50 transition-all group">
                                <Eye size={32} className="text-red-400 mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="text-lg font-bold text-white mb-2">No Privacy Preservation</h3>
                                <p className="text-gray-500 text-sm">
                                    Centralized models see all your data. Third parties can analyze, store, or leak your private information.
                                </p>
                            </div>
                        </RevealOnScroll>
                        <RevealOnScroll animation="scale" delay={0.3}>
                            <div className="bg-[#13141b] border border-gray-800 rounded-2xl p-6 text-left h-full hover:border-gold/50 transition-all group">
                                <Cpu size={32} className="text-red-400 mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="text-lg font-bold text-white mb-2">Single Point of Failure</h3>
                                <p className="text-gray-500 text-sm">
                                    One central server breach exposes everyone's data. Regular ML cannot distribute security without sharing data.
                                </p>
                            </div>
                        </RevealOnScroll>
                    </div>
                </div>
            </section>

            {/* Section 3: The Solution */}
            <section
                id="solution"
                className="min-h-screen flex flex-col items-center justify-center py-32 px-6"
            >
                <div className="max-w-5xl w-full">
                    <RevealOnScroll animation="fade-up">
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC143C]/10 border border-[#DC143C]/30 rounded-full text-[#DC143C] text-sm font-medium mb-4">
                                <Lightbulb size={16} />
                                The Answer
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                                Federated Learning
                            </h2>
                            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                                Train AI models locally on each device. Share only the learned intelligence—never the raw data.
                            </p>
                        </div>
                    </RevealOnScroll>

                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <RevealOnScroll animation="fade-up" delay={0.2}>
                            <div className="space-y-6">
                                <div className="flex gap-4 items-start">
                                    <div className="w-10 h-10 bg-[#DC143C]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Lock size={20} className="text-[#DC143C]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-1">Data Stays Home</h3>
                                        <p className="text-gray-500 text-sm">Raw network traffic never leaves your devices.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="w-10 h-10 bg-[#DC143C]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Brain size={20} className="text-[#DC143C]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-1">Collaborative Intelligence</h3>
                                        <p className="text-gray-500 text-sm">Devices share model weights to build a stronger global model.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="w-10 h-10 bg-[#DC143C]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <ShieldCheck size={20} className="text-[#DC143C]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-1">Threat Detection</h3>
                                        <p className="text-gray-500 text-sm">Detect network attacks without compromising privacy.</p>
                                    </div>
                                </div>
                            </div>
                        </RevealOnScroll>

                        <RevealOnScroll animation="scale" delay={0.3}>
                            <div className="bg-[#13141b] border border-gray-800 rounded-2xl p-8 hover:border-gold/50 transition-all group">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-[#DC143C]/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                        <Network size={40} className="text-[#DC143C]" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Decentralized by Design</h3>
                                    <p className="text-gray-400 text-sm mb-6">
                                        No single point of failure. Each node contributes to collective security.
                                    </p>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <div className="text-2xl font-bold text-[#FFD700]">3</div>
                                            <div className="text-xs text-gray-500">Edge Nodes</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-[#FFD700]">0%</div>
                                            <div className="text-xs text-gray-500">Data Shared</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-[#FFD700]">100%</div>
                                            <div className="text-xs text-gray-500">Privacy</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </RevealOnScroll>
                    </div>
                </div>
            </section>

            {/* Section 4: How It Works (Methodology) */}
            <section
                id="methodology"
                className="min-h-screen flex flex-col items-center justify-center py-32 px-6"
            >
                <div className="max-w-6xl w-full">
                    <RevealOnScroll animation="fade-up">
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC143C]/10 border border-[#DC143C]/30 rounded-full text-[#DC143C] text-sm font-medium mb-4">
                                <Zap size={16} />
                                Privacy-First Architecture
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">How It Works</h2>
                            <p className="text-gray-400 text-lg max-w-xl mx-auto">
                                Data never leaves the device. Only intelligence is shared.
                            </p>
                        </div>
                    </RevealOnScroll>

                    <div className="grid md:grid-cols-3 gap-8">
                        <RevealOnScroll animation="scale" delay={0.1}>
                            <div className="bg-[#13141b] border border-gray-800 rounded-2xl p-8 text-center hover:border-gold/50 transition-all group h-full">
                                <div className="w-16 h-16 bg-[#DC143C]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                    <BarChart3 size={32} className="text-[#DC143C]" />
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-white">1. Edge Training</h3>
                                <p className="text-gray-400 text-sm">
                                    IoT devices (Laptops, Phones, Sensors) train a local machine learning model
                                    using their own private data. Raw data <strong className="text-white">never</strong> uploads to the cloud.
                                </p>
                            </div>
                        </RevealOnScroll>

                        <RevealOnScroll animation="scale" delay={0.2}>
                            <div className="bg-[#13141b] border border-gray-800 rounded-2xl p-8 text-center hover:border-gold/50 transition-all group h-full">
                                <div className="w-16 h-16 bg-[#DC143C]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                    <Lock size={32} className="text-[#DC143C]" />
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-white">2. Secure Updates</h3>
                                <p className="text-gray-400 text-sm">
                                    Only the mathematical weights (learning patterns) are encrypted and sent
                                    to the central server. This guarantees <strong className="text-white">100% data privacy</strong>.
                                </p>
                            </div>
                        </RevealOnScroll>

                        <RevealOnScroll animation="scale" delay={0.3}>
                            <div className="bg-[#13141b] border border-gray-800 rounded-2xl p-8 text-center hover:border-gold/50 transition-all group h-full">
                                <div className="w-16 h-16 bg-[#DC143C]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                    <Brain size={32} className="text-[#DC143C]" />
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-white">3. Global Aggregation</h3>
                                <p className="text-gray-400 text-sm">
                                    The ARGUS server averages the weights using the <strong className="text-white">FedAvg</strong> algorithm
                                    to create a smarter Global Model, which is then redistributed to all nodes.
                                </p>
                            </div>
                        </RevealOnScroll>
                    </div>
                </div>
            </section>

            {/* Section 5: Privacy Guarantee */}
            <section
                id="privacy"
                className="min-h-screen flex flex-col items-center justify-center py-32 px-6"
            >
                <div className="max-w-5xl w-full text-center">
                    <RevealOnScroll animation="fade-up">
                        <div className="mb-12">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC143C]/10 border border-[#DC143C]/30 rounded-full text-[#DC143C] text-sm font-medium mb-4">
                                <Lock size={16} />
                                Privacy Guarantee
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                                Your Data Never Leaves Home
                            </h2>
                            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                                Unlike traditional cloud security, ARGUS-FL ensures complete data sovereignty.
                            </p>
                        </div>
                    </RevealOnScroll>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Traditional Approach */}
                        <RevealOnScroll animation="scale" delay={0.2}>
                            <div className="bg-[#13141b] border border-red-500/30 rounded-2xl p-8 text-left h-full hover:border-gold/50 transition-all group">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <AlertTriangle size={20} className="text-red-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-red-400">Traditional Cloud Security</h3>
                                </div>
                                <ul className="space-y-3 text-gray-400 text-sm">
                                    <li className="flex items-center gap-2">
                                        <span className="text-red-400">✗</span> Raw data sent to cloud servers
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-red-400">✗</span> Third-party has access to your data
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-red-400">✗</span> Data breaches expose personal info
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-red-400">✗</span> Government/corporate surveillance risk
                                    </li>
                                </ul>
                            </div>
                        </RevealOnScroll>

                        {/* ARGUS Approach */}
                        <RevealOnScroll animation="scale" delay={0.3}>
                            <div className="bg-[#13141b] border border-[#DC143C]/30 rounded-2xl p-8 text-left h-full hover:border-gold/50 transition-all group">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-[#DC143C]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <ShieldCheck size={20} className="text-[#DC143C]" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[#DC143C]">ARGUS-FL Approach</h3>
                                </div>
                                <ul className="space-y-3 text-gray-400 text-sm">
                                    <li className="flex items-center gap-2">
                                        <span className="text-[#FFD700]">✓</span> Data stays on your devices
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-[#FFD700]">✓</span> Only model weights are shared
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-[#FFD700]">✓</span> Mathematically impossible to reverse
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-[#FFD700]">✓</span> Full privacy by design
                                    </li>
                                </ul>
                            </div>
                        </RevealOnScroll>
                    </div>
                </div>
            </section>

            {/* Section 8: Live Demo */}
            <section
                id="demo"
                className="min-h-screen flex flex-col items-center justify-center py-32 px-6"
            >
                <div className="max-w-6xl w-full">
                    <RevealOnScroll animation="fade-up">
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC143C]/10 border border-[#DC143C]/30 rounded-full text-[#DC143C] text-sm font-medium mb-4">
                                <Play size={16} />
                                Interactive Experience
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                                Live FL Demo
                            </h2>
                            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                                Watch Federated Learning happen in real-time. Train models across 3 distributed nodes while monitoring every metric.
                            </p>
                        </div>
                    </RevealOnScroll>

                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <RevealOnScroll animation="fade-up" delay={0.2}>
                            <div className="space-y-6">
                                <div className="flex gap-4 items-start">
                                    <div className="w-12 h-12 bg-[#DC143C]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <BarChart3 size={24} className="text-[#DC143C]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-1">Real-Time Accuracy Graphs</h3>
                                        <p className="text-gray-500 text-sm">Watch training and validation accuracy climb with each FL round. Live updates every aggregation cycle.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="w-12 h-12 bg-[#DC143C]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Layers size={24} className="text-[#DC143C]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-1">Confusion Matrix</h3>
                                        <p className="text-gray-500 text-sm">Visualize classification performance across all 7 attack types plus benign traffic in real-time.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="w-12 h-12 bg-[#DC143C]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Skull size={24} className="text-[#DC143C]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-1">Attack Simulation</h3>
                                        <p className="text-gray-500 text-sm">Inject poisoning attacks into any node and observe how the FL system adapts and maintains accuracy.</p>
                                    </div>
                                </div>
                            </div>
                        </RevealOnScroll>

                        <RevealOnScroll animation="scale" delay={0.3}>
                            <div className="bg-[#13141b] border border-gray-800 rounded-2xl p-8 hover:border-gold/50 transition-all group">
                                <div className="text-center mb-6">
                                    <div className="w-20 h-20 bg-[#DC143C]/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <Play size={40} className="text-[#DC143C]" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">50 Training Rounds</h3>
                                    <p className="text-gray-400 text-sm">Complete FL training cycle with FedAvg aggregation</p>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-center mb-6">
                                    <div>
                                        <div className="text-2xl font-bold text-[#FFD700]">3</div>
                                        <div className="text-xs text-gray-500">Nodes</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-[#FFD700]">3</div>
                                        <div className="text-xs text-gray-500">Epochs/Round</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-[#FFD700]">~98%</div>
                                        <div className="text-xs text-gray-500">Target Accuracy</div>
                                    </div>
                                </div>
                                <Link
                                    to="/dashboard"
                                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#DC143C] text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-all hover:scale-105 shadow-lg shadow-[#DC143C]/30"
                                >
                                    Launch Demo
                                    <ArrowRight size={18} />
                                </Link>
                            </div>
                        </RevealOnScroll>
                    </div>
                </div>
            </section >

            {/* Section 9: Sentry IDS */}
            < section
                id="sentry"
                className="min-h-screen flex flex-col items-center justify-center py-20 px-6"
            >
                <div className="max-w-6xl w-full">
                    <RevealOnScroll animation="fade-up">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC143C]/10 border border-[#DC143C]/30 rounded-full text-[#DC143C] text-sm font-medium mb-4">
                                <Radar size={16} />
                                Real-Time Protection
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                                Sentry IDS
                            </h2>
                            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                                Deploy your trained FL model as a real-time Intrusion Detection System. Monitor live network traffic and detect attacks instantly.
                            </p>
                        </div>
                    </RevealOnScroll>

                    <div className="grid md:grid-cols-3 gap-4 mb-5">
                        <RevealOnScroll animation="scale" delay={0.1}>
                            <div className="bg-[#13141b] border border-gray-800 rounded-2xl p-5 text-center h-full hover:border-gold/50 transition-all group">
                                <div className="w-12 h-12 bg-[#DC143C]/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                    <Wifi size={24} className="text-[#DC143C]" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">NFStream Analysis</h3>
                                <p className="text-gray-500 text-sm">
                                    Captures and analyzes network flows in real-time using NFStream. Extracts 79 features per flow for ML inference.
                                </p>
                            </div>
                        </RevealOnScroll>

                        <RevealOnScroll animation="scale" delay={0.2}>
                            <div className="bg-[#13141b] border border-gray-800 rounded-2xl p-5 text-center h-full hover:border-gold/50 transition-all group">
                                <div className="w-12 h-12 bg-[#DC143C]/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                    <Brain size={24} className="text-[#DC143C]" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">ML Classification</h3>
                                <p className="text-gray-500 text-sm">
                                    Uses the trained global model to classify traffic into 8 categories: Benign, DDoS, DoS, Mirai, Recon, Spoofing, Web, and BruteForce.
                                </p>
                            </div>
                        </RevealOnScroll>

                        <RevealOnScroll animation="scale" delay={0.3}>
                            <div className="bg-[#13141b] border border-gray-800 rounded-2xl p-5 text-center h-full hover:border-gold/50 transition-all group">
                                <div className="w-12 h-12 bg-[#DC143C]/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                    <Mail size={24} className="text-[#DC143C]" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Email Alerts</h3>
                                <p className="text-gray-500 text-sm">
                                    Receive comprehensive security reports via email. Full attack history, system stats, and threat analysis in one click.
                                </p>
                            </div>
                        </RevealOnScroll>
                    </div>

                    <RevealOnScroll animation="fade-up" delay={0.4}>
                        <div className="bg-[#13141b] border border-gray-800 rounded-2xl p-6 hover:border-gold/50 transition-all">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white mb-2">System Monitoring</h3>
                                    <p className="text-gray-400 text-sm mb-4">
                                        Track CPU usage, RAM consumption, and network I/O in real-time.
                                        The Sentry dashboard shows live attack detections with source IPs and attack classifications.
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        <span className="px-3 py-1 bg-[#DC143C]/10 border border-[#DC143C]/30 rounded-full text-[#DC143C] text-xs">CPU Monitor</span>
                                        <span className="px-3 py-1 bg-[#DC143C]/10 border border-[#DC143C]/30 rounded-full text-[#DC143C] text-xs">RAM Usage</span>
                                        <span className="px-3 py-1 bg-[#DC143C]/10 border border-[#DC143C]/30 rounded-full text-[#DC143C] text-xs">Network I/O</span>
                                        <span className="px-3 py-1 bg-[#DC143C]/10 border border-[#DC143C]/30 rounded-full text-[#DC143C] text-xs">Attack Logs</span>
                                    </div>
                                </div>
                                <Link
                                    to="/sentry"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFD700] text-black font-bold text-sm uppercase tracking-wider rounded-lg transition-all hover:scale-105 shadow-lg shadow-[#FFD700]/30"
                                >
                                    Open Sentry
                                    <Shield size={18} />
                                </Link>
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>
            </section >

            {/* Section 10: Tech Stack */}
            < section
                id="tech"
                className="min-h-screen flex flex-col items-center justify-center py-32 px-6"
            >
                <div className="max-w-6xl w-full">
                    <RevealOnScroll animation="fade-up">
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC143C]/10 border border-[#DC143C]/30 rounded-full text-[#DC143C] text-sm font-medium mb-4">
                                <Code2 size={16} />
                                Under The Hood
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                                Technology Stack
                            </h2>
                            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                                Built with modern, production-ready technologies for reliable federated learning and network security.
                            </p>
                        </div>
                    </RevealOnScroll>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Frontend */}
                        <RevealOnScroll animation="scale" delay={0.1}>
                            <div className="bg-[#13141b] border border-gray-800 rounded-2xl p-6 h-full hover:border-gold/50 transition-all group">
                                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Code2 size={24} className="text-blue-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-3">Frontend</h3>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li className="flex items-center gap-2"><span className="text-blue-400">•</span> React 18</li>
                                    <li className="flex items-center gap-2"><span className="text-blue-400">•</span> Framer Motion</li>
                                    <li className="flex items-center gap-2"><span className="text-blue-400">•</span> Tailwind CSS</li>
                                    <li className="flex items-center gap-2"><span className="text-blue-400">•</span> Chart.js / Recharts</li>
                                    <li className="flex items-center gap-2"><span className="text-blue-400">•</span> Socket.IO Client</li>
                                </ul>
                            </div>
                        </RevealOnScroll>

                        {/* Backend */}
                        <RevealOnScroll animation="scale" delay={0.2}>
                            <div className="bg-[#13141b] border border-gray-800 rounded-2xl p-6 h-full hover:border-gold/50 transition-all group">
                                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Server size={24} className="text-green-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-3">Backend</h3>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li className="flex items-center gap-2"><span className="text-green-400">•</span> Python Flask</li>
                                    <li className="flex items-center gap-2"><span className="text-green-400">•</span> Flask-SocketIO</li>
                                    <li className="flex items-center gap-2"><span className="text-green-400">•</span> SQLite Database</li>
                                    <li className="flex items-center gap-2"><span className="text-green-400">•</span> JWT Authentication</li>
                                    <li className="flex items-center gap-2"><span className="text-green-400">•</span> SMTP Email</li>
                                </ul>
                            </div>
                        </RevealOnScroll>

                        {/* ML/FL */}
                        <RevealOnScroll animation="scale" delay={0.3}>
                            <div className="bg-[#13141b] border border-gray-800 rounded-2xl p-6 h-full hover:border-gold/50 transition-all group">
                                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Brain size={24} className="text-purple-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-3">ML / Federated</h3>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li className="flex items-center gap-2"><span className="text-purple-400">•</span> TensorFlow / Keras</li>
                                    <li className="flex items-center gap-2"><span className="text-purple-400">•</span> Flower (FL Framework)</li>
                                    <li className="flex items-center gap-2"><span className="text-purple-400">•</span> FedAvg Algorithm</li>
                                    <li className="flex items-center gap-2"><span className="text-purple-400">•</span> 128→64→32→1 DNN</li>
                                    <li className="flex items-center gap-2"><span className="text-purple-400">•</span> CIC-IoT-2023 Dataset</li>
                                </ul>
                            </div>
                        </RevealOnScroll>

                        {/* Network */}
                        <RevealOnScroll animation="scale" delay={0.4}>
                            <div className="bg-[#13141b] border border-gray-800 rounded-2xl p-6 h-full hover:border-gold/50 transition-all group">
                                <div className="w-12 h-12 bg-[#DC143C]/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Radar size={24} className="text-[#DC143C]" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-3">Network Analysis</h3>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li className="flex items-center gap-2"><span className="text-[#DC143C]">•</span> NFStream</li>
                                    <li className="flex items-center gap-2"><span className="text-[#DC143C]">•</span> Scapy</li>
                                    <li className="flex items-center gap-2"><span className="text-[#DC143C]">•</span> 79 Flow Features</li>
                                    <li className="flex items-center gap-2"><span className="text-[#DC143C]">•</span> Real-time Capture</li>
                                    <li className="flex items-center gap-2"><span className="text-[#DC143C]">•</span> Binary Classification IDS</li>
                                </ul>
                            </div>
                        </RevealOnScroll>
                    </div>

                    <RevealOnScroll animation="fade-up" delay={0.5}>
                        <div className="mt-8 text-center">
                            <p className="text-gray-500 text-sm">
                                All components work together to create a complete, privacy-preserving intrusion detection system.
                            </p>
                        </div>
                    </RevealOnScroll>
                </div>
            </section >



            {/* Toast Notification */}
            < Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.visible}
                onClose={() => setToast(t => ({ ...t, visible: false }))}
            />
        </div >
    );
};

export default HomePage;
