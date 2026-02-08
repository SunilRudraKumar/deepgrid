'use client';

export default function LoadingCard({ message }: { message: string }) {
    return (
        <div className="rounded-lg border border-white/5 bg-black/20 p-8 flex flex-col items-center justify-center min-h-[300px]">
            <div className="relative w-12 h-12 mb-4">
                {/* Simple CSS spinner without external deps */}
                <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin border-transparent"></div>
            </div>
            <div className="text-sm font-medium text-zinc-300 animate-pulse">
                {message}
            </div>
        </div>
    );
}
