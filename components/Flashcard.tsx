
import React, { useState, useCallback, useMemo } from 'react';
import { FlashcardData } from '../types';

interface FlashcardProps {
  card: FlashcardData;
  onSave?: (card: FlashcardData) => void;
  onGrade?: (cardId: string, grade: 'hard' | 'good' | 'easy') => void;
  isPracticeMode?: boolean;
}

const Flashcard: React.FC<FlashcardProps> = ({ card, onSave, onGrade, isPracticeMode }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const levelColor = useMemo(() => {
    const l = (card.level || 'B2').toUpperCase();
    if (l.startsWith('A')) return 'from-emerald-400 to-teal-500';
    if (l.startsWith('B')) return 'from-amber-400 to-orange-500';
    if (l.startsWith('C')) return 'from-rose-500 to-pink-600';
    return 'from-indigo-500 to-violet-600';
  }, [card.level]);

  const playFlipSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  }, []);

  const handleFlip = () => {
    playFlipSound();
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="w-full h-[450px] perspective-1000 cursor-pointer group mb-12">
      <div className={`relative w-full h-full transition-transform duration-[800ms] transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        {/* Front Side */}
        <div 
          onClick={handleFlip}
          className="absolute inset-0 backface-hidden bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center p-12 overflow-hidden border-2 border-white/50"
        >
          {/* Background decoration */}
          <div className={`absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br ${levelColor} rounded-full opacity-10 blur-2xl group-hover:scale-150 transition-transform duration-700`}></div>
          <div className={`absolute -bottom-12 -left-12 w-48 h-48 bg-gradient-to-tr ${levelColor} rounded-full opacity-5 blur-xl`}></div>
          
          <div className={`px-4 py-1.5 bg-gradient-to-r ${levelColor} text-white rounded-full text-[12px] font-black uppercase tracking-[0.2em] shadow-lg mb-8 z-10`}>
            {card.level || 'LEVEL B2'}
          </div>
          
          <h2 className="text-6xl font-[900] text-slate-800 text-center mb-6 leading-tight z-10 drop-shadow-sm tracking-tight">
            {card.word}
          </h2>
          
          <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-widest animate-bounce z-10">
            <span>Tap to reveal</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        {/* Back Side */}
        <div className={`absolute inset-0 backface-hidden bg-gradient-to-br ${levelColor} rounded-[3rem] shadow-2xl flex flex-col p-10 rotate-y-180 text-white overflow-hidden border-4 border-white/20`}>
          <div onClick={handleFlip} className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="mb-8">
              <span className="inline-block px-3 py-1 bg-white/30 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4">Vietnamese Definition</span>
              <p className="text-3xl font-black leading-[1.2] drop-shadow-md">{card.definitionVN}</p>
            </div>
            
            <div className="space-y-6 pt-6 border-t border-white/20">
              <div className="group/ex">
                <span className="text-white/60 text-[10px] font-black uppercase tracking-widest block mb-2 group-hover/ex:text-white transition-colors">English Example</span>
                <p className="text-xl italic font-bold leading-relaxed">"{card.exampleEN}"</p>
              </div>
              <div className="bg-black/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/10">
                <p className="text-lg font-medium opacity-90">"{card.exampleVN}"</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            {!card.saved && onSave ? (
              <button 
                onClick={(e) => { e.stopPropagation(); onSave(card); }}
                className="flex-1 bg-white text-indigo-600 py-5 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-indigo-50 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
              >
                Add to My Library
              </button>
            ) : isPracticeMode && onGrade ? (
              <div className="flex w-full gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); onGrade(card.id, 'hard'); }}
                  className="flex-1 bg-rose-500 text-white py-4 rounded-2xl text-[12px] font-black uppercase border-b-4 border-rose-700 hover:translate-y-[2px] hover:border-b-2 transition-all shadow-lg"
                >
                  Hard
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onGrade(card.id, 'good'); }}
                  className="flex-1 bg-white text-slate-800 py-4 rounded-2xl text-[12px] font-black uppercase border-b-4 border-slate-300 hover:translate-y-[2px] hover:border-b-2 transition-all shadow-lg"
                >
                  Good
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onGrade(card.id, 'easy'); }}
                  className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl text-[12px] font-black uppercase border-b-4 border-emerald-700 hover:translate-y-[2px] hover:border-b-2 transition-all shadow-lg"
                >
                  Easy
                </button>
              </div>
            ) : (
              <div className="w-full text-center py-4 bg-white/20 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] border border-white/20 backdrop-blur-sm">
                Saved in Library
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Flashcard;
