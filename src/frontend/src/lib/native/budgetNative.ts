/**
 * Bridge to the native iOS shell (src/mobile). Everything here is a no-op or unused in normal
 * browsers and the PWA: call sites check `isNativeApp()` first.
 *
 * `BudgetNative` is the app's own Capacitor plugin, implemented in
 * src/mobile/ios/App/App/BudgetNativePlugin.swift. Keep the two in sync.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

/** URL scheme the native app catches at the end of the OAuth sign-in sheet. Matches the backend. */
export const NATIVE_OAUTH_CALLBACK_SCHEME = 'com.ondrejkutil.budget';

/** Native settings, stored on the device (see src/mobile/ios/App/App/AppSettings.swift). */
export interface NativeAppSettings {
  lockEnabled: boolean;
  /** Seconds in the background before Face ID is asked again; 0 = every time. */
  lockTimeoutSeconds: number;
  /** Web view zoom, like Safari's page zoom (1 = 100 %). */
  pageZoom: number;
  biometry: 'faceID' | 'touchID' | 'none';
}

export interface BudgetNativePlugin {
  /**
   * Opens `url` in the iOS sign-in sheet (ASWebAuthenticationSession) and resolves with the URL
   * the provider finally redirected to. Rejects with code `CANCELED` when the user closes the sheet.
   */
  startAuthSession(options: { url: string; callbackScheme: string }): Promise<{ url: string }>;
  /** `light` = light text, for dark backgrounds. */
  setStatusBarStyle(options: { style: 'light' | 'dark' }): Promise<void>;
  getAppSettings(): Promise<NativeAppSettings>;
  /**
   * Updates any subset of the settings and resolves with all of them. Turning the lock off asks
   * for Face ID first and rejects with code `CANCELED` if that fails.
   */
  setAppSettings(
    options: Partial<Pick<NativeAppSettings, 'lockEnabled' | 'lockTimeoutSeconds' | 'pageZoom'>>,
  ): Promise<NativeAppSettings>;
}

export const BudgetNative = registerPlugin<BudgetNativePlugin>('BudgetNative');

/** True only inside the native iOS app, never in a browser or the installed PWA. */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

export const isNativeCancel = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'CANCELED';
