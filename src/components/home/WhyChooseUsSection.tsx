import { ShieldCheck, Award, Clock, Radio, BadgeCheck, MessageCircle } from 'lucide-react';
import { SectionPill } from './motion';

// Each tile gets its own tone and a soft decorative shape, so the grid feels varied
const PERKS = [
  {
    icon: ShieldCheck,
    title: 'Skilled Mechanics',
    desc: 'Trained in proper procedures and diagnostics.',
    tone: 'bg-orange-500',
    shape: 'absolute -right-10 -top-10 w-40 h-40 rounded-full border-[18px] border-white/15',
  },
  {
    icon: Award,
    title: 'Genuine Parts',
    desc: 'Authentic replacement parts for your safety.',
    tone: 'bg-slate-800',
    shape: 'absolute -right-6 -bottom-12 w-36 h-36 rounded-full bg-orange-500/20 blur-xl',
  },
  {
    icon: Clock,
    title: 'Prompt Turnaround',
    desc: 'One booking per bay each day, so every bike gets attention.',
    tone: 'bg-slate-800',
    shape: 'absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-white/5 to-transparent',
  },
  {
    icon: Radio,
    title: 'Live Tracking',
    desc: 'Follow all five repair stages from your phone.',
    tone: 'bg-amber-500',
    shape: 'absolute -right-8 bottom-4 w-32 h-16 rounded-t-full border-[14px] border-b-0 border-white/20',
  },
  {
    icon: BadgeCheck,
    title: '7-Day Warranty',
    desc: 'Workmanship backed by our service warranty.',
    tone: 'bg-slate-800',
    shape: 'absolute -left-10 -bottom-10 w-32 h-32 rounded-full border-[16px] border-white/5',
  },
  {
    icon: MessageCircle,
    title: 'Rider Support',
    desc: 'Chat with the shop about your booking anytime.',
    tone: 'bg-orange-600',
    shape: 'absolute right-4 top-4 w-16 h-16 rounded-2xl bg-white/10 rotate-12',
  },
];

export default function WhyChooseUsSection() {
  // No scroll animations in this section: everything is shown as is
  return (
    <section id="why-us" className="scroll-mt-16 sm:scroll-mt-20 bg-slate-950 px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <SectionPill tone="dark">The MotoCare Advantage</SectionPill>
          <h2 className="text-balance mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] text-white leading-[1.04]">
            Real mechanics. <span className="text-orange-500">Real updates.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
            We treat every motorcycle like our own, and we keep you in the loop from drop-off to pickup.
          </p>
        </div>

        {/* Two tiles per row on phones, three on desktop */}
        <div className="mt-10 sm:mt-14 grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {PERKS.map((perk) => (
            <div
              key={perk.title}
              className={`relative overflow-hidden rounded-2xl sm:rounded-3xl ${perk.tone} p-4 sm:p-7 min-h-[150px] sm:min-h-[210px] flex flex-col justify-between`}
            >
              <span aria-hidden="true" className={perk.shape} />
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 flex items-center justify-center">
                <perk.icon className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="relative mt-5 sm:mt-8">
                <h3 className="font-display text-base sm:text-2xl font-bold tracking-tight text-white leading-tight">
                  {perk.title}
                </h3>
                <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-white/75 leading-relaxed">{perk.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
