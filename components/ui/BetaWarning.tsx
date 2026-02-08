'use client';

import React, { useState } from 'react';

export default function BetaWarning() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-orange-500/10 border border-orange-500/50 backdrop-blur-md p-4 rounded-lg shadow-2xl shadow-orange-500/20 flex items-start gap-3">
                <div className="text-2xl pt-0.5">⚠️</div>
                <div className="flex-1">
                    <h4 className="text-orange-400 font-bold text-sm uppercase tracking-wider mb-1">
                        Beta Software
                    </h4>
                    <p className="text-orange-200/80 text-xs leading-relaxed">
                        DeepGrid is currently under active development.
                        <span className="block mt-1 font-medium text-orange-300">
                            Use at your own risk. Not recommended for significant capital production use yet.
                        </span>
                    </p>
                </div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-orange-400/50 hover:text-orange-400 transition-colors"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
