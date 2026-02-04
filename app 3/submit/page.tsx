import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Submit a Place | The Urban Manual',
  description: 'Submit a new place to The Urban Manual',
};

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="w-full px-6 md:px-10 lg:px-12 py-20">
        <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Submit a Place</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Help us grow our collection by suggesting amazing places to visit.
        </p>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">How to Submit</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            We're always looking to add new destinations to our guide. To submit a place:
          </p>
          
          <ol className="list-decimal pl-6 space-y-4 text-gray-700 dark:text-gray-300">
            <li>
              <strong>Find the place on Google Maps</strong> - Make sure the place exists and has accurate information
            </li>
            <li>
              <strong>Gather details</strong> - Collect the name, address, category, and any other relevant information
            </li>
            <li>
              <strong>Contact us</strong> - Send us an email with the place details and we'll review it for inclusion
            </li>
          </ol>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">What We're Looking For</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li>Restaurants, cafes, bars, and dining experiences</li>
            <li>Hotels, accommodations, and unique stays</li>
            <li>Museums, galleries, and cultural sites</li>
            <li>Parks, attractions, and activities</li>
            <li>Shops, markets, and retail experiences</li>
            <li>Any place that offers a unique travel experience</li>
          </ul>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
          <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Ready to submit a place? Contact us with the details:
          </p>
          <div className="space-y-2 text-gray-700 dark:text-gray-300">
            <p>
              <strong>Email:</strong> submit@urbanmanual.com
            </p>
            <p>
              <strong>Include:</strong> Place name, address, category, and why you think it should be included
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
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

