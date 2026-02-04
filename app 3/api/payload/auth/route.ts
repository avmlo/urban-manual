import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Custom authentication endpoint for Payload
 * Verifies Supabase authentication and returns user info
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin role
    const role = (session.user.app_metadata as Record<string, any> | null)?.role
    if (role !== 'admin') {
      return NextResponse.json(
        { message: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Return user info for Payload
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        role: role,
      },
      token: session.access_token,
    })
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Authentication failed', error: error.message },
      { status: 500 }
    )
  }
}

