
import React, { useState } from 'react';
import { ExerciseQuestion } from '../types';

interface ExerciseViewProps {
  questions: ExerciseQuestion[];
  onComplete: (score: number) => void;
  onCancel: () => void;
}

const ExerciseView: React.FC<ExerciseViewProps> = ({ questions, onComplete, onCancel }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const currentQuestion = questions[currentIdx];

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    const isCorrect = answer.toLowerCase().trim() === currentQuestion.answer.toLowerCase().trim();
    setUserAnswers({ ...userAnswers, [currentQuestion.id]: answer });
    if (isCorrect) setScore(s => s + 1);
    setShowResult(true);
    setShowHint(false);
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setShowResult(false);
      setShowHint(false);
    } else {
      onComplete(score);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto glass rounded-[3rem] shadow-2xl p-10 border border-white/40 animate-in fade-in zoom-in duration-500 relative">
      <div className="flex justify-between items-center mb-10">
        <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">Question {currentIdx + 1}/{questions.length}</span>
        <button onClick={onCancel} className="text-slate-400 hover:text-red-500 text-xs font-black uppercase transition-colors">Abort Quiz</button>
      </div>

      <div className="mb-10">
        <h3 className="text-3xl font-black text-slate-800 leading-tight mb-8">
          {currentQuestion.type === 'mcq' ? "Which is correct?" : "Fill in the blank:"}
        </h3>
        <div className="p-8 bg-white/80 rounded-[2rem] border-2 border-indigo-50 shadow-inner text-xl font-bold text-slate-700 leading-relaxed italic">
          "{currentQuestion.question}"
        </div>
      </div>

      {currentQuestion.hint && !showResult && (
        <div className="mb-6 flex justify-center">
          {showHint ? (
            <div className="bg-amber-50 text-amber-700 p-4 rounded-2xl text-sm font-bold border border-amber-200 animate-in fade-in slide-in-from-top-2">
              💡 Hint: {currentQuestion.hint}
            </div>
          ) : (
            <button onClick={() => setShowHint(true)} className="text-indigo-400 text-xs font-bold hover:underline">Need a hint?</button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {currentQuestion.type === 'mcq' ? (
          <div className="grid grid-cols-1 gap-4">
            {currentQuestion.options?.map((opt, i) => {
              const isSelected = userAnswers[currentQuestion.id] === opt;
              const isCorrect = opt === currentQuestion.answer;
              let btnClass = "bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30";
              if (showResult) {
                if (isCorrect) btnClass = "bg-emerald-50 border-emerald-500 text-emerald-800 scale-105 z-10 shadow-xl shadow-emerald-100";
                else if (isSelected) btnClass = "bg-red-50 border-red-500 text-red-800 opacity-80";
                else btnClass = "bg-slate-100 border-transparent opacity-40";
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt)}
                  disabled={showResult}
                  className={`w-full text-left p-6 rounded-[1.5rem] border-2 font-black text-lg transition-all flex items-center gap-5 ${btnClass}`}
                >
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${showResult && isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            <input 
              type="text"
              autoFocus
              placeholder="Your answer..."
              disabled={showResult}
              className={`w-full p-6 rounded-[1.5rem] border-2 font-black text-2xl outline-none focus:ring-8 transition-all text-center ${
                showResult 
                  ? (userAnswers[currentQuestion.id]?.toLowerCase().trim() === currentQuestion.answer.toLowerCase().trim() ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-red-50 border-red-500 text-red-700")
                  : "bg-white border-indigo-100 focus:border-indigo-600 focus:ring-indigo-100"
              }`}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAnswer((e.target as HTMLInputElement).value); }}
            />
            {showResult && userAnswers[currentQuestion.id]?.toLowerCase().trim() !== currentQuestion.answer.toLowerCase().trim() && (
              <div className="p-6 bg-emerald-600 text-white rounded-[1.5rem] text-center font-black shadow-xl animate-in bounce-in">
                Correct answer: {currentQuestion.answer}
              </div>
            )}
            {!showResult && (
              <button 
                onClick={() => { const i = document.querySelector('input') as HTMLInputElement; handleAnswer(i.value); }}
                className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black shadow-2xl shadow-indigo-200 active:scale-95 transition-all"
              >
                SUBMIT
              </button>
            )}
          </div>
        )}
      </div>

      {showResult && (
        <button 
          onClick={nextQuestion}
          className="mt-12 w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all group shadow-2xl"
        >
          {currentIdx === questions.length - 1 ? "FINISH" : "NEXT"}
          <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
        </button>
      )}
    </div>
  );
};

export default ExerciseView;
