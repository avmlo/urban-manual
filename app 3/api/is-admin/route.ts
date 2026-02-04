import { NextResponse } from 'next/server';
import { getUserFromRequest, AuthError } from '@/lib/adminAuth';

export async function POST(req: Request) {
  try {
    const { user } = await getUserFromRequest(req);
    const role = (user.app_metadata as Record<string, any> | null)?.role;
    return NextResponse.json({ isAdmin: role === 'admin' });
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}

