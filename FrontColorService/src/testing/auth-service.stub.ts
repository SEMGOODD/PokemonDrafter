import { AuthService } from '../app/core/auth/auth.service';

export const STUB_ACCESS_TOKEN = 'stub-access-token';

// Complete AuthService double: PageFrameComponent calls isLoggedIn and getPlayerId on every page.
export function createAuthServiceStub(playerId: string | null): AuthService {
  return {
    getToken: (): string | null => (playerId !== null ? STUB_ACCESS_TOKEN : null),
    isLoggedIn: (): boolean => playerId !== null,
    getPlayerId: (): string | null => playerId
  };
}
