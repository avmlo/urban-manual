import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 px-6">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-light text-black dark:text-white mb-4">404</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          The page you're looking for doesn't exist.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}

