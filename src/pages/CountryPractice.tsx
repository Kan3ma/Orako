import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const PRACTICE_CATEGORIES=['Boy name','Girl name','Food','Fruit','Country','Capital','Town/City','Car','Animal','Plant','Profession','Celebrity','Sport','Brand','Object'];
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
type Phase='setup'|'shuffle'|'answering'|'review'|'finished';
type RoundResult={letter:string;answers:Record<string,string>;valid:Record<string,boolean>;score:number};

type Props={onBack:()=>void};

const CountryPractice=({onBack}:Props)=>{
  const [phase,setPhase]=useState<Phase>('setup');
  const [duration,setDuration]=useState(60);
  const [rounds,setRounds]=useState(3);
  const [categories,setCategories]=useState(PRACTICE_CATEGORIES.slice(0,6));
  const [round,setRound]=useState(0);
  const [letter,setLetter]=useState('');
  const [displayLetter,setDisplayLetter]=useState('?');
  const [usedLetters,setUsedLetters]=useState<string[]>([]);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [valid,setValid]=useState<Record<string,boolean>>({});
  const [endsAt,setEndsAt]=useState<number|null>(null);
  const [remaining,setRemaining]=useState(duration);
  const [results,setResults]=useState<RoundResult[]>([]);

  const total=useMemo(()=>results.reduce((sum,item)=>sum+item.score,0),[results]);
  const chooseLetter=(used=usedLetters)=>{const available=LETTERS.filter(item=>!used.includes(item));return available[Math.floor(Math.random()*available.length)]??LETTERS[Math.floor(Math.random()*LETTERS.length)];};

  useEffect(()=>{if(phase!=='shuffle')return;let count=0;const timer=window.setInterval(()=>{setDisplayLetter(LETTERS[Math.floor(Math.random()*LETTERS.length)]);count+=1;if(count>=20){clearInterval(timer);setDisplayLetter(letter);window.setTimeout(()=>{setEndsAt(Date.now()+duration*1000);setRemaining(duration);setPhase('answering');},350);}},100);return()=>clearInterval(timer);},[phase,letter,duration]);
  useEffect(()=>{if(phase!=='answering'||!endsAt)return;const timer=window.setInterval(()=>{const next=Math.max(0,Math.ceil((endsAt-Date.now())/1000));setRemaining(next);if(next===0){clearInterval(timer);openReview();}},250);return()=>clearInterval(timer);},[phase,endsAt,answers]);

  const beginRound=()=>{const nextLetter=chooseLetter();setRound(value=>value+1);setLetter(nextLetter);setDisplayLetter('?');setUsedLetters(value=>[...value,nextLetter]);setAnswers({});setValid({});setEndsAt(null);setPhase('shuffle');};
  const skipLetter=()=>{const next=chooseLetter([...usedLetters,letter]);setUsedLetters(value=>Array.from(new Set([...value,letter,next])));setLetter(next);setDisplayLetter('?');setPhase('setup');window.setTimeout(()=>setPhase('shuffle'),0);};
  const openReview=()=>{const checks:Record<string,boolean>={};categories.forEach(category=>{const answer=(answers[category]??'').trim();checks[category]=!!answer&&answer.toLowerCase().startsWith(letter.toLowerCase());});setValid(checks);setPhase('review');};
  const finishReview=()=>{const score=categories.reduce((sum,category)=>sum+(valid[category]?10:0),0);const result={letter,answers:{...answers},valid:{...valid},score};const next=[...results,result];setResults(next);if(round>=rounds)setPhase('finished');else beginRound();};
  const restart=()=>{setPhase('setup');setRound(0);setLetter('');setUsedLetters([]);setAnswers({});setValid({});setEndsAt(null);setRemaining(duration);setResults([]);};
  const toggleCategory=(category:string,checked:boolean)=>{const next=checked?[...categories,category]:categories.filter(item=>item!==category);if(next.length>=3&&next.length<=10)setCategories(next);};

  return <main className="country-page min-h-screen p-4 pt-20 text-slate-100">
    <Button variant="outline" className="absolute left-5 top-5 border-sky-300/50 bg-slate-900 text-sky-100" onClick={phase==='setup'?onBack:restart}><ArrowLeft className="mr-2 h-4 w-4"/>{phase==='setup'?'Back':'End practice'}</Button>
    {phase==='setup'&&<Card className="country-card mx-auto max-w-3xl"><CardHeader><CardTitle className="text-center text-3xl text-gold"><Sparkles className="mr-2 inline"/>Country Game Practice</CardTitle><p className="text-center">Test how many answers you can produce before time runs out.</p></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label className="font-bold">Time per round<select className="mt-2 w-full rounded-md border border-sky-300/30 bg-slate-950 p-3" value={duration} onChange={event=>setDuration(Number(event.target.value))}>{[30,60,90,120,180].map(value=><option key={value} value={value}>{value} seconds</option>)}</select></label><label className="font-bold">Number of rounds<Input className="mt-2" type="number" min={1} max={10} value={rounds} onChange={event=>setRounds(Math.min(10,Math.max(1,Number(event.target.value))))}/></label></div><div><p className="mb-2 font-bold text-sky-100">Categories ({categories.length}/10, minimum 3)</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{PRACTICE_CATEGORIES.map(category=><label key={category} className="country-category"><input type="checkbox" checked={categories.includes(category)} onChange={event=>toggleCategory(category,event.target.checked)}/>{category}</label>)}</div></div><Button className="w-full bg-gradient-gold text-slate-950" onClick={beginRound}>Start practice</Button></CardContent></Card>}
    {phase==='shuffle'&&<Card className="country-card mx-auto max-w-xl text-center"><CardHeader><p>Round {round} of {rounds}</p><CardTitle className="text-3xl text-gold">Choosing your letter...</CardTitle></CardHeader><CardContent><div className="country-letter-reveal is-shuffling mx-auto mb-6 flex h-44 w-44 items-center justify-center rounded-full border-4 border-sky-300/60 bg-sky-950 text-8xl font-black text-sky-300">{displayLetter}</div><Button variant="outline" onClick={skipLetter}>Shuffle another letter</Button></CardContent></Card>}
    {phase==='answering'&&<div className="mx-auto max-w-4xl"><div className="mb-5 flex items-center justify-between"><div><p>Round {round}/{rounds}</p><h1 className="text-5xl font-black text-gold">Letter {letter}</h1></div><div className="country-card rounded-xl p-4 text-2xl font-black text-sky-200"><Clock3 className="mr-2 inline"/>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</div></div><div className="overflow-hidden rounded-xl border border-sky-300/20 bg-slate-900/95"><table className="w-full"><thead><tr><th className="p-3 text-left">Category</th><th className="p-3 text-left">Your answer</th></tr></thead><tbody>{categories.map(category=><tr key={category} className="border-t border-sky-300/15"><td className="p-3 font-bold text-sky-200">{category}</td><td className="p-2"><Input autoComplete="off" value={answers[category]??''} onChange={event=>setAnswers({...answers,[category]:event.target.value})} placeholder={`${letter}…`}/></td></tr>)}</tbody></table></div><Button className="mt-4 bg-gradient-gold text-slate-950" onClick={openReview}>Finish round</Button></div>}
    {phase==='review'&&<Card className="country-card mx-auto max-w-3xl"><CardHeader><CardTitle className="text-gold">Review round {round}</CardTitle><p>Be honest: select answers that are valid for their category. Each accepted answer is worth 10 points.</p></CardHeader><CardContent><div className="space-y-2">{categories.map(category=><label key={category} className="flex items-center gap-3 rounded-lg border border-sky-300/15 p-3"><input type="checkbox" checked={valid[category]??false} onChange={event=>setValid({...valid,[category]:event.target.checked})}/><span className="w-36 font-bold text-sky-200">{category}</span><span className="flex-1">{answers[category]||'No answer'}</span><b>{valid[category]?10:0} pts</b></label>)}</div><Button className="mt-5 w-full bg-gradient-gold text-slate-950" onClick={finishReview}>{round>=rounds?'See final score':`Continue to round ${round+1}`}</Button></CardContent></Card>}
    {phase==='finished'&&<Card className="country-card mx-auto max-w-3xl"><CardHeader><CardTitle className="text-center text-4xl text-gold"><Trophy className="mr-2 inline"/>Practice complete</CardTitle><p className="text-center text-xl">You scored <b className="text-sky-300">{total}</b> points.</p></CardHeader><CardContent><div className="overflow-auto"><table className="w-full"><thead><tr><th className="p-3 text-left">Round</th><th>Letter</th><th>Correct answers</th><th>Score</th></tr></thead><tbody>{results.map((result,index)=><tr key={index} className="border-t border-sky-300/20 text-center"><td className="p-3 text-left">{index+1}</td><td className="text-2xl font-black text-sky-300">{result.letter}</td><td>{Object.values(result.valid).filter(Boolean).length}/{categories.length}</td><td className="font-bold">{result.score}</td></tr>)}</tbody></table></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Button className="bg-gradient-gold text-slate-950" onClick={restart}><RotateCcw className="mr-2 h-4 w-4"/>Practice again</Button><Button variant="outline" onClick={onBack}><CheckCircle2 className="mr-2 h-4 w-4"/>Country Game home</Button></div></CardContent></Card>}
  </main>;
};

export default CountryPractice;
