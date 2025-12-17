import React, { useEffect, useRef } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'error' | 'warning';
    buttonLabel?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    buttonLabel = 'Entendido'
}) => {
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Auto-focus the button when opened for accessibility
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => buttonRef.current?.focus(), 50);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'error': return <AlertCircle size={24} className="text-red-500" />;
            case 'success': return <CheckCircle size={24} className="text-emerald-500" />;
            case 'warning': return <AlertCircle size={24} className="text-amber-500" />;
            default: return <Info size={24} className="text-blue-500" />;
        }
    };

    const getHeaderColor = () => {
        switch (type) {
            case 'error': return 'bg-red-50 border-red-100 text-red-900';
            case 'success': return 'bg-emerald-50 border-emerald-100 text-emerald-900';
            case 'warning': return 'bg-amber-50 border-amber-100 text-amber-900';
            default: return 'bg-blue-50 border-blue-100 text-blue-900';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden scale-100 transition-transform">
                <div className={`p-4 border-b flex justify-between items-center ${getHeaderColor()}`}>
                    <div className="flex items-center gap-3">
                        {getIcon()}
                        <h3 className="font-bold text-lg">{title}</h3>
                    </div>
                </div>

                <div className="p-6">
                    <p className="text-gray-600 leading-relaxed text-center">
                        {message}
                    </p>
                </div>

                <div className="p-4 bg-gray-50 flex justify-center">
                    <button
                        ref={buttonRef}
                        onClick={onClose}
                        className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-900 text-white text-sm font-bold rounded-lg shadow-md transition-colors"
                    >
                        {buttonLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
