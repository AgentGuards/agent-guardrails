import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSiwsAndRedirectHome } from "@/lib/auth/siws-session";
import { useSiwsAuthStore } from "@/lib/stores/siws-auth";

describe("providers auth redirect helper", () => {
  beforeEach(() => {
    localStorage.clear();
    useSiwsAuthStore.getState().clearSignedIn();
  });

  it("clears local SIWS state before redirecting", () => {
    useSiwsAuthStore.getState().markSignedIn("Wallet11111111111111111111111111111111");
    const redirectMock = vi.fn();

    clearSiwsAndRedirectHome(redirectMock);

    expect(useSiwsAuthStore.getState().siwsWallet).toBeNull();
    expect(useSiwsAuthStore.getState().siwsSignedInAt).toBeNull();
    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});
