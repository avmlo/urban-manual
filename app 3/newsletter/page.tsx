import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Newsletter | The Urban Manual',
  description: 'Subscribe to The Urban Manual newsletter for curated destination guides and travel insights.',
};

export default function NewsletterPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="w-full px-6 md:px-10 lg:px-12 py-20">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">Newsletter</h1>

          <div className="space-y-8">
            <section>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Stay updated with curated destination guides, travel insights, and new features from The Urban Manual.
              </p>
            </section>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
              <h2 className="text-2xl font-semibold mb-4">What to Expect</h2>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li>Weekly curated guides to new cities and destinations</li>
                <li>Featured collections and hidden gems</li>
                <li>Travel tips and planning insights</li>
                <li>Updates on new features and improvements</li>
                <li>Exclusive content for subscribers</li>
              </ul>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
              <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Our newsletter is currently in development. We're working on creating something special for our subscribers.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                In the meantime, you can stay connected by following us or checking back soon. We'll announce when the newsletter is ready!
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
              <h2 className="text-2xl font-semibold mb-4">Get Notified</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Want to be notified when our newsletter launches? Send us an email:
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <a href="mailto:newsletter@theurbanmanual.com" className="underline hover:text-gray-900 dark:hover:text-white">
                  newsletter@theurbanmanual.com
                </a>
              </p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
            <Link 
              href="/"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

