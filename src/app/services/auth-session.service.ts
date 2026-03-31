import { Injectable, computed, signal } from '@angular/core';

export interface AuthSessionUser {
  email?: string;
  name?: string;
  picture?: string;
}

interface SessionResponse {
  authenticated?: boolean;
  user?: AuthSessionUser;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  readonly user = signal<AuthSessionUser | null>(null);
  readonly isLoading = signal(false);
  readonly isAuthenticated = computed(() => this.user() !== null);

  async loadSession(sessionApiUrl: string): Promise<void> {
    this.isLoading.set(true);

    try {
      const response = await fetch(sessionApiUrl, {
        credentials: 'include',
      });

      if (!response.ok) {
        this.user.set(null);
        return;
      }

      const payload = (await response.json()) as SessionResponse;
      const sessionUser = payload.user;

      if (!payload.authenticated || !sessionUser || typeof sessionUser.name !== 'string') {
        this.user.set(null);
        return;
      }

      this.user.set({
        email: sessionUser.email,
        name: sessionUser.name,
        picture:
          typeof sessionUser.picture === 'string' && sessionUser.picture.length > 0
            ? sessionUser.picture
            : undefined,
      });
    } catch {
      this.user.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }
}
