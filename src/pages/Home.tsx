import { MotionConfig } from 'motion/react';
import { ReactLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';
import Navbar from '../components/Navbar';
import IntroSplash from '../components/home/IntroSplash';
import StickySection from '../components/home/StickySection';
import Hero from '../components/home/Hero';
import ServicesSection from '../components/home/ServicesSection';
import HowItWorksSection from '../components/home/HowItWorksSection';
import StatementBand from '../components/home/StatementBand';
import WhyChooseUsSection from '../components/home/WhyChooseUsSection';
import CustomerReviewsSection from '../components/home/CustomerReviewsSection';
import TeamSection from '../components/home/TeamSection';
import Footer from '../components/home/Footer';

// A layer that rises over the section before it, with rounded top corners and a soft shadow
const LAYER = 'rounded-t-[2rem] sm:rounded-t-[3rem] overflow-hidden shadow-[0_-24px_60px_-24px_rgba(15,23,42,0.35)]';

export default function Home() {
  return (
    // Smooth, inertia-style scrolling (Lenis) with scroll-linked animations (Motion).
    // The owner chose to always play the animations, even with "reduce motion" on.
    <ReactLenis root options={{ lerp: 0.085, anchors: { offset: -80 } }}>
      <MotionConfig reducedMotion="never">
        <div className="bg-white w-full min-h-screen">
          <IntroSplash />
          <Navbar />
          {/* overflow-x-clip (not hidden) keeps the sticky stacking working */}
          <main className="pt-16 sm:pt-20 overflow-x-clip">
            {/* 1. Hero stays put while the Services sheet rises over it */}
            <StickySection layer={1} className="bg-white">
              <Hero />
            </StickySection>
            <div className={`relative z-[2] bg-white ${LAYER}`}>
              <ServicesSection />
            </div>
            <div className="relative z-[2] bg-white">
              <HowItWorksSection />
            </div>

            <div className="relative z-[2] bg-orange-500">
              <StatementBand />
            </div>
            <div className="relative z-[2] bg-slate-950">
              <WhyChooseUsSection />
            </div>
            <div className="relative z-[2] bg-white">
              <CustomerReviewsSection />
            </div>

            <div className="relative z-[2] bg-slate-50">
              <TeamSection />
            </div>
            <div className="relative z-[2] bg-slate-950">
              <Footer />
            </div>
          </main>
        </div>
      </MotionConfig>
    </ReactLenis>
  );
}
