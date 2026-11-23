import { authApi } from '@/lib/api/endpoints';
import { BudgetNative, NATIVE_OAUTH_CALLBACK_SCHEME, isNativeApp } from '@/lib/native/budgetNative';

export type OAuthProvider = 'github' | 'google';

export const OAUTH_REDIRECT_TARGET_KEY = 'oauth_redirect_target';

/**
 * Starts GitHub/Google sign-in.
 *
 * - Browser and PWA: navigate to the provider; Supabase returns to /auth/callback (unchanged).
 * - Native iOS app: Google refuses sign-in inside embedded web views, so the flow runs in the iOS
 *   sign-in sheet instead. Supabase returns to the app's URL scheme, and the token fragment is
 *   handed to the same /auth/callback page the website uses.
 *
 * In the native app a user closing the sheet rejects with code `CANCELED` (see `isNativeCancel`).
 */
export async function startOAuthSignIn(provider: OAuthProvider): Promise<void> {
  const getUrl = provider === 'github' ? authApi.getGitHubOAuthUrl : authApi.getGoogleOAuthUrl;
  sessionStorage.setItem(OAUTH_REDIRECT_TARGET_KEY, '/dashboard');

  if (!isNativeApp()) {
    const response = await getUrl();
    window.location.href = response.url;
    return;
  }

  const response = await getUrl('ios');
  const result = await BudgetNative.startAuthSession({
    url: response.url,
    callbackScheme: NATIVE_OAUTH_CALLBACK_SCHEME,
  });

  // Supabase puts tokens (or an error) in the fragment; some errors arrive as query parameters.
  const returned = new URL(result.url);
  const fragment = returned.hash || (returned.search ? `#${returned.search.slice(1)}` : '');
  window.location.replace(`/auth/callback${fragment}`);
}
