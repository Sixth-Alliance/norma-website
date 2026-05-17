import { describe, it, expect, beforeAll } from "vitest";
import { useCartStore } from "../store/CartStore";

const createMemoryStorage = () => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
};

beforeAll(() => {
	const memoryStorage = createMemoryStorage();
	Object.defineProperty(global, "localStorage", {
		value: memoryStorage,
		writable: true,
	});
	Object.defineProperty(global, "window", {
		value: {
			localStorage: memoryStorage,
			location: { protocol: "https:" },
		},
		writable: true,
	});
	Object.defineProperty(global, "document", {
		value: { cookie: "" },
		writable: true,
	});
});

describe("useCartStore", () => {
	it("initializes with default state", () => {
		const state = useCartStore.getState();
		expect(state.items).toEqual([]);
		expect(state.backendCartId).toBeNull();
		expect(typeof state.addItem).toBe("function");
		expect(typeof state.removeItem).toBe("function");
	});
});
