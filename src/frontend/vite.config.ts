import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	root: "src/frontend",
	plugins: [react({ jsxImportSource: "react" })],
	build: {
		outDir: "../../dist/frontend",
		emptyOutDir: true,
	},
	server: {
		proxy: {
			"/api": "http://localhost:8787",
		},
	},
});
