import { useState, type ReactNode } from 'react';
import { Code2, Layout, Database, ClipboardList } from 'lucide-react';

interface TeamMember {
  name: string;
  role: string;
  focus: string;
  image: string;
  icon: ReactNode;
}

export default function TeamSection() {
  // Project manager first, then the rest of the team (roles from the official team list)
  const members: TeamMember[] = [
    {
      name: 'Ferdinand Casey Santiago',
      role: 'Project Manager',
      focus: 'Quality Assurance Tester · Researcher',
      image: '/team/ferdinand.jpg',
      icon: <ClipboardList className="w-3.5 h-3.5 text-orange-500" />
    },
    {
      name: 'Juliana Alejandria',
      role: 'Database Admin',
      focus: 'Researcher',
      image: '/team/juliana.jpg',
      icon: <Database className="w-3.5 h-3.5 text-orange-500" />
    },
    {
      name: 'Kurt Andrei Alerta',
      role: 'Back-end Developer',
      focus: 'Researcher',
      image: '/team/kurt.jpg',
      icon: <Code2 className="w-3.5 h-3.5 text-orange-500" />
    },
    {
      name: 'Amytha Marie Bautista',
      role: 'Front-end Developer',
      focus: 'Researcher',
      image: '/team/amytha.jpg',
      icon: <Layout className="w-3.5 h-3.5 text-orange-500" />
    }
  ];

  // Repeat for seamless looping track on mobile
  const trackMembers = [...members, ...members];
  const [isPaused, setIsPaused] = useState(false);

  const renderCard = (member: TeamMember, key: string, isFixed = false) => (
    <div
      key={key}
      className={`${
        isFixed ? 'w-full' : 'w-[250px] sm:w-[270px] shrink-0'
      } bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 shadow-2xs hover:shadow-lg hover:border-orange-400 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center justify-between space-y-3.5 group select-none`}
    >
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-2xs bg-slate-100 shrink-0 group-hover:scale-105 transition-transform duration-300">
        <img
          src={member.image}
          alt={member.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>

      <div className="space-y-1.5 w-full min-w-0">
        <h3
          className="text-sm sm:text-base font-bold text-slate-900 truncate leading-snug group-hover:text-orange-600 transition-colors"
          title={member.name}
        >
          {member.name}
        </h3>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
          {member.icon}
          <span className="truncate">{member.role}</span>
        </div>
      </div>

      <p className="text-[11px] sm:text-xs text-slate-500 pt-2.5 border-t border-slate-100 w-full leading-relaxed min-h-[38px] flex items-center justify-center">
        {member.focus}
      </p>
    </div>
  );

  return (
    <section
      id="team"
      className="scroll-mt-16 sm:scroll-mt-20 py-16 sm:py-24 bg-slate-50 overflow-hidden relative"
    >
      <style>{`
        @keyframes teamContinuousMarquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .team-marquee-track {
          display: flex;
          width: max-content;
          animation: teamContinuousMarquee 28s linear infinite;
          will-change: transform;
        }
        .team-marquee-track:hover {
          animation-play-state: paused !important;
        }
      `}</style>

      <div className="space-y-8 sm:space-y-10">
        {/* Centered Header */}
        <div className="text-center max-w-3xl mx-auto px-4">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-orange-100/70 text-orange-700">
            Project Authors
          </span>
          <h2 className="text-balance mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] text-slate-900 leading-[1.04]">
            The <span className="text-orange-500">team</span> behind MotoCare
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            The people who designed and built the MotoCare Service Management System.
          </p>
        </div>

        {/* 1. Desktop Fixed View: Static 4-column centered grid */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-6 max-w-6xl mx-auto px-4 sm:px-6">
          {members.map((member, index) => renderCard(member, `desktop-${index}`, true))}
        </div>

        {/* 2. Mobile Continuous Infinite Marquee View: Automatic looping marquee, compact, no buttons */}
        <div className="block lg:hidden relative w-full overflow-hidden py-2">
          {/* Edge Fade Gradients (Left and Right) */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-20 bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-20 bg-gradient-to-l from-slate-50 via-slate-50/80 to-transparent z-10" />

          {/* Infinite Continuous Track */}
          <div
            className="team-marquee-track"
            style={{
              animationPlayState: isPaused ? 'paused' : 'running'
            }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {/* Primary Track Set */}
            <div className="flex gap-4 shrink-0 pr-4">
              {trackMembers.map((member, index) => renderCard(member, `setA-${index}`, false))}
            </div>

            {/* Seamless Mirror Track Set */}
            <div className="flex gap-4 shrink-0 pr-4" aria-hidden="true">
              {trackMembers.map((member, index) => renderCard(member, `setB-${index}`, false))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}