import React from 'react';
import { type SVGProps } from 'react';

interface ComingSoonProps {
    title: string;
    description: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
            </div>

            <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
                {title} <span className="text-blue-400">Coming Soon</span>
            </h1>

            <p className="text-gray-400 max-w-md text-lg leading-relaxed">
                {description}
            </p>

            <div className="mt-8 flex gap-3">
                <div className="h-1 w-2 bg-blue-500/50 rounded-full animate-pulse delay-0" />
                <div className="h-1 w-2 bg-blue-500/50 rounded-full animate-pulse delay-150" />
                <div className="h-1 w-2 bg-blue-500/50 rounded-full animate-pulse delay-300" />
            </div>
        </div>
    );
}
