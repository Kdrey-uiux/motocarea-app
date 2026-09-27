import { Code2, Layout, Smartphone, Database } from 'lucide-react';

export default function TeamSection() {
  const members = [
    {
      name: 'Kurt Andrei Alerta',
      role: 'Fullstack Developer',
      focus: 'System Architecture & Supabase Integration',
      image: '/team/kurt.jpg',
      icon: <Code2 className="w-3.5 h-3.5 text-blue-600" />
    },
    {
      name: 'Amytha Marie Bautista',
      role: 'Frontend Developer',
      focus: 'UI/UX Design & Component Styling',
      image: '/team/amytha.jpg',
      icon: <Layout className="w-3.5 h-3.5 text-blue-600" />
    },
    {
      name: 'Juliana Alejandria',
      role: 'Frontend Developer',
      focus: 'Responsive Layouts & User Flow',
      image: '/team/juliana.jpg',
      icon: <Smartphone className="w-3.5 h-3.5 text-blue-600" />
    },
    {
      name: 'Ferdinand Casey Santiago',
      role: 'Backend Developer',
      focus: 'Database Schema & Security Policies',
      image: '/team/ferdinand.jpg',
      icon: <Database className="w-3.5 h-3.5 text-blue-600" />
    }
  ];

  return (
    <section id="team" className="py-20 bg-slate-50/50 border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Project Authors
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            The Development Team
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            The engineering team behind the MotoCare Service Management System.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {members.map((member, index) => (
            <div
              key={index}
              className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition flex flex-col items-center text-center space-y-4"
            >
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm bg-slate-100">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback sakaling hindi mabasa ang imahe
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">{member.name}</h3>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                  {member.icon}
                  <span>{member.role}</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 pt-2 border-t border-slate-100 w-full leading-relaxed">
                {member.focus}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}