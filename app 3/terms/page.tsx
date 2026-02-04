import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | The Urban Manual',
  description: 'Terms of Service for The Urban Manual',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="w-full px-6 md:px-10 lg:px-12 py-20">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              By accessing and using The Urban Manual, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Permission is granted to temporarily access the materials on The Urban Manual for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to reverse engineer any software contained on The Urban Manual</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Content</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You are responsible for any content you submit to The Urban Manual. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and distribute your content.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Disclaimer</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              The materials on The Urban Manual are provided on an 'as is' basis. The Urban Manual makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Limitations</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              In no event shall The Urban Manual or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on The Urban Manual.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Revisions</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              The Urban Manual may revise these terms of service at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Contact Information</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              If you have any questions about these Terms of Service, please contact us.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

