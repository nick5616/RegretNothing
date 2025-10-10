import { auth } from '@/auth';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error('Authentication required');
  }
  return session;
}

export async function getAuthenticatedUser() {
  const session = await auth();
  return session?.user || null;
}