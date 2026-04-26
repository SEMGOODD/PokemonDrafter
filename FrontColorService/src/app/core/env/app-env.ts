import { InjectionToken } from '@angular/core';

export type TeamColor = 'red' | 'blue' | 'neutral';

export interface AppEnv {
  COLOR: TeamColor;
  GATEWAY_URL: string;
  KEYCLOAK_URL: string;
  KEYCLOAK_REALM: string;
  KEYCLOAK_CLIENT_ID: string;
  FRONT_GENERAL_URL: string;
  CHAT_WS_URL?: string;
}

declare global {
  interface Window {
    __env__?: AppEnv;
  }
}

export const APP_ENV = new InjectionToken<AppEnv>('APP_ENV');

export function loadAppEnv(): AppEnv {
  const env = window.__env__;
  if (!env) {
    throw new Error('window.__env__ not loaded. Ensure env.js is included in index.html before main.js.');
  }
  return env;
}
