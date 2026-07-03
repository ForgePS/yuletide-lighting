import type { FirebaseError } from 'firebase/app';

export function authErrorMessage(error: unknown, fallback: string) {
  const code = (error as FirebaseError | undefined)?.code;
  switch (code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support for help.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Use Forgot password if you need to reset it.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Sign in or reset your password.';
    case 'auth/weak-password':
      return 'Choose a stronger password (at least 8 characters).';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return fallback;
  }
}
