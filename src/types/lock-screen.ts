export interface LockScreenState {
  configured: boolean;
  locked: boolean;
  salt: string;
  verifier: string;
  iterations: number;
  configuredAt?: string;
}

export interface PersistedLockScreen {
  version: 1;
  locked: boolean;
  salt: string;
  verifier: string;
  iterations: number;
  configuredAt: string;
}
