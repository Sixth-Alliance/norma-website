import { describe, it, expect } from "vitest";
import { getAuthToken, getCartToken, setCartToken, TokenManager } from "../lib/tokens";

describe("token utilities", () => {
	it("expose safe getters in non-browser env", () => {
		expect(getAuthToken()).toBeNull();
		expect(getCartToken()).toBeNull();
	});

	it("stores cart token via TokenManager without throwing", () => {
		TokenManager.setCartToken(null);
		expect(() => TokenManager.setAccessToken("value" as any)).not.toThrow();
		expect(getCartToken()).toBeNull();
		setCartToken(null);
	});
});
