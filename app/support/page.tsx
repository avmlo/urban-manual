import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support | The Urban Manual",
  description:
    "Get help with The Urban Manual iOS app. Find answers to common questions, contact support, and access our privacy policy.",
};

export default function SupportPage() {
  return (
    <article className="min-h-screen" aria-labelledby="support-title">
      <div className="px-6 md:px-10 py-20">
        <div className="max-w-3xl mx-auto">
          <h1
            id="support-title"
            className="text-4xl md:text-5xl font-bold mb-4 text-black dark:text-white"
          >
            Support
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-12">
            The Urban Manual is a curated travel guide featuring 897+
            destinations worldwide. Discover, save, and organize the best places
            to visit with AI-powered recommendations, interactive maps, and
            personalized trip planning.
          </p>

          <div className="space-y-6">
            {/* Contact Section */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">
                Contact Us
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Having trouble or need help? Reach out to our support team and
                we&apos;ll get back to you as soon as possible.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-3">
                Email:{" "}
                <a
                  href="mailto:support@urbanmanual.co"
                  className="underline hover:text-black dark:hover:text-white transition-colors"
                >
                  support@urbanmanual.co
                </a>
              </p>
            </div>

            {/* FAQ Section */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
                Frequently Asked Questions
              </h2>
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-medium text-black dark:text-white mb-1">
                    How do I create an account?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    You can sign up using your Google or Apple account. Tap the
                    profile icon and follow the prompts to get started.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-black dark:text-white mb-1">
                    How do I save a destination?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    Tap the bookmark icon on any destination to save it to your
                    collection. You can organize saved places into custom
                    collections from your profile.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-black dark:text-white mb-1">
                    Can I use the app offline?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    The app requires an internet connection to load destination
                    data and maps. We recommend downloading any information you
                    need before heading to areas with limited connectivity.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-black dark:text-white mb-1">
                    How do I delete my account?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    You can request account deletion from Account &rarr;
                    Settings within the app. Your data will be permanently
                    removed. For assistance, contact our support email above.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-black dark:text-white mb-1">
                    The app isn&apos;t working correctly. What should I do?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    Try closing and reopening the app, or check for updates in
                    the App Store. If the issue persists, please contact us with
                    a description of the problem and your device model.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy Policy */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-3 text-black dark:text-white">
                Privacy Policy
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Your privacy matters to us. Read our full privacy policy to
                learn how we collect, use, and protect your data.
              </p>
              <p className="text-sm mt-3">
                <Link
                  href="/privacy"
                  className="underline text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  View Privacy Policy
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              &larr; Back to home
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
