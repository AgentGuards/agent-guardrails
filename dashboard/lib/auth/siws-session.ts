import { useSiwsAuthStore } from "@/lib/stores/siws-auth";

export function clearSiwsAndRedirectHome(redirect: (url: string) => void = (url) => window.location.assign(url)): void {
  if (typeof window === "undefined") return;
  useSiwsAuthStore.getState().clearSignedIn();
  redirect("/");
}

/** @deprecated Use clearSiwsAndRedirectHome */
export const clearSiwsAndRedirectToSignin = clearSiwsAndRedirectHome;
