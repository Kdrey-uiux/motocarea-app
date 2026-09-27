import { Calendar, Clock, Wrench, CheckCircle2 } from 'lucide-react';

export default function HowItWorksSection() {
  const steps = [
    {
      step: 'STEP 1',
      title: 'Book Online',
      desc: 'Select your preferred service schedule and register your motorcycle profile.',
      icon: <Calendar className="w-6 h-6 text-white" />
    },
    {
      step: 'STEP 2',
      title: 'Shop Drop-Off',
      desc: 'Bring your motorcycle to the shop and get your unique Tracking Ticket Code.',
      icon: <Clock className="w-6 h-6 text-white" />
    },
    {
      step: 'STEP 3',
      title: 'Expert Servicing',
      desc: 'Our certified mechanics perform repairs while you track the status online in real time.',
      icon: <Wrench className="w-6 h-6 text-white" />
    },
    {
      step: 'STEP 4',
      title: 'Ready for Pickup',
      desc: 'Receive immediate status update when your motorcycle is tested and ready to ride.',
      icon: <CheckCircle2 className="w-6 h-6 text-white" />
    }
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-14">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-orange-600 text-xs font-bold tracking-wider uppercase">Simple Process</span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">How It Works</h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Servicing your motorcycle with full transparency and zero guesswork.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, idx) => (
            <div key={idx} className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center mx-auto shadow-md shadow-blue-600/20">
                {s.icon}
              </div>
              <div className="text-xs font-bold text-orange-600">{s.step}</div>
              <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
              <p className="text-slate-600 text-xs leading-relaxed max-w-xs mx-auto">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}