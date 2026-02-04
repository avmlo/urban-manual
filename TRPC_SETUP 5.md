# TRPC Setup Guide

## ⚠️ Required Packages

Before using TRPC, install these packages:

```bash
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next @tanstack/react-query zod
```

Or with yarn:

```bash
yarn add @trpc/server @trpc/client @trpc/react-query @trpc/next @tanstack/react-query zod
```

## 📁 Structure

The TRPC setup follows this structure:

```
server/
  ├── context.ts          # TRPC context with Supabase client
  ├── trpc.ts             # Base TRPC setup (router, procedures)
  └── routers/
      ├── _app.ts         # Main app router
      └── ai.ts           # AI chat router

lib/trpc/
  ├── client.ts           # TRPC React client
  └── provider.tsx        # TRPC provider component

app/api/trpc/
  └── [trpc]/route.ts     # Next.js API route handler
```

## 🔄 Integration with Existing API

The existing `/api/conversation/[user_id]/route.ts` can continue to work alongside TRPC. The TRPC setup provides:

- Type-safe API calls
- Better error handling
- Automatic request batching
- React Query integration for caching

## 📝 Next Steps

1. Install packages (see above)
2. Run migrations (025_conversation_tables.sql if not already done)
3. Test the TRPC endpoint
4. Update chat components to use TRPC client

