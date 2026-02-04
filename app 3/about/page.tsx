import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About | The Urban Manual',
  description: 'Learn about The Urban Manual and our mission to help you discover amazing places.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="w-full px-6 md:px-10 lg:px-12 py-20">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">About</h1>

          <div className="prose dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-gray-600 dark:text-gray-400">
                The Urban Manual helps you discover, save, and organize the best places to visit in cities around the world.
                We curate destinations that offer unique experiences—from hidden restaurants and local cafes to cultural sites and memorable stays.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">What We Do</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We build tools that make travel planning easier and more personal:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
                <li>Curated destination guides for major cities worldwide</li>
                <li>Personal collections to save and organize your favorite places</li>
                <li>Trip planning tools to build detailed itineraries</li>
                <li>Smart recommendations based on your preferences</li>
                <li>Location-based discovery to find places near you</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Our Approach</h2>
              <p className="text-gray-600 dark:text-gray-400">
                We focus on quality over quantity. Every destination in our guide is carefully selected and verified.
                We believe in minimal design, clear information, and tools that get out of your way so you can focus on discovering amazing places.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Get Involved</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We're always looking to grow our collection. You can help by:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
                <li>Submitting new places through our <Link href="/submit" className="underline hover:text-gray-900 dark:hover:text-white">submit page</Link></li>
                <li>Sharing feedback and suggestions</li>
                <li>Building your own collections and sharing them</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Contact</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Have questions or want to get in touch? Visit our <Link href="/contact" className="underline hover:text-gray-900 dark:hover:text-white">contact page</Link> or email us at <a href="mailto:hello@theurbanmanual.com" className="underline hover:text-gray-900 dark:hover:text-white">hello@theurbanmanual.com</a>.
              </p>
            </section>
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

