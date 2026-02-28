'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronUp } from 'lucide-react';

const sections = [
  { id: 'introduction', title: 'Introduction' },
  { id: 'data-we-collect', title: 'Data We Collect' },
  { id: 'how-we-use', title: 'How We Use Data' },
  { id: 'third-party-services', title: 'Third-Party Services' },
  { id: 'data-storage-security', title: 'Data Storage & Security' },
  { id: 'data-sharing', title: 'Data Sharing' },
  { id: 'user-rights', title: 'User Rights' },
  { id: 'children', title: "Children's Privacy" },
  { id: 'policy-updates', title: 'Policy Updates' },
  { id: 'contact', title: 'Contact Information' },
];

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector('header');
      let headerBottom = 120; // fallback
      
      if (header) {
        const headerTop = header.offsetTop;
        const headerHeight = header.offsetHeight;
        headerBottom = headerTop + headerHeight;
      }
      
      const scrollPosition = window.scrollY + headerBottom + 100;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const element = sectionRefs.current[section.id];
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = sectionRefs.current[id];
    if (element) {
      // Calculate header bottom position (including margin-top)
      const header = document.querySelector('header');
      let headerBottom = 120; // fallback
      
      if (header) {
        // Get the header's position from top of document
        const headerTop = header.offsetTop;
        const headerHeight = header.offsetHeight;
        headerBottom = headerTop + headerHeight;
      }
      
      const offset = headerBottom + 24; // Add extra spacing below header
      const elementPosition = element.offsetTop;
      const offsetPosition = Math.max(0, elementPosition - offset);

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Large Centered Title */}
      <div className="px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-normal text-center text-black dark:text-white mb-16 md:mb-20">
            Privacy Policy
          </h1>

          {/* Two-Column Layout */}
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-20">
            {/* Left Sidebar - Navigation */}
            <aside className="lg:w-56 flex-shrink-0">
              <div className="sticky top-24">
                <nav className="space-y-0.5">
                  {sections.map((section, index) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-0 py-2.5 text-xs tracking-wide transition-colors flex items-center justify-between ${
                        activeSection === section.id
                          ? 'text-black dark:text-white'
                          : 'text-gray-500 dark:text-gray-500 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <span className={activeSection === section.id ? 'font-medium' : ''}>{section.title}</span>
                      {activeSection === section.id && (
                        <ChevronUp className="h-3 w-3 text-black dark:text-white" />
                      )}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 max-w-3xl">
              <div className="space-y-16 md:space-y-20">
                {/* Introduction */}
                <section
                  id="introduction"
                  ref={(el) => { sectionRefs.current['introduction'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Introduction</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>
                      Urban Manual (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is a curated travel guide app that helps you discover, save, and plan trips to destinations worldwide.
                      This Privacy Policy describes the personal information we collect when you use the Urban Manual iOS app, visit www.urbanmanual.co,
                      or interact with our services.
                    </p>
                  </div>
                </section>

                {/* Data We Collect */}
                <section
                  id="data-we-collect"
                  ref={(el) => { sectionRefs.current['data-we-collect'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Data We Collect</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <ul className="space-y-3 ml-4">
                      <li className="list-disc">
                        <strong className="font-medium text-black dark:text-white">User ID / Email</strong> — collected via Supabase authentication when you create an account. Account creation is optional.
                      </li>
                      <li className="list-disc">
                        <strong className="font-medium text-black dark:text-white">Location Data</strong> — used for nearby recommendations, geofencing, and directions.
                      </li>
                      <li className="list-disc">
                        <strong className="font-medium text-black dark:text-white">Health & Fitness Data</strong> — HealthKit data (steps, energy) is used on-device only for trip health insights. This data is never sent to our servers.
                      </li>
                      <li className="list-disc">
                        <strong className="font-medium text-black dark:text-white">Photos</strong> — photo attachments that you add to trips are synced with your trip data.
                      </li>
                      <li className="list-disc">
                        <strong className="font-medium text-black dark:text-white">Search / Usage Data</strong> — search queries, visited places, saved places, and reviews.
                      </li>
                    </ul>
                  </div>
                </section>

                {/* How We Use Data */}
                <section
                  id="how-we-use"
                  ref={(el) => { sectionRefs.current['how-we-use'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">How We Use Data</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>We use the information we collect to:</p>
                    <ul className="space-y-2 ml-4">
                      <li className="list-disc">Provide personalized travel recommendations.</li>
                      <li className="list-disc">Power trip planning and itinerary generation.</li>
                      <li className="list-disc">Deliver morning briefings and smart insights.</li>
                      <li className="list-disc">Enable AI-powered chat assistance.</li>
                      <li className="list-disc">Sync trips and saved places across your devices.</li>
                    </ul>
                  </div>
                </section>

                {/* Third-Party Services */}
                <section
                  id="third-party-services"
                  ref={(el) => { sectionRefs.current['third-party-services'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Third-Party Services</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>We rely on the following third-party services to operate the app:</p>
                    <ul className="space-y-3 ml-4">
                      <li className="list-disc">
                        <strong className="font-medium text-black dark:text-white">Supabase</strong> — authentication and cloud data storage.
                      </li>
                      <li className="list-disc">
                        <strong className="font-medium text-black dark:text-white">Google Places API</strong> — place search and details.
                      </li>
                      <li className="list-disc">
                        <strong className="font-medium text-black dark:text-white">Apple Services</strong> — MapKit for maps, WeatherKit for weather data, and HealthKit for on-device health insights only.
                      </li>
                    </ul>
                  </div>
                </section>

                {/* Data Storage & Security */}
                <section
                  id="data-storage-security"
                  ref={(el) => { sectionRefs.current['data-storage-security'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Data Storage & Security</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <ul className="space-y-2 ml-4">
                      <li className="list-disc">Account and trip data is stored securely on Supabase servers.</li>
                      <li className="list-disc">HealthKit data stays on your device and is never sent to our servers.</li>
                      <li className="list-disc">Offline data is cached locally on your device for use without an internet connection.</li>
                    </ul>
                    <p>
                      We secure your information using HTTPS encryption, encrypted storage provided by Supabase, role-based access controls, and continuous monitoring.
                      While no online service can guarantee absolute security, we regularly review safeguards and limit data access to team members who need it.
                    </p>
                  </div>
                </section>

                {/* Data Sharing */}
                <section
                  id="data-sharing"
                  ref={(el) => { sectionRefs.current['data-sharing'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Data Sharing</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <ul className="space-y-2 ml-4">
                      <li className="list-disc">We do not sell your personal data.</li>
                      <li className="list-disc">We do not use any third-party tracking or advertising SDKs.</li>
                      <li className="list-disc">Data is shared only with the service providers necessary to operate the app (Supabase, Google Places).</li>
                    </ul>
                  </div>
                </section>

                {/* User Rights */}
                <section
                  id="user-rights"
                  ref={(el) => { sectionRefs.current['user-rights'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">User Rights</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <ul className="space-y-2 ml-4">
                      <li className="list-disc">You can use the app without creating an account.</li>
                      <li className="list-disc">You can request deletion of your data at any time.</li>
                      <li className="list-disc">You can revoke HealthKit and Location permissions at any time through your device settings.</li>
                    </ul>
                  </div>
                </section>

                {/* Children's Privacy */}
                <section
                  id="children"
                  ref={(el) => { sectionRefs.current['children'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Children&apos;s Privacy</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>
                      Urban Manual is not directed at children under 13, and we do not knowingly collect personal information from them.
                      If you believe we have inadvertently collected information from a child under 13, please contact us so we can promptly delete it.
                    </p>
                  </div>
                </section>

                {/* Policy Updates */}
                <section
                  id="policy-updates"
                  ref={(el) => { sectionRefs.current['policy-updates'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Policy Updates</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>
                      We may update this Privacy Policy from time to time. When we make changes, we will update the &ldquo;Last updated&rdquo; date at the bottom
                      of this page and notify you through the app or via email if the changes are significant. We encourage you to review this policy periodically.
                    </p>
                  </div>
                </section>

                {/* Contact Information */}
                <section
                  id="contact"
                  ref={(el) => { sectionRefs.current['contact'] = el; }}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-normal mb-6 text-black dark:text-white tracking-tight">Contact Information</h2>
                  <div className="space-y-5 text-sm text-gray-700 dark:text-gray-400 leading-relaxed">
                    <p>
                      If you have questions or concerns about this Privacy Policy, please contact us at{' '}
                      <a className="underline hover:text-black dark:hover:text-white transition-colors" href="mailto:privacy@urbanmanual.co">privacy@urbanmanual.co</a>{' '}
                      or visit <a className="underline hover:text-black dark:hover:text-white transition-colors" href="https://www.urbanmanual.co">www.urbanmanual.co</a>.
                    </p>
                  </div>
                </section>

                {/* Last Updated */}
                <div className="pt-12">
                  <p className="text-xs text-gray-400 dark:text-gray-500 tracking-wide">
                    Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
