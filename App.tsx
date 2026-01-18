
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FlashcardData, ExtractionMode, VocabularyLevel, FileData, AppView, ExerciseQuestion, Deck } from './types';
import { extractVocabulary, generateExercises } from './services/geminiService';
import Flashcard from './components/Flashcard';
import StatsBoard from './components/StatsBoard';
import ExerciseView from './components/ExerciseView';
import * as mammoth from 'mammoth';

const LEVELS: VocabularyLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const QUANTITIES = [20, 50, 100];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('home');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedCards, setExtractedCards] = useState<FlashcardData[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>("");
  
  const [mode, setMode] = useState<ExtractionMode>('extract');
  const [level, setLevel] = useState<VocabularyLevel>('B2');
  const [maxCards, setMaxCards] = useState<number>(50);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<ExerciseQuestion[]>([]);
  const [finalScore, setFinalScore] = useState<{score: number, total: number} | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const data = localStorage.getItem('vocab_boost_decks');
    if (data) { try { setDecks(JSON.parse(data)); } catch (e) {} }
  }, []);

  useEffect(() => {
    localStorage.setItem('vocab_boost_decks', JSON.stringify(decks));
  }, [decks]);

  const handleSaveAllToNewDeck = () => {
    if (extractedCards.length === 0) return;
    const newDeck: Deck = {
      id: `deck-${Date.now()}`,
      name: currentFileName || "Untitled List",
      cards: extractedCards.map(c => ({ ...c, saved: true, interval: 0, easeFactor: 2.5, repetitionCount: 0, nextReview: Date.now() })),
      createdAt: Date.now(),
    };
    setDecks(prev => [newDeck, ...prev]);
    setExtractedCards([]);
    setCurrentFileName("");
    setView('library');
  };

  const handleSaveSingleCard = (card: FlashcardData) => {
    const targetDeckName = "Quick Saves";
    let existingDeck = decks.find(d => d.name === targetDeckName);
    const savedCard = { ...card, saved: true, nextReview: Date.now(), interval: 0, easeFactor: 2.5, repetitionCount: 0 };
    if (existingDeck) {
      setDecks(prev => prev.map(d => d.id === existingDeck!.id ? { ...d, cards: [...d.cards, savedCard] } : d));
    } else {
      setDecks(prev => [{ id: `deck-q-${Date.now()}`, name: targetDeckName, cards: [savedCard], createdAt: Date.now() }, ...prev]);
    }
    setExtractedCards(prev => prev.map(c => c.id === card.id ? { ...c, saved: true } : c));
  };

  const handleGradeCard = (cardId: string, grade: 'hard' | 'good' | 'easy') => {
    setDecks(prev => prev.map(deck => {
      const idx = deck.cards.findIndex(c => c.id === cardId);
      if (idx === -1) return deck;
      const updated = [...deck.cards];
      const card = updated[idx];
      let q = grade === 'easy' ? 5 : grade === 'good' ? 4 : 3;
      let { interval, easeFactor, repetitionCount } = { interval: card.interval || 0, easeFactor: card.easeFactor || 2.5, repetitionCount: card.repetitionCount || 0 };
      if (q >= 3) {
        if (repetitionCount === 0) interval = 1; else if (repetitionCount === 1) interval = 6; else interval = Math.round(interval * easeFactor);
        repetitionCount++;
      } else { repetitionCount = 0; interval = 1; }
      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
      updated[idx] = { ...card, interval, easeFactor, repetitionCount, nextReview: Date.now() + interval * 86400000, lastReviewed: Date.now() };
      return { ...deck, cards: updated };
    }));
    if (currentIndex < currentDisplayCards.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const startQuizForDeck = async (deck: Deck) => {
    if (deck.cards.length < 3) return alert("Need at least 3 cards.");
    setIsLoading(true); setFinalScore(null); setSelectedDeckId(deck.id);
    try {
      const qs = await generateExercises(deck.cards.slice(0, 20));
      setQuestions(qs); setView('exercise');
    } catch (e) { alert("AI Quiz failed."); } finally { setIsLoading(false); }
  };

  const selectedDeck = useMemo(() => decks.find(d => d.id === selectedDeckId), [decks, selectedDeckId]);
  const dueCardsAcrossAll = useMemo(() => decks.flatMap(d => d.cards.filter(c => !c.nextReview || c.nextReview <= Date.now())), [decks]);
  const currentDisplayCards = useMemo(() => {
    if (view === 'home') return extractedCards;
    if (view === 'practice') return dueCardsAcrossAll;
    if (view === 'deck-view' && selectedDeck) return selectedDeck.cards;
    return [];
  }, [view, extractedCards, dueCardsAcrossAll, selectedDeck]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true); setExtractedCards([]); setView('home'); setCurrentFileName(file.name.replace(/\.[^/.]+$/, ""));
    try {
      let textContent = "";
      let fileData: FileData | undefined;
      if (file.name.toLowerCase().endsWith('.docx')) { textContent = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value; }
      else if (file.name.toLowerCase().endsWith('.pdf')) {
        const reader = new FileReader();
        const b64 = await new Promise<string>(r => { reader.onload = () => r((reader.result as string).split(',')[1]); reader.readAsDataURL(file); });
        fileData = { base64: b64, mimeType: 'application/pdf', name: file.name };
      } else { textContent = await file.text(); }
      const res = await extractVocabulary(textContent ? { text: textContent } : { file: fileData }, mode, level, maxCards);
      setExtractedCards(res);
    } catch (err) { setError("AI Extraction Error. Check your connection."); } finally { setIsLoading(false); }
  };

  const navItemClass = (item: AppView) => `
    flex flex-col items-center gap-1 px-4 py-2 rounded-[1.5rem] transition-all duration-300
    ${view === item || (item === 'library' && view === 'deck-view') 
      ? 'vibrant-gradient text-white shadow-[0_10px_30px_rgba(99,102,241,0.4)] scale-110' 
      : 'text-slate-400 hover:text-indigo-600 hover:bg-white/50'}
  `;

  return (
    <div className="min-h-screen relative flex flex-col pb-24 sm:pb-0 overflow-hidden">
      <header className="glass px-8 py-5 flex flex-col sm:flex-row items-center justify-between sticky top-0 z-50 gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setView('home')}>
          <div className="w-12 h-12 vibrant-gradient rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-all duration-500">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-[950] text-slate-800 tracking-tighter leading-none">VocaBoost <span className="bg-clip-text text-transparent vibrant-gradient">VN</span></h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Smart Document Learning</p>
          </div>
        </div>

        <nav className="hidden sm:flex bg-white/40 p-1.5 rounded-[2rem] border border-white/60 shadow-inner">
          <button onClick={() => setView('home')} className={`px-6 py-2.5 rounded-[1.5rem] text-sm font-black transition-all duration-500 ${view === 'home' ? 'vibrant-gradient text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}>Upload</button>
          <button onClick={() => { setView('practice'); setCurrentIndex(0); }} className={`px-6 py-2.5 rounded-[1.5rem] text-sm font-black transition-all duration-500 relative ${view === 'practice' ? 'vibrant-gradient text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}>
            Review
            {dueCardsAcrossAll.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-[10px] rounded-full flex items-center justify-center animate-bounce">{dueCardsAcrossAll.length}</span>}
          </button>
          <button onClick={() => { setView('library'); setCurrentIndex(0); }} className={`px-6 py-2.5 rounded-[1.5rem] text-sm font-black transition-all duration-500 ${view === 'library' || view === 'deck-view' ? 'vibrant-gradient text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}>Library</button>
          <button onClick={() => setView('stats')} className={`px-6 py-2.5 rounded-[1.5rem] text-sm font-black transition-all duration-500 ${view === 'stats' ? 'vibrant-gradient text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}>Progress</button>
        </nav>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-8 z-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[70vh]">
             <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 vibrant-gradient rounded-full blur-2xl opacity-20 animate-pulse"></div>
                <div className="absolute inset-0 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-4 border-8 border-pink-400 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
             </div>
             <p className="font-[950] text-3xl bg-clip-text text-transparent vibrant-gradient drop-shadow-sm">AI Magic in Progress...</p>
             <p className="text-slate-400 font-bold mt-2">Curating your bilingual vocabulary list</p>
          </div>
        ) : error ? (
          <div className="glass p-16 rounded-[4rem] text-center shadow-2xl border-2 border-rose-100 max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
            <h2 className="text-4xl font-black text-slate-800 mb-4">Something went wrong</h2>
            <p className="mb-10 text-slate-500 font-medium text-lg leading-relaxed">{error}</p>
            <button onClick={() => setError(null)} className="px-12 py-5 vibrant-gradient text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all">Try Again</button>
          </div>
        ) : view === 'exercise' ? (
          <ExerciseView questions={questions} onCancel={() => setView('library')} onComplete={(s) => setFinalScore({score: s, total: questions.length})} />
        ) : finalScore ? (
          <div className="glass max-w-lg mx-auto p-16 rounded-[4rem] shadow-2xl text-center border-b-[16px] border-indigo-600 animate-in zoom-in duration-700">
            <div className="w-32 h-32 vibrant-gradient text-white rounded-full flex items-center justify-center mx-auto mb-10 font-[950] text-4xl shadow-[0_20px_40px_rgba(99,102,241,0.5)]">
              {Math.round((finalScore.score / finalScore.total) * 100)}%
            </div>
            <h2 className="text-5xl font-[950] text-slate-800 mb-4 tracking-tighter">Excellent Progress!</h2>
            <p className="text-xl font-bold text-slate-400 mb-12">Accuracy: {finalScore.score} correct out of {finalScore.total}</p>
            <button onClick={() => { setFinalScore(null); setView('library'); }} className="w-full vibrant-gradient text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all hover:brightness-110">BACK TO LIBRARY</button>
          </div>
        ) : view === 'stats' ? (
          <div className="space-y-12">
            <h2 className="text-5xl font-[950] text-slate-800 tracking-tighter drop-shadow-sm">Learning Analytics</h2>
            <StatsBoard cards={decks.flatMap(d => d.cards)} />
          </div>
        ) : view === 'library' ? (
          <div className="space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <h2 className="text-5xl font-[950] text-slate-800 tracking-tighter drop-shadow-sm">Library Lobby</h2>
              <div className="flex gap-4">
                <button onClick={() => importFileRef.current?.click()} className="px-6 py-3 bg-white/60 hover:bg-white rounded-2xl border border-white shadow-sm text-indigo-600 font-black text-sm transition-all flex items-center gap-2">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                   Restore Backup
                </button>
                <input type="file" ref={importFileRef} className="hidden" accept=".json" onChange={(e) => {
                  const f = e.target.files?.[0]; if(!f) return;
                  const r = new FileReader(); r.onload = (ev) => { try { const d = JSON.parse(ev.target?.result as string); setDecks(prev => [...d, ...prev]); } catch(err) { alert("Invalid backup file."); } }; r.readAsText(f);
                }} />
              </div>
            </div>
            {decks.length === 0 ? (
              <div className="glass p-24 rounded-[4rem] text-center shadow-2xl border-dashed border-4 border-indigo-100">
                <div className="w-24 h-24 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-10"><svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg></div>
                <p className="text-2xl font-black text-slate-800 mb-4 italic">No decks in your lobby yet.</p>
                <p className="text-slate-400 mb-10 font-bold">Start by uploading a document to generate your first word list.</p>
                <button onClick={() => setView('home')} className="vibrant-gradient text-white px-14 py-5 rounded-[2rem] font-[950] text-lg shadow-2xl shadow-indigo-100 hover:scale-105 transition-all">GET STARTED</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10">
                {decks.map(deck => (
                  <div key={deck.id} className="glass group p-10 rounded-[4rem] shadow-xl hover:shadow-[0_30px_60px_rgba(0,0,0,0.1)] transition-all duration-500 hover:-translate-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                    <div className="w-16 h-16 vibrant-gradient rounded-3xl flex items-center justify-center text-white mb-8 shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <h3 className="text-3xl font-[950] text-slate-800 mb-2 truncate drop-shadow-sm">{deck.name}</h3>
                    <p className="font-black text-indigo-500 text-sm mb-10 tracking-widest uppercase">{deck.cards.length} Interactive Cards</p>
                    <div className="flex gap-4">
                      <button onClick={() => { setSelectedDeckId(deck.id); setView('deck-view'); setCurrentIndex(0); }} className="flex-1 vibrant-gradient text-white py-5 rounded-[2rem] font-black text-sm tracking-wider hover:brightness-110 shadow-xl shadow-indigo-100">STUDY</button>
                      <button onClick={() => startQuizForDeck(deck)} className="flex-1 bg-white text-indigo-600 py-5 rounded-[2rem] font-black text-sm tracking-wider border-2 border-indigo-50 hover:bg-indigo-50 transition-all">TEST</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : currentDisplayCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[75vh] py-10">
            <h2 className="text-6xl font-[1000] text-slate-800 mb-2 tracking-tighter drop-shadow-sm leading-tight text-center">Master English with <span className="bg-clip-text text-transparent vibrant-gradient">AI Power</span></h2>
            <p className="text-xl font-bold text-slate-400 mb-12 max-w-2xl text-center leading-relaxed">Turn any document into high-impact bilingual flashcards.</p>

            {/* Compact Configuration Panel */}
            <div className="w-full max-w-4xl glass p-8 rounded-[3rem] shadow-2xl border-2 border-white/80 space-y-10 mb-12 animate-in slide-in-from-bottom-6 duration-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {/* Mode Selector */}
                <div className="space-y-4">
                  <label className="text-xs font-[1000] text-indigo-500 uppercase tracking-widest block pl-1">Scanning Mode</label>
                  <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                    <button onClick={() => setMode('extract')} className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${mode === 'extract' ? 'vibrant-gradient text-white shadow-lg scale-105' : 'text-slate-500 hover:text-indigo-600'}`}>Extract New</button>
                    <button onClick={() => setMode('detect')} className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${mode === 'detect' ? 'vibrant-gradient text-white shadow-lg scale-105' : 'text-slate-500 hover:text-indigo-600'}`}>Detect Existing</button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold px-1">{mode === 'extract' ? "Generate definitions using AI." : "Find definitions inside your file."}</p>
                </div>

                {/* Level Selector */}
                <div className="space-y-4">
                  <label className="text-xs font-[1000] text-pink-500 uppercase tracking-widest block pl-1">Target Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {LEVELS.map(l => (
                      <button 
                        key={l}
                        onClick={() => setLevel(l)}
                        className={`py-2 rounded-xl text-xs font-black transition-all border-2 ${level === l ? 'bg-pink-500 border-pink-500 text-white shadow-lg scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-pink-200'}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity Selector */}
                <div className="space-y-4">
                  <label className="text-xs font-[1000] text-amber-500 uppercase tracking-widest block pl-1">Card Quantity</label>
                  <div className="flex gap-2">
                    {QUANTITIES.map(q => (
                      <button 
                        key={q}
                        onClick={() => setMaxCards(q)}
                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border-2 ${maxCards === q ? 'bg-amber-500 border-amber-500 text-white shadow-lg scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-amber-200'}`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold px-1 text-center">AI will prioritize key academic terms.</p>
                </div>
              </div>

              {/* Refined Upload Box */}
              <label className="relative group block cursor-pointer">
                <div className="absolute inset-0 vibrant-gradient opacity-5 rounded-[2rem] group-hover:opacity-10 transition-opacity"></div>
                <div className="border-4 border-dashed border-indigo-100 group-hover:border-indigo-400 rounded-[2.5rem] p-8 flex items-center justify-center gap-6 transition-all bg-white/40">
                  <div className="w-16 h-16 vibrant-gradient rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:rotate-12 transition-all">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-slate-800">Choose Study Material</h3>
                    <p className="text-sm font-bold text-slate-400">PDF, Word, or TXT (Max 20MB)</p>
                  </div>
                </div>
                <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileUpload} />
              </label>
            </div>

            <div className="flex gap-10 text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
               <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-400"></div> Semantic Analysis</span>
               <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-pink-400"></div> CEFR Filtering</span>
               <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400"></div> Spaced Repetition</span>
            </div>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-12 duration-[1000ms]">
            <div className="flex items-center justify-between">
               <div>
                 <span className="text-xs font-[1000] text-indigo-600 uppercase tracking-[0.3em] bg-indigo-50 px-3 py-1 rounded-full">{view === 'deck-view' ? `COLLECTION: ${selectedDeck?.name}` : "AI EXTRACTION"}</span>
                 <h3 className="text-3xl font-[950] text-slate-800 mt-4 tracking-tighter">Session Card {currentIndex + 1} <span className="text-slate-300">/ {currentDisplayCards.length}</span></h3>
               </div>
               <div className="flex gap-4">
                 {view === 'home' && <button onClick={handleSaveAllToNewDeck} className="px-8 py-4 bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all">Save Collection</button>}
                 <button onClick={() => setView('library')} className="w-12 h-12 glass flex items-center justify-center rounded-2xl text-slate-400 hover:text-rose-500 transition-all shadow-sm">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
               </div>
            </div>

            <Flashcard key={currentDisplayCards[currentIndex].id} card={currentDisplayCards[currentIndex]} onGrade={handleGradeCard} onSave={handleSaveSingleCard} isPracticeMode={view === 'practice' || view === 'deck-view'} />

            <div className="flex flex-col gap-10">
              <div className="flex items-center gap-8">
                <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="flex-1 glass py-8 rounded-[3rem] font-[1000] text-slate-700 shadow-xl disabled:opacity-20 border-b-[12px] border-slate-300 active:translate-y-2 active:border-b-4 transition-all">PREV</button>
                <button onClick={() => setCurrentIndex(Math.min(currentDisplayCards.length - 1, currentIndex + 1))} disabled={currentIndex === currentDisplayCards.length - 1} className="flex-1 vibrant-gradient py-8 rounded-[3rem] font-[1000] text-white shadow-2xl disabled:opacity-20 border-b-[12px] border-indigo-800 active:translate-y-2 active:border-b-4 transition-all">NEXT</button>
              </div>
              <div className="relative h-6 bg-white/60 rounded-full shadow-inner p-1">
                <div className="h-full vibrant-gradient rounded-full transition-all duration-[800ms] shadow-inner" style={{ width: `${((currentIndex + 1) / currentDisplayCards.length) * 100}%` }}></div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Navigation for Mobile */}
      <nav className="sm:hidden fixed bottom-8 left-8 right-8 glass p-3 rounded-[2.5rem] flex justify-between z-50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-2 border-white/80">
        <button onClick={() => setView('home')} className={navItemClass('home')}><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg><span className="text-[10px] font-black uppercase">Start</span></button>
        <button onClick={() => { setView('practice'); setCurrentIndex(0); }} className={navItemClass('practice')}><div className="relative"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{dueCardsAcrossAll.length > 0 && <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black">{dueCardsAcrossAll.length}</span>}</div><span className="text-[10px] font-black uppercase">Due</span></button>
        <button onClick={() => { setView('library'); setCurrentIndex(0); }} className={navItemClass('library')}><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg><span className="text-[10px] font-black uppercase">Lobby</span></button>
        <button onClick={() => setView('stats')} className={navItemClass('stats')}><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2v12" /></svg><span className="text-[10px] font-black uppercase">Stats</span></button>
      </nav>
    </div>
  );
};

export default App;
