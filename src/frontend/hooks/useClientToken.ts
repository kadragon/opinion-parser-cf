import { useState } from "react";

function generateToken(): string {
	if (crypto.randomUUID) return crypto.randomUUID();
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
	});
}

export function useClientToken(): string {
	const [token] = useState(() => {
		const key = "opinion-parser-client-token";
		let stored = localStorage.getItem(key);
		if (!stored) {
			stored = generateToken();
			localStorage.setItem(key, stored);
		}
		return stored;
	});
	return token;
}
