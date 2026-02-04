export default function PrivacyPage() {
  return (
    <div className="w-full px-6 md:px-10 lg:px-12 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">Introduction</h2>
            <p className="text-gray-600 dark:text-gray-400">
              The Urban Manual (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) helps you discover, save, and organize destinations.
              This Privacy Policy describes the personal information we process when you visit theurbanmanual.com, use our
              web and mobile applications, or interact with our communications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
            <div className="space-y-3 text-gray-600 dark:text-gray-400">
              <p>We collect information you provide directly to us, including:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Account details such as name, email address, password, and profile preferences.</li>
                <li>Content you create inside the product (saved destinations, collections, lists, trips, notes, and activity history).</li>
                <li>Communications you send to our team (support inquiries, feedback, or survey responses).</li>
              </ul>
              <p>
                We automatically collect certain technical information such as device type, browser, IP address, referring URL,
                and usage patterns (pages viewed, actions taken, timestamps). When you enable location-based features like
                &ldquo;Near Me&rdquo;, we temporarily collect your coarse device location to show relevant places.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">We use personal information to:</p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
              <li>Authenticate you, maintain your account, and sync your saved content across devices.</li>
              <li>Power core product flows such as discovery, saved places, itineraries, trips, and personalized recommendations.</li>
              <li>Send product updates, transactional messages, and respond to your requests.</li>
              <li>Monitor performance, detect abuse, and maintain the reliability and safety of our systems.</li>
              <li>Analyze aggregated usage trends to plan new features and improve the experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">How We Share Information</h2>
            <div className="space-y-3 text-gray-600 dark:text-gray-400">
              <p>We do not sell your personal information. We share it only with:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  Trusted service providers who support our infrastructure (Supabase for authentication/database, hosting providers,
                  transactional email vendors, and analytics tools). These partners process data solely on our behalf under strict agreements.
                </li>
                <li>Other parties when required by law, to respond to legal process, to protect our rights, or to prevent fraud or abuse.</li>
                <li>
                  Successors in the event of a merger, acquisition, or asset sale. We will notify you of any change in control that affects your data.
                </li>
              </ul>
              <p>We may share aggregated or anonymized insights that no longer identify you.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Cookies & Tracking</h2>
            <p className="text-gray-600 dark:text-gray-400">
              We use first-party cookies and local storage to keep you signed in, remember preferences, and understand how the product performs.
              You can control cookies through your browser settings, though disabling them may limit core functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Location Data</h2>
            <p className="text-gray-600 dark:text-gray-400">
              If you allow location permissions, we use your approximate device location to show nearby destinations and tailor suggestions.
              Location data stays on our servers long enough to return relevant results and is not stored with your profile unless you save a place.
              You can disable sharing by turning off location access in your device or browser settings at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Data Retention</h2>
            <div className="space-y-3 text-gray-600 dark:text-gray-400">
              <p>
                We retain account data while your profile remains active so that your saved places, trips, and history stay available across devices.
                If you delete specific content, it is removed from active systems immediately and from encrypted backups within 30 days.
              </p>
              <p>
                If you request full account deletion, we purge your saved data and Supabase authentication record as soon as the queued job finishes.
                Logs referencing your email are minimized to the extent needed for security and audit obligations.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Data Export & Deletion Requests</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You can manage your data from <strong>Account → Settings</strong>. Every request is logged in Supabase, processed by our background worker,
              and confirmed via email.
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
              <li>
                <strong>Export:</strong> We compile your profile, saved/visited places, collections, trips, and interactions, then email a secure download link—typically within 24 hours.
              </li>
              <li>
                <strong>Deletion:</strong> We permanently remove your account, purge saved content, and delete the associated Supabase auth record. This action cannot be undone.
              </li>
              <li>
                <strong>Support:</strong> If you do not receive confirmation within 72 hours, contact <a className="underline" href="mailto:privacy@theurbanmanual.com">privacy@theurbanmanual.com</a> with your account email.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Your Rights & Choices</h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
              <li>Access, correct, or update your profile information directly within your account.</li>
              <li>Request a copy of your data or deletion of your account as described above.</li>
              <li>Opt out of marketing emails by using the unsubscribe link or adjusting notification settings.</li>
              <li>Disable cookies or location services at the device level.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Security</h2>
            <p className="text-gray-600 dark:text-gray-400">
              We secure your information using HTTPS encryption, encrypted storage provided by Supabase, role-based access controls, and continuous monitoring.
              While no online service can guarantee absolute security, we regularly review safeguards and limit data access to team members who need it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Children</h2>
            <p className="text-gray-600 dark:text-gray-400">
              The Urban Manual is not directed to children under 16, and we do not knowingly collect personal information from them.
              If you believe we have done so, please contact us so we can delete the information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Questions or concerns about this Privacy Policy can be sent to <a className="underline" href="mailto:privacy@theurbanmanual.com">privacy@theurbanmanual.com</a>.
            </p>
          </section>

          <section>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
