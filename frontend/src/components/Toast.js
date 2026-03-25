import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const Toast = ({ message, type = 'success', isVisible, onClose, duration = 3000 }) => {
    useEffect(() => {
        if (isVisible && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle size={22} className="text-primary" />;
            case 'error':
                return <XCircle size={22} className="text-red-500" />;
            case 'warning':
                return <AlertCircle size={22} className="text-yellow-500" />;
            default:
                return <CheckCircle size={22} className="text-primary" />;
        }
    };

    const getBorderColor = () => {
        switch (type) {
            case 'success':
                return 'border-primary/30';
            case 'error':
                return 'border-red-500/30';
            case 'warning':
                return 'border-yellow-500/30';
            default:
                return 'border-primary/30';
        }
    };

    return (
        <div className="fixed top-6 right-6 z-50 animate-slide-in">
            <div className={`flex items-center gap-3 bg-[#0a1f1a] border ${getBorderColor()} rounded-xl px-5 py-4 shadow-2xl shadow-black/50 min-w-[280px] max-w-md`}>
                {getIcon()}
                <p className="text-white font-medium flex-1">{message}</p>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors p-1"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

export default Toast;
