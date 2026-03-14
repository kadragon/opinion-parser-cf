import { type ReactNode, createContext, useContext } from "react";
import { useClientToken } from "../hooks/useClientToken";
import { useTheme } from "../hooks/useTheme";

interface AppContextValue {
	clientToken: string;
	theme: "light" | "dark";
	toggleTheme: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
	const clientToken = useClientToken();
	const { theme, toggleTheme } = useTheme();

	return (
		<AppContext.Provider value={{ clientToken, theme, toggleTheme }}>
			{children}
		</AppContext.Provider>
	);
}

export function useAppContext(): AppContextValue {
	const ctx = useContext(AppContext);
	if (!ctx) throw new Error("useAppContext must be used within AppProvider");
	return ctx;
}
