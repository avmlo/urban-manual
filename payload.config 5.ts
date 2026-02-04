import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import type { PayloadRequest } from 'payload'

/**
 * Check if the current user is authenticated via Supabase and has admin role
 * This integrates Payload with your existing Supabase authentication
 */
async function checkSupabaseAdmin(req: PayloadRequest): Promise<boolean> {
  try {
    // Try to get token from authorization header first (for API calls)
    const authHeader = req.headers?.get('authorization') || 
                      (req.headers as any)?.authorization ||
                      (typeof req.headers?.get === 'function' ? req.headers.get('authorization') : null)
    
    // Check if this is an API request
    const isAPIRequest = req.url?.includes('/api/') || false
    
    // For non-API requests (admin UI), allow through - middleware handles auth
    if (!isAPIRequest && !authHeader) {
      return true
    }

    // For API requests, we need proper authentication
    let token: string | null = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '')
    }

    // If no token and it's an API request, deny access
    if (!token && isAPIRequest) {
      console.warn('[Payload] No auth token found for API request')
      return false
    }

    // If no token and not API request, allow (middleware handles auth)
    if (!token) {
      return true
    }

    // Verify token with Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Payload] Supabase credentials not configured')
      return false
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.error('[Payload] Auth error:', error?.message || 'No user found')
      return false
    }

    // Check if user has admin role
    const role = (user.app_metadata as Record<string, any> | null)?.role
    const isAdmin = role === 'admin'
    
    if (!isAdmin) {
      console.warn('[Payload] User does not have admin role:', user.email)
    }
    
    return isAdmin
  } catch (error) {
    console.error('[Payload] Error checking Supabase auth:', error)
    return false
  }
}

/**
 * Get PostgreSQL connection string from environment variables
 * Supports multiple formats:
 * 1. Direct POSTGRES_URL or DATABASE_URL
 * 2. Constructed from Supabase URL + password
 */
function getPostgresConnectionString(): string {
  // First, try direct connection string
  if (process.env.POSTGRES_URL) {
    return process.env.POSTGRES_URL
  }
  
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  // If not available, try to construct from Supabase URL
  // This requires SUPABASE_DB_PASSWORD to be set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const dbPassword = process.env.SUPABASE_DB_PASSWORD

  if (supabaseUrl && dbPassword) {
    try {
      const url = new URL(supabaseUrl)
      // Extract project ref from Supabase URL (e.g., xyzabc123.supabase.co -> xyzabc123)
      const projectRef = url.hostname.split('.')[0]
      
      // Try connection pooling first (recommended for serverless)
      // If that doesn't work, fall back to direct connection
      const poolerUrl = `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
      
      // Also support direct connection (port 5432) if pooling isn't available
      const directUrl = `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`
      
      // Prefer pooling, but direct connection works too
      return poolerUrl
    } catch (error) {
      console.error('Error constructing PostgreSQL URL from Supabase URL:', error)
    }
  }

  // Fallback: return empty string (will cause error with helpful message)
  console.error(`
    ⚠️  PostgreSQL connection string not found!
    
    Please set one of the following environment variables:
    
    Option 1 (Recommended): Set POSTGRES_URL directly
      POSTGRES_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
    
    Option 2: Set SUPABASE_DB_PASSWORD (will construct from NEXT_PUBLIC_SUPABASE_URL)
      SUPABASE_DB_PASSWORD=your-database-password
    
    To get your connection string from Supabase:
    1. Go to https://supabase.com/dashboard
    2. Select your project
    3. Go to Settings → Database
    4. Copy the "Connection string" under "Connection pooling"
    5. Use the "Transaction" mode connection string (port 6543)
  `)
  
  return ''
}

export default buildConfig({
  // Use Supabase authentication instead of Payload's default
  // Payload admin UI will still work, but we protect it with Supabase
  admin: {
    user: 'users', // Minimal users collection for Payload internals
    // Note: Admin route is determined by Next.js file structure
    // app/payload/[[...segments]]/page.tsx serves at /payload
    meta: {
      titleSuffix: '- Urban Manual CMS',
    },
    // Custom authentication - we'll handle via middleware
    // Payload's admin UI requires a user collection, but we'll sync with Supabase
  },
  collections: [
    {
      slug: 'users',
      // Minimal user collection - only for Payload internals
      // Actual auth is handled by Supabase
      auth: true, // Enable auth for Payload internals, but we protect routes with Supabase
      access: {
        read: () => true,
        // Only allow reading - creation/updates handled by Supabase
        create: () => false,
        update: () => false,
        delete: () => false,
      },
      fields: [
        {
          name: 'email',
          type: 'email',
          required: true,
          unique: true,
        },
        {
          name: 'supabase_user_id',
          type: 'text',
          admin: {
            description: 'Linked Supabase user ID',
          },
        },
        {
          name: 'role',
          type: 'select',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
            { label: 'User', value: 'user' },
          ],
          defaultValue: 'user',
          required: true,
        },
      ],
    },
    {
      slug: 'destinations',
      admin: {
        useAsTitle: 'name',
        description: 'Manage destinations from Supabase. Changes sync to Supabase automatically.',
      },
      // Use existing Supabase table - don't create new one
      dbName: 'destinations',
      access: {
        // Access control based on Supabase auth
        read: async ({ req }) => {
          // Check Supabase auth via request
          return await checkSupabaseAdmin(req)
        },
        create: async ({ req }) => {
          return await checkSupabaseAdmin(req)
        },
        update: async ({ req }) => {
          return await checkSupabaseAdmin(req)
        },
        delete: async ({ req }) => {
          return await checkSupabaseAdmin(req)
        },
      },
      hooks: {
        afterChange: [
          async ({ doc, operation, req }: { doc: any; operation: 'create' | 'update'; req: any }) => {
            // Sync changes to Supabase after Payload operations
            try {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
              const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
              
              if (!supabaseUrl || !supabaseKey) {
                console.warn('[Payload] Supabase credentials not found, skipping sync')
                return
              }

              // Import Supabase client dynamically
              const { createClient } = await import('@supabase/supabase-js')
              const supabase = createClient(supabaseUrl, supabaseKey)

              // Map Payload fields to Supabase columns
              const supabaseData: any = {
                name: doc.name,
                slug: doc.slug,
                city: doc.city,
                category: doc.category,
                description: doc.description || null,
                content: doc.content ? (typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content)) : null,
                image: doc.image || null,
                latitude: doc.latitude || null,
                longitude: doc.longitude || null,
                michelin_stars: doc.michelin_stars || 0,
                crown: doc.crown || false,
                rating: doc.rating || null,
                price_level: doc.price_level || null,
              }

              if (operation === 'create') {
                const { error } = await supabase
                  .from('destinations')
                  .insert([supabaseData])
                
                if (error) {
                  console.error('[Payload] Error syncing to Supabase (create):', error)
                } else {
                  console.log(`[Payload] ✅ Synced new destination "${doc.name}" to Supabase`)
                }
              } else if (operation === 'update') {
                const { error } = await supabase
                  .from('destinations')
                  .update(supabaseData)
                  .eq('slug', doc.slug)
                
                if (error) {
                  console.error('[Payload] Error syncing to Supabase (update):', error)
                } else {
                  console.log(`[Payload] ✅ Synced updated destination "${doc.name}" to Supabase`)
                }
              }
            } catch (error) {
              console.error('[Payload] Error in afterChange hook:', error)
            }
          },
        ],
        afterDelete: [
          async ({ doc, req }: { doc: any; req: any }) => {
            // Sync deletion to Supabase
            try {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
              const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
              
              if (!supabaseUrl || !supabaseKey) {
                console.warn('[Payload] Supabase credentials not found, skipping sync')
                return
              }

              const { createClient } = await import('@supabase/supabase-js')
              const supabase = createClient(supabaseUrl, supabaseKey)

              const { error } = await supabase
                .from('destinations')
                .delete()
                .eq('slug', doc.slug)
              
              if (error) {
                console.error('[Payload] Error syncing deletion to Supabase:', error)
              } else {
                console.log(`[Payload] ✅ Synced deletion of "${doc.name}" to Supabase`)
              }
            } catch (error) {
              console.error('[Payload] Error in afterDelete hook:', error)
            }
          },
        ],
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
        },
        {
          name: 'city',
          type: 'text',
          required: true,
        },
        {
          name: 'category',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'content',
          type: 'richText',
          editor: lexicalEditor(),
        },
        {
          name: 'image',
          type: 'text', // Store URL string, not upload relation
          admin: {
            description: 'Image URL from Supabase',
          },
        },
        {
          name: 'latitude',
          type: 'number',
        },
        {
          name: 'longitude',
          type: 'number',
        },
        {
          name: 'michelin_stars',
          type: 'number',
          min: 0,
          max: 3,
        },
        {
          name: 'crown',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'rating',
          type: 'number',
          min: 0,
          max: 5,
        },
        {
          name: 'price_level',
          type: 'number',
          min: 1,
          max: 4,
        },
      ],
    },
    {
      slug: 'media',
      access: {
        read: () => true,
      },
      upload: true,
      fields: [
        {
          name: 'alt',
          type: 'text',
        },
      ],
    },
  ],
  db: postgresAdapter({
    pool: {
      connectionString: getPostgresConnectionString(),
    },
  }),
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(process.cwd(), 'payload-types.ts'),
  },
})

