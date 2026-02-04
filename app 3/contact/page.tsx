import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact | The Urban Manual',
  description: 'Get in touch with The Urban Manual team.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="w-full px-6 md:px-10 lg:px-12 py-20">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">Contact</h1>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We'd love to hear from you. Whether you have questions, feedback, or suggestions, we're here to help.
              </p>
            </section>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
              <h3 className="text-xl font-semibold mb-4">General Inquiries</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                For general questions, feedback, or support:
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <a href="mailto:hello@theurbanmanual.com" className="underline hover:text-gray-900 dark:hover:text-white">
                  hello@theurbanmanual.com
                </a>
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
              <h3 className="text-xl font-semibold mb-4">Submit a Place</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Have a great place you'd like to see in our guide?
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <a href="mailto:submit@theurbanmanual.com" className="underline hover:text-gray-900 dark:hover:text-white">
                  submit@theurbanmanual.com
                </a>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Or visit our <Link href="/submit" className="underline hover:text-gray-900 dark:hover:text-white">submit page</Link> for more information.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
              <h3 className="text-xl font-semibold mb-4">Privacy & Data</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                For privacy-related questions or data requests:
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <a href="mailto:privacy@theurbanmanual.com" className="underline hover:text-gray-900 dark:hover:text-white">
                  privacy@theurbanmanual.com
                </a>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                You can also manage your data directly from your <Link href="/account" className="underline hover:text-gray-900 dark:hover:text-white">account settings</Link>.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
              <h3 className="text-xl font-semibold mb-4">Response Time</h3>
              <p className="text-gray-700 dark:text-gray-300">
                We aim to respond to all inquiries within 48 hours. For urgent matters, please include "URGENT" in your subject line.
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

