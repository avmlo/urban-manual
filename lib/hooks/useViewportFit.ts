import { useEffect } from 'react';

/**
 * Forces the page layout to fit exactly within the viewport height (100dvh)
 * with no scrolling. Header, main content, and footer all share the viewport.
 *
 * Sets up a flex column layout on body and adjusts parent elements so that
 * the page content fills the remaining space between header and footer.
 *
 * All style overrides are cleaned up on unmount.
 */
export function useViewportFit() {
  useEffect(() => {
    const mainContent = document.getElementById('main-content');
    const header = document.querySelector('header[role="banner"]') as HTMLElement | null;
    const footer = document.querySelector('footer[role="contentinfo"]') as HTMLElement | null;

    // Prevent page-level scrolling
    document.documentElement.style.overflow = 'hidden';
    document.body.style.display = 'flex';
    document.body.style.flexDirection = 'column';
    document.body.style.height = '100dvh';
    document.body.style.overflow = 'hidden';

    // Any wrapper between body and main-content (e.g. SwipeBack) needs to flex too
    let wrapper: HTMLElement | null = null;
    if (mainContent && mainContent.parentElement !== document.body) {
      wrapper = mainContent.parentElement as HTMLElement;
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.flex = '1';
      wrapper.style.minHeight = '0';
    }

    if (header) {
      header.style.position = 'relative';
      header.style.flexShrink = '0';
    }
    if (mainContent) {
      mainContent.style.minHeight = '0';
      mainContent.style.flex = '1';
      mainContent.style.display = 'flex';
      mainContent.style.flexDirection = 'column';
    }
    if (footer) {
      footer.style.marginTop = '0';
      footer.style.flexShrink = '0';
    }

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.display = '';
      document.body.style.flexDirection = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
      if (wrapper) {
        wrapper.style.display = '';
        wrapper.style.flexDirection = '';
        wrapper.style.flex = '';
        wrapper.style.minHeight = '';
      }
      if (header) {
        header.style.position = '';
        header.style.flexShrink = '';
      }
      if (mainContent) {
        mainContent.style.minHeight = '';
        mainContent.style.flex = '';
        mainContent.style.display = '';
        mainContent.style.flexDirection = '';
      }
      if (footer) {
        footer.style.marginTop = '';
        footer.style.flexShrink = '';
      }
    };
  }, []);
}
