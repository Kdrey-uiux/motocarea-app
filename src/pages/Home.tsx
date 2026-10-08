import Navbar from '../components/Navbar';
import Hero from '../components/home/Hero';
import ServicesSection from '../components/home/ServicesSection';
import HowItWorksSection from '../components/home/HowItWorksSection';
import WhyChooseUsSection from '../components/home/WhyChooseUsSection';
import TeamSection from '../components/home/TeamSection';
import Footer from '../components/home/Footer';

export default function Home() {
  return (
    <div className="bg-white w-full min-h-screen">
      <Navbar />
      <main className="pt-16 overflow-x-hidden">
        <Hero />
        <ServicesSection />
        <HowItWorksSection />
        <WhyChooseUsSection />
        <TeamSection />
        <Footer />
      </main>
    </div>
  );
}