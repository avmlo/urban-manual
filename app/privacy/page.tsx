'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

const sections = [
  { id: 'introduction', title: 'Introduction' },
  { id: 'data-we-collect', title: 'Data We Collect' },
  { id: 'how-we-use', title: 'How We Use Data' },
  { id: 'third-party-services', title: 'Third-Party Services' },
  { id: 'data-storage-security', title: 'Data Storage & Security' },
  { id: 'data-sharing', title: 'Data Sharing' },
  { id: 'your-rights', title: 'Your Rights & Choices' },
  { id: 'children', title: "Children's Privacy" },
  { id: 'policy-updates', title: 'Policy Updates' },
  { id: 'contact', title: 'Contact Information' },
];

function PlatformBadge({ platform }: { platform: 'iOS' | 'Web' }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase rounded border border-[var(--editorial-border)] text-[var(--editorial-text-tertiary)]">
      {platform}
    </span>
  );
}

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector('header');
      let headerBottom = 120;

      if (header) {
        headerBottom = header.offsetTop + header.offsetHeight;
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
      const header = document.querySelector('header');
      let headerBottom = 120;

      if (header) {
        headerBottom = header.offsetTop + header.offsetHeight;
      }

      const offset = headerBottom + 24;
      const elementPosition = element.offsetTop;
      const offsetPosition = Math.max(0, elementPosition - offset);

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <article className="min-h-screen" aria-labelledby="privacy-title">
      <div className="px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-7xl mx-auto">
          <h1
            id="privacy-title"
            className="font-[var(--font-editorial-serif)] text-4xl md:text-5xl lg:text-6xl font-normal text-center text-[var(--editorial-text-primary)] mb-4"
            style={{ fontFamily: 'var(--font-editorial-serif)' }}
          >
            Privacy Policy
          </h1>
          <p className="text-center text-xs tracking-wide text-[var(--editorial-text-tertiary)] mb-16 md:mb-20">
            Applies to the Urban Manual website and iOS app
          </p>

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
            {/* Sidebar Navigation */}
            <aside className="lg:w-52 flex-shrink-0">
              <div className="sticky top-24">
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-[var(--editorial-text-tertiary)] mb-4">
                  On this page
                </p>
                <nav className="space-y-0.5" aria-label="Privacy policy sections">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left py-2 text-xs tracking-wide transition-colors ${
                        activeSection === section.id
                          ? 'text-[var(--editorial-text-primary)] font-medium'
                          : 'text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)]'
                      }`}
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 max-w-3xl">
              <div className="space-y-6">

                {/* Introduction */}
                <section
                  id="introduction"
                  ref={(el) => { sectionRefs.current['introduction'] = el; }}
                  className="scroll-mt-24 border border-[var(--editorial-border)] rounded-lg p-6"
                >
                  <h2 className="text-lg font-semibold mb-3 text-[var(--editorial-text-primary)]">Introduction</h2>
                  <p className="text-sm text-[var(--editorial-text-secondary)] leading-relaxed">
                    Urban Manual (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is a curated travel guide that helps you discover, save, and plan trips to destinations worldwide.
                    This Privacy Policy describes the personal information we collect when you use the Urban Manual iOS app, visit{' '}
                    <a href="https://www.urbanmanual.co" className="underline hover:text-[var(--editorial-text-primary)] transition-colors">www.urbanmanual.co</a>,
                    or interact with our services.
                  </p>
                </section>

                {/* Data We Collect */}
                <section
                  id="data-we-collect"
                  ref={(el) => { sectionRefs.current['data-we-collect'] = el; }}
                  className="scroll-mt-24 border border-[var(--editorial-border)] rounded-lg p-6"
                >
                  <h2 className="text-lg font-semibold mb-4 text-[var(--editorial-text-primary)]">Data We Collect</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>
                        <strong className="font-medium text-[var(--editorial-text-primary)]">Account Data</strong> — user ID and email collected via Supabase authentication when you create an account. Account creation is optional.
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>
                        <strong className="font-medium text-[var(--editorial-text-primary)]">Location Data</strong> — used for nearby recommendations, geofencing, and directions. You can disable location access at any time through your device or browser settings.
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>
                        <strong className="font-medium text-[var(--editorial-text-primary)]">Health & Fitness Data</strong>{' '}
                        <PlatformBadge platform="iOS" /> — HealthKit data (steps, energy) is used on-device only for trip health insights. This data is never sent to our servers.
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>
                        <strong className="font-medium text-[var(--editorial-text-primary)]">Photos</strong>{' '}
                        <PlatformBadge platform="iOS" /> — photo attachments that you add to trips are synced with your trip data.
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>
                        <strong className="font-medium text-[var(--editorial-text-primary)]">Search & Usage Data</strong> — search queries, visited places, saved places, reviews, and activity history.
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>
                        <strong className="font-medium text-[var(--editorial-text-primary)]">Cookies & Browser Data</strong>{' '}
                        <PlatformBadge platform="Web" /> — first-party cookies and local storage to keep you signed in, remember preferences, and understand how the product performs. We use Google Analytics to collect anonymized usage data including page views, interactions, and general geographic location.
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>
                        <strong className="font-medium text-[var(--editorial-text-primary)]">Technical Information</strong> — device type, browser or app version, IP address, and usage patterns collected automatically.
                      </div>
                    </div>
                  </div>
                </section>

                {/* How We Use Data */}
                <section
                  id="how-we-use"
                  ref={(el) => { sectionRefs.current['how-we-use'] = el; }}
                  className="scroll-mt-24 border border-[var(--editorial-border)] rounded-lg p-6"
                >
                  <h2 className="text-lg font-semibold mb-3 text-[var(--editorial-text-primary)]">How We Use Data</h2>
                  <p className="text-sm text-[var(--editorial-text-secondary)] leading-relaxed mb-4">
                    We use the information we collect to:
                  </p>
                  <div className="space-y-2">
                    {[
                      'Provide personalized travel recommendations',
                      'Power trip planning and itinerary generation',
                      'Deliver morning briefings and smart insights',
                      'Enable AI-powered chat assistance',
                      'Sync trips and saved places across your devices',
                      'Analyze aggregated usage trends to improve the experience',
                      'Send product updates and respond to your requests',
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                        <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Third-Party Services */}
                <section
                  id="third-party-services"
                  ref={(el) => { sectionRefs.current['third-party-services'] = el; }}
                  className="scroll-mt-24 border border-[var(--editorial-border)] rounded-lg p-6"
                >
                  <h2 className="text-lg font-semibold mb-3 text-[var(--editorial-text-primary)]">Third-Party Services</h2>
                  <p className="text-sm text-[var(--editorial-text-secondary)] leading-relaxed mb-4">
                    We rely on the following services to operate:
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>
                        <strong className="font-medium text-[var(--editorial-text-primary)]">Supabase</strong> — authentication and cloud data storage
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>
                        <strong className="font-medium text-[var(--editorial-text-primary)]">Google Places API</strong> — place search and details
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>
                        <strong className="font-medium text-[var(--editorial-text-primary)]">Apple Services</strong>{' '}
                        <PlatformBadge platform="iOS" /> — MapKit for maps, WeatherKit for weather data, and HealthKit for on-device health insights only
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>
                        <strong className="font-medium text-[var(--editorial-text-primary)]">Google Analytics</strong>{' '}
                        <PlatformBadge platform="Web" /> — anonymized website usage analytics
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>
                        <strong className="font-medium text-[var(--editorial-text-primary)]">Vercel</strong>{' '}
                        <PlatformBadge platform="Web" /> — website hosting and deployment
                      </div>
                    </div>
                  </div>
                </section>

                {/* Data Storage & Security */}
                <section
                  id="data-storage-security"
                  ref={(el) => { sectionRefs.current['data-storage-security'] = el; }}
                  className="scroll-mt-24 border border-[var(--editorial-border)] rounded-lg p-6"
                >
                  <h2 className="text-lg font-semibold mb-3 text-[var(--editorial-text-primary)]">Data Storage & Security</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <span>Account and trip data is stored securely on Supabase servers with HTTPS encryption and role-based access controls</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>HealthKit data stays on your device and is never sent to our servers <PlatformBadge platform="iOS" /></div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>Offline data is cached locally on your device <PlatformBadge platform="iOS" /></div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>Cookie and session data is stored in your browser <PlatformBadge platform="Web" /></div>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--editorial-text-secondary)] leading-relaxed mt-4">
                    While no online service can guarantee absolute security, we regularly review safeguards and limit data access to team members who need it.
                  </p>
                </section>

                {/* Data Sharing */}
                <section
                  id="data-sharing"
                  ref={(el) => { sectionRefs.current['data-sharing'] = el; }}
                  className="scroll-mt-24 border border-[var(--editorial-border)] rounded-lg p-6"
                >
                  <h2 className="text-lg font-semibold mb-3 text-[var(--editorial-text-primary)]">Data Sharing</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <span>We do not sell your personal data</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <span>We do not use third-party tracking or advertising SDKs</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <span>Data is shared only with the service providers necessary to operate the product (Supabase, Google Places)</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <span>We may share data when required by law, to respond to legal process, or to protect our rights</span>
                    </div>
                  </div>
                </section>

                {/* Your Rights & Choices */}
                <section
                  id="your-rights"
                  ref={(el) => { sectionRefs.current['your-rights'] = el; }}
                  className="scroll-mt-24 border border-[var(--editorial-border)] rounded-lg p-6"
                >
                  <h2 className="text-lg font-semibold mb-3 text-[var(--editorial-text-primary)]">Your Rights & Choices</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <span>Use the app or website without creating an account</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <span>Access, correct, or update your profile information from your account settings</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <span>Request a copy of your data or deletion of your account at any time</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>Revoke HealthKit and Location permissions through your device settings <PlatformBadge platform="iOS" /></div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-[var(--editorial-text-secondary)]">
                      <span className="text-[var(--editorial-text-tertiary)] mt-0.5">•</span>
                      <div>Manage cookie preferences or disable location access in your browser <PlatformBadge platform="Web" /></div>
                    </div>
                  </div>
                </section>

                {/* Children's Privacy */}
                <section
                  id="children"
                  ref={(el) => { sectionRefs.current['children'] = el; }}
                  className="scroll-mt-24 border border-[var(--editorial-border)] rounded-lg p-6"
                >
                  <h2 className="text-lg font-semibold mb-3 text-[var(--editorial-text-primary)]">Children&apos;s Privacy</h2>
                  <p className="text-sm text-[var(--editorial-text-secondary)] leading-relaxed">
                    Urban Manual is not directed at children under 13, and we do not knowingly collect personal information from them.
                    If you believe we have inadvertently collected information from a child under 13, please contact us so we can promptly delete it.
                  </p>
                </section>

                {/* Policy Updates */}
                <section
                  id="policy-updates"
                  ref={(el) => { sectionRefs.current['policy-updates'] = el; }}
                  className="scroll-mt-24 border border-[var(--editorial-border)] rounded-lg p-6"
                >
                  <h2 className="text-lg font-semibold mb-3 text-[var(--editorial-text-primary)]">Policy Updates</h2>
                  <p className="text-sm text-[var(--editorial-text-secondary)] leading-relaxed">
                    We may update this Privacy Policy from time to time. When we make changes, we will update the &ldquo;Last updated&rdquo; date
                    and notify you through the app or via email if the changes are significant. We encourage you to review this policy periodically.
                  </p>
                </section>

                {/* Contact Information */}
                <section
                  id="contact"
                  ref={(el) => { sectionRefs.current['contact'] = el; }}
                  className="scroll-mt-24 border border-[var(--editorial-border)] rounded-lg p-6"
                >
                  <h2 className="text-lg font-semibold mb-3 text-[var(--editorial-text-primary)]">Contact Information</h2>
                  <p className="text-sm text-[var(--editorial-text-secondary)] leading-relaxed">
                    If you have questions or concerns about this Privacy Policy, please contact us at{' '}
                    <a className="text-[var(--editorial-text-primary)] underline hover:opacity-60 transition-opacity" href="mailto:privacy@urbanmanual.co">privacy@urbanmanual.co</a>{' '}
                    or visit{' '}
                    <a className="text-[var(--editorial-text-primary)] underline hover:opacity-60 transition-opacity" href="https://www.urbanmanual.co">www.urbanmanual.co</a>.
                  </p>
                </section>

                {/* Last Updated + Back Link */}
                <div className="pt-6 flex items-center justify-between">
                  <Link
                    href="/"
                    className="inline-flex items-center text-sm text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
                  >
                    &larr; Back to home
                  </Link>
                  <p className="text-xs text-[var(--editorial-text-tertiary)] tracking-wide">
                    Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </article>
  );
}
