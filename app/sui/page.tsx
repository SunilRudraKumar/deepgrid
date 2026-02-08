// app/page.tsx
'use client';

import dynamic from 'next/dynamic';

const DAppKitClientProvider = dynamic(
	() => import('@/src/config/DAppKitClientProvider').then((mod) => mod.DAppKitClientProvider),
	{ ssr: false },
);

const ConnectButton = dynamic(
	() => import('@/src/config//DAppKitClientProvider').then((mod) => mod.ConnectButton),
	{ ssr: false, loading: () => <button disabled>Loading...</button> },
);

export default function Home() {
	return (
		<DAppKitClientProvider>
			<main>
				<h1>My Sui dApp</h1>
				<ConnectButton />
			</main>
		</DAppKitClientProvider>
	);
}