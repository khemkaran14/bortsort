/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Google OAuth "Web application" client id (also used on Android). Empty = no Google button. */
  readonly VITE_GOOGLE_WEB_CLIENT_ID?: string;
  /** Google OAuth iOS client id (iPhone builds). */
  readonly VITE_GOOGLE_IOS_CLIENT_ID?: string;
}
