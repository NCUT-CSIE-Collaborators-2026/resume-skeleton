import { Injectable, computed, signal } from '@angular/core';

export interface AuthSessionUser {
  email?: string;
  name?: string;
  picture?: string;
}

interface SessionResponse {
  authenticated?: boolean;
  user?: AuthSessionUser;
  reason?: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  readonly user = signal<AuthSessionUser | null>(null);
  readonly isLoading = signal(false);
  readonly isAuthenticated = computed(() => this.user() !== null);

  async loadSession(
    sessionApiUrl: string,
    options: { retries?: number; retryDelayMs?: number } = {},
  ): Promise<void> {
    const retries = Math.max(0, options.retries ?? 0);
    const retryDelayMs = Math.max(0, options.retryDelayMs ?? 250);

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const isLastAttempt = attempt === retries;
      const completed = await this.loadSessionOnce(sessionApiUrl, isLastAttempt);
      if (completed) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  private async loadSessionOnce(
    sessionApiUrl: string,
    isLastAttempt: boolean,
  ): Promise<boolean> {
    this.isLoading.set(true);

    try {
      const response = await fetch(sessionApiUrl, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (isLastAttempt) {
          console.warn('[auth-session] request failed', {
            status: response.status,
            url: sessionApiUrl,
          });
        }
        this.user.set(null);
        return true;
      }

      const payload = (await response.json()) as SessionResponse;
      const sessionUser = payload.user;

      if (!payload.authenticated || !sessionUser) {
        if (isLastAttempt) {
          console.warn('[auth-session] authenticated=false', {
            reason: payload.reason,
            message: payload.message,
          });
        }
        this.user.set(null);
        return true;
      }

      const normalizedName =
        typeof sessionUser.name === 'string' && sessionUser.name.trim().length > 0
          ? sessionUser.name.trim()
          : typeof sessionUser.email === 'string' && sessionUser.email.trim().length > 0
            ? sessionUser.email.trim()
            : null;

      if (!normalizedName) {
        if (isLastAttempt) {
          console.warn('[auth-session] missing user identity fields', {
            hasEmail: typeof sessionUser.email === 'string' && sessionUser.email.length > 0,
            hasName: typeof sessionUser.name === 'string' && sessionUser.name.length > 0,
          });
        }
        this.user.set(null);
        return true;
      }

      this.user.set({
        email: sessionUser.email,
        name: normalizedName,
        picture:
          typeof sessionUser.picture === 'string' && sessionUser.picture.length > 0
            ? sessionUser.picture
            : undefined,
      });
      return true;
    } catch {
      if (isLastAttempt) {
        console.warn('[auth-session] network or parsing error');
      }
      this.user.set(null);
      return true;
    } finally {
      this.isLoading.set(false);
    }

    return false;
  }
}
