
import React from 'react';
import { FlashcardData } from '../types';

interface StatsBoardProps {
  cards: FlashcardData[];
}

const StatsBoard: React.FC<StatsBoardProps> = ({ cards }) => {
  const total = cards.length;
  const mastered = cards.filter(c => (c.repetitionCount || 0) > 5).length;
  const learning = cards.filter(c => (c.repetitionCount || 0) > 0 && (c.repetitionCount || 0) <= 5).length;
  const newCards = cards.filter(c => (c.repetitionCount || 0) === 0).length;
  const dueToday = cards.filter(c => c.nextReview && c.nextReview <= Date.now()).length;

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-[1000ms]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass p-8 rounded-[2.5rem] shadow-xl border-b-[10px] border-indigo-500 relative overflow-hidden group">
          <div className="absolute inset-0 bg-indigo-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Library Size</span>
          <div className="text-5xl font-[1000] text-indigo-600 tracking-tighter">{total}</div>
          <p className="text-xs font-bold text-slate-400 mt-2">Vocabulary words</p>
        </div>
        
        <div className="glass p-8 rounded-[2.5rem] shadow-xl border-b-[10px] border-pink-500 relative overflow-hidden group">
          <div className="absolute inset-0 bg-pink-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Daily Review</span>
          <div className="text-5xl font-[1000] text-pink-500 tracking-tighter">{dueToday}</div>
          <p className="text-xs font-bold text-slate-400 mt-2">Due for recall</p>
        </div>

        <div className="glass p-8 rounded-[2.5rem] shadow-xl border-b-[10px] border-amber-500 relative overflow-hidden group">
          <div className="absolute inset-0 bg-amber-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">In Learning</span>
          <div className="text-5xl font-[1000] text-amber-500 tracking-tighter">{learning}</div>
          <p className="text-xs font-bold text-slate-400 mt-2">Cards in progress</p>
        </div>

        <div className="glass p-8 rounded-[2.5rem] shadow-xl border-b-[10px] border-emerald-500 relative overflow-hidden group">
          <div className="absolute inset-0 bg-emerald-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Mastered</span>
          <div className="text-5xl font-[1000] text-emerald-500 tracking-tighter">{mastered}</div>
          <p className="text-xs font-bold text-slate-400 mt-2">Long-term memory</p>
        </div>
      </div>
      
      {/* Visual Chart */}
      <div className="glass p-12 rounded-[4rem] shadow-2xl mt-10 border-2 border-white/50">
        <h3 className="text-3xl font-[950] text-slate-800 mb-12 tracking-tighter">Mastery Distribution</h3>
        <div className="flex items-end gap-6 h-64 w-full px-4">
          {[
            { label: 'Total', val: total, color: 'bg-indigo-500 shadow-indigo-100' },
            { label: 'New', val: newCards, color: 'bg-slate-300 shadow-slate-100' },
            { label: 'Learning', val: learning, color: 'bg-amber-400 shadow-amber-100' },
            { label: 'Mastered', val: mastered, color: 'bg-emerald-500 shadow-emerald-100' }
          ].map((item, i) => {
            const height = total > 0 ? (item.val / total) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-6 group">
                <div className="relative w-full flex flex-col items-center justify-end h-full">
                  <div className="absolute -top-10 text-lg font-black text-slate-800 opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-y-2">{item.val}</div>
                  <div 
                    className={`${item.color} w-full rounded-[2rem] transition-all duration-[1.5s] ease-out shadow-2xl relative overflow-hidden`} 
                    style={{ height: `${Math.max(height, 8)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 -translate-y-full group-hover:translate-y-full transition-transform duration-1000"></div>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-[12px] font-[1000] text-slate-800 uppercase tracking-widest">{item.label}</span>
                   <span className="text-[10px] font-bold text-slate-400 mt-1">{Math.round(height)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass p-10 rounded-[3rem] shadow-xl text-center">
         <p className="text-lg font-bold text-slate-400 leading-relaxed italic">"Consistency is the key to mastering any language. Review your due cards every single day to maximize retention."</p>
      </div>
    </div>
  );
};

export default StatsBoard;
