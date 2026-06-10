import { useMemo, useState } from 'react';
import type { ScheduleData, Week, LogEntry, RunningLog } from './types';
import rawData from './data.json';
import rawLog from './runningLog.json';

const data = rawData as unknown as ScheduleData;
const logData = rawLog as unknown as RunningLog;

// Build log lookup: key = "week-day" -> LogEntry
const logLookup = new Map<string, LogEntry>();
for (const entry of logData.entries) {
  logLookup.set(`${entry.week_number}-${entry.day_name}`, entry);
}
function getLog(week: number, day: string): LogEntry | undefined {
  return logLookup.get(`${week}-${day}`);
}
function isDone(week: number, day: string): boolean {
  return !!getLog(week, day);
}

const TYPE_COLORS: Record<string, string> = {
  run: 'border-l-orange-500 bg-orange-500/5',
  strength: 'border-l-purple-500 bg-purple-500/5',
  mobility: 'border-l-cyan-500 bg-cyan-500/5',
  rest: 'border-l-zinc-600 bg-zinc-800/50',
  race: 'border-l-amber-400 bg-amber-400/10',
  other: 'border-l-zinc-600 bg-zinc-800/50',
};

function getTodayDayName(): string {
  try {
    return new Date().toLocaleDateString('id-ID', { weekday: 'long' });
  } catch {
    const map = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return map[new Date().getDay()];
  }
}

function getCurrentWeek(startDate: string): number {
  const start = new Date(startDate);
  const today = new Date();
  const diff = today.getTime() - start.getTime();
  const week = Math.floor(diff / (7 * 86400000)) + 1;
  return Math.max(1, Math.min(data.total_weeks, week));
}

function typeIcon(type: string): string {
  switch (type) {
    case 'run': return '🏃';
    case 'strength': return '💪';
    case 'mobility': return '🧘';
    case 'rest': return '🛌';
    case 'race': return '🔥';
    default: return '📋';
  }
}

function ProgressBar({ pct, className = '' }: { pct: number; className?: string }) {
  return (
    <div className={`h-1.5 bg-zinc-800 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

/* ======== SCHEDULE VIEW ======== */

function PhaseIndicator({ week }: { week: Week }) {
  return (
    <div className="text-center mb-2">
      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 tracking-wide uppercase">
        {week.phase.replace('FASE ', 'Fase ')}
      </span>
    </div>
  );
}

function WeekNav({ week, totalWeeks, onPrev, onNext }: {
  week: number; totalWeeks: number; onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <button onClick={onPrev} disabled={week <= 1}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed active:bg-zinc-700 transition-colors"
        aria-label="Previous week">◀</button>
      <div className="text-center">
        <div className="text-lg font-bold text-white">Minggu {week}</div>
        <div className="text-xs text-zinc-400">dari {totalWeeks}</div>
      </div>
      <button onClick={onNext} disabled={week >= totalWeeks}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed active:bg-zinc-700 transition-colors"
        aria-label="Next week">▶</button>
    </div>
  );
}

function DayCard({ day, type, emoji, label, detail, isToday, done, logEntry }: {
  day: string; type: string; emoji: string; label: string; detail: string;
  isToday: boolean; done: boolean; logEntry?: LogEntry;
}) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = TYPE_COLORS[type] || TYPE_COLORS.other;

  return (
    <div className={`rounded-xl border-l-4 p-4 mb-3 transition-all duration-200 ${colorClass} ${isToday ? 'ring-1 ring-zinc-500' : ''} ${done && !expanded ? 'opacity-40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              {day} {isToday && <span className="ml-2 text-xs text-zinc-400">• Hari ini</span>}
            </span>
            {done && <span className="text-[10px] text-emerald-400">● Selesai</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{emoji || typeIcon(type)}</span>
            <span className="font-medium text-white text-sm leading-tight">{logEntry?.title || label}</span>
          </div>

          {/* Collapsed preview */}
          {detail && !expanded && (
            <div className="text-xs text-zinc-500 ml-9 truncate mt-0.5">
              {detail.replace(/\*\*/g, '').slice(0, 60)}{detail.length > 60 ? '…' : ''}
            </div>
          )}

          {/* Expanded log detail */}
          {expanded && (
            <div className="mt-3 ml-9 space-y-3">
              {/* Schedule detail */}
              {detail && (
                <div className="text-xs text-zinc-400 leading-relaxed border-l border-zinc-700 pl-3">
                  {detail.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                </div>
              )}

              {/* Log key-values */}
              {logEntry?.key_value && Object.keys(logEntry.key_value).length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {Object.entries(logEntry.key_value).map(([k, v]) => (
                    <span key={k} className="text-zinc-400">
                      <span className="text-zinc-500">{k}:</span> {v}
                    </span>
                  ))}
                </div>
              )}

              {/* Log tables */}
              {logEntry?.tables?.map((table, ti) => (
                <div key={ti} className="overflow-x-auto">
                  <table className="w-full text-[10px] text-zinc-300 border-collapse">
                    <thead>
                      <tr>
                        {table.header.map((h, hi) => (
                          <th key={hi} className="text-left text-zinc-500 font-medium px-2 py-1 border-b border-zinc-700 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-2 py-1 border-b border-zinc-800/50 whitespace-nowrap">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {/* Assessment */}
              {logEntry?.assessment && (
                <div className="text-xs text-zinc-300 pl-2 border-l-2 border-emerald-500/50 italic">
                  {logEntry.assessment}
                </div>
              )}

              {/* Catatan audit */}
              {logEntry?.catatan_audit && (
                <div className="text-xs text-amber-400/80 pl-2 border-l-2 border-amber-500/50">
                  📝 {logEntry.catatan_audit}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Done indicator */}
        <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${
          done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'
        }`}>
          {done ? '✓' : '○'}
        </div>
      </div>
    </div>
  );
}

function WeekProgress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
        <span>Progress minggu ini</span>
        <span>{done}/{total} ({pct}%)</span>
      </div>
      <ProgressBar pct={pct} />
    </div>
  );
}

function WeekNotes({ notes }: { notes: string }) {
  if (!notes) return null;
  return (
    <div className="mb-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
      <div className="text-xs text-zinc-300 leading-relaxed">
        {notes.split(/\*\*(.*?)\*\*/).map((part, i) =>
          i % 2 === 1 ? <strong key={i} className="text-orange-300">{part}</strong> : part
        )}
      </div>
    </div>
  );
}

function WeekView({ week, todayDay }: { week: Week; todayDay: string }) {
  const days = week.days.map(d => d.day);
  const done = days.filter(d => isDone(week.week, d)).length;
  const total = days.length;

  return (
    <div className="px-4 pb-4">
      <PhaseIndicator week={week} />
      {week.total && (
        <div className="text-center mb-4">
          <span className="inline-block text-xs font-mono text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded">
            Total ~{week.total}
          </span>
        </div>
      )}
      {week.subtext && (
        <div className="text-center mb-4">
          <span className="text-xs text-amber-400/80 italic">{week.subtext}</span>
        </div>
      )}
      <WeekProgress done={done} total={total} />
      <WeekNotes notes={week.notes} />
      {week.days.map((day) => (
        <DayCard key={day.day} day={day.day} type={day.type} emoji={day.emoji}
          label={day.label} detail={day.detail}
          isToday={day.day === todayDay}
          done={isDone(week.week, day.day)}
          logEntry={getLog(week.week, day.day)} />
      ))}
    </div>
  );
}

/* ======== SUMMARY VIEW ======== */

function streakCount(): number {
  const allKeys: string[] = [];
  for (const w of data.weeks) {
    for (const d of w.days) {
      allKeys.push(`${w.week}-${d.day}`);
    }
  }
  let count = 0;
  for (let i = allKeys.length - 1; i >= 0; i--) {
    if (logLookup.has(allKeys[i])) count++;
    else break;
  }
  return count;
}

function SummaryView() {
  const totalDays = data.weeks.reduce((sum, w) => sum + w.days.length, 0);
  const totalDone = logData.entries.length;
  const overallPct = Math.round((totalDone / totalDays) * 100);
  const streak = streakCount();

  // Count by type
  const typeCount: Record<string, { done: number; total: number }> = {};
  for (const w of data.weeks) {
    for (const d of w.days) {
      if (!typeCount[d.type]) typeCount[d.type] = { done: 0, total: 0 };
      typeCount[d.type].total++;
      if (isDone(w.week, d.day)) typeCount[d.type].done++;
    }
  }

  const typeLabels: Record<string, { emoji: string; label: string }> = {
    run: { emoji: '🏃', label: 'Lari' },
    strength: { emoji: '💪', label: 'Strength' },
    mobility: { emoji: '🧘', label: 'Mobility' },
    rest: { emoji: '🛌', label: 'Istirahat' },
    race: { emoji: '🔥', label: 'Race' },
  };

  // Phase progress
  const daysByWeek: Record<number, string[]> = {};
  for (const w of data.weeks) {
    daysByWeek[w.week] = w.days.map(d => d.day);
  }

  const phaseDone = (weeks: [number, number]): { done: number; total: number } => {
    let done = 0, total = 0;
    for (let w = weeks[0]; w <= weeks[1]; w++) {
      const days = daysByWeek[w] || [];
      total += days.length;
      done += days.filter(d => isDone(w, d)).length;
    }
    return { done, total };
  };

  return (
    <div className="px-4 pb-4 space-y-6">
      {/* Hero */}
      <div className="text-center pt-2">
        <div className="text-4xl mb-2">📊</div>
        <h2 className="text-lg font-bold text-white">Progress Program</h2>
        <p className="text-xs text-zinc-500 mt-0.5">{data.athlete} • {data.title}</p>
      </div>

      {/* Overall ring */}
      <div className="flex justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#27272a" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="url(#grad)" strokeWidth="8"
              strokeDasharray={`${overallPct * 2.638}, 263.8`} strokeLinecap="round" />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{overallPct}%</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">selesai</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">{totalDone}</div>
          <div className="text-xs text-zinc-500">Hari selesai</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-orange-400">{totalDays - totalDone}</div>
          <div className="text-xs text-zinc-500">Sisa hari</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">
            {streak > 0 ? `🔥 ${streak}` : '—'}
          </div>
          <div className="text-xs text-zinc-500">Streak</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">{data.total_weeks}</div>
          <div className="text-xs text-zinc-500">Total minggu</div>
        </div>
      </div>

      {/* Per type */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Per Jenis Latihan</h3>
        <div className="space-y-2">
          {Object.entries(typeLabels).map(([type, meta]) => {
            const t = typeCount[type];
            if (!t || t.total === 0) return null;
            const pct = Math.round((t.done / t.total) * 100);
            return (
              <div key={type} className="bg-zinc-900 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-zinc-300">{meta.emoji} {meta.label}</span>
                  <span className="text-xs text-zinc-500">{t.done}/{t.total} ({pct}%)</span>
                </div>
                <ProgressBar pct={pct} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Per fase */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Per Fase</h3>
        <div className="space-y-3">
          {data.phases.map((phase) => {
            const p = phaseDone(phase.weeks);
            const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
            const active = getCurrentWeek(data.start_date) >= phase.weeks[0] &&
              getCurrentWeek(data.start_date) <= phase.weeks[1];
            return (
              <div key={phase.name} className={`bg-zinc-900 rounded-lg p-3 ${active ? 'ring-1 ring-orange-500/30' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">
                    {phase.name.replace('FASE ', 'Fase ')}
                  </span>
                  {active && <span className="text-[10px] text-orange-400 font-medium">● Aktif</span>}
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-zinc-200">Minggu {phase.weeks[0]}-{phase.weeks[1]}</span>
                  <span className="text-xs text-zinc-500">{p.done}/{p.total} ({pct}%)</span>
                </div>
                <ProgressBar pct={pct} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Per minggu */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Per Minggu</h3>
        <div className="space-y-1.5">
          {data.weeks.map((w) => {
            const days = w.days.map(d => d.day);
            const done = days.filter(d => isDone(w.week, d)).length;
            const total = days.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const curr = w.week === getCurrentWeek(data.start_date);
            return (
              <div key={w.week} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${curr ? 'bg-zinc-800' : 'bg-zinc-900/50'}`}>
                <span className={`w-7 text-center text-xs font-bold ${curr ? 'text-orange-400' : 'text-zinc-500'}`}>W{w.week}</span>
                <div className="flex-1">
                  <ProgressBar pct={pct} className="h-1" />
                </div>
                <span className="text-xs text-zinc-500 w-10 text-right">{done}/{total}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ======== APP ======== */

export default function App() {
  const startDate = data.start_date || '2026-06-08';
  const [currentWeek, setCurrentWeek] = useState(() => getCurrentWeek(startDate));
  const [tab, setTab] = useState<'schedule' | 'summary'>('schedule');
  const todayDay = useMemo(() => getTodayDayName(), []);

  const week = data.weeks.find(w => w.week === currentWeek);
  const goToWeek = (w: number) => setCurrentWeek(Math.max(1, Math.min(data.total_weeks, w)));

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-white">🏃 Lari</h1>
            <p className="text-[10px] text-zinc-500">{data.athlete}</p>
          </div>
          <div className="flex gap-1">
            {data.phases.map((phase, i) => {
              const [s, e] = phase.weeks;
              const active = getCurrentWeek(startDate) >= s && getCurrentWeek(startDate) <= e;
              return (
                <span key={i}
                  className={`px-2 py-0.5 rounded text-[10px] leading-tight transition-colors ${
                    active ? 'bg-orange-500/20 text-orange-300' : 'text-zinc-600'
                  }`}>F{i + 1}</span>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full pt-4 overflow-y-auto">
        {tab === 'summary' ? (
          <SummaryView />
        ) : (
          <>
            <div className="px-4 mb-2">
              <div className="flex items-center justify-center gap-1.5">
                {Array.from({ length: data.total_weeks }, (_, i) => i + 1).map((w) => (
                  <button key={w} onClick={() => goToWeek(w)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      w === currentWeek ? 'bg-orange-400 scale-125' : 'bg-zinc-700 hover:bg-zinc-600'
                    }`}
                    aria-label={`Go to week ${w}`} />
                ))}
              </div>
            </div>
            {week ? (
              <WeekView week={week} todayDay={todayDay} />
            ) : (
              <div className="text-center py-12 text-zinc-500">Data tidak ditemukan</div>
            )}
            <div className="px-4 py-3 border-t border-zinc-800">
              <WeekNav week={currentWeek} totalWeeks={data.total_weeks}
                onPrev={() => goToWeek(currentWeek - 1)}
                onNext={() => goToWeek(currentWeek + 1)} />
            </div>
          </>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="sticky bottom-0 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800">
        <div className="max-w-lg mx-auto flex">
          <button onClick={() => setTab('schedule')}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors ${
              tab === 'schedule' ? 'text-orange-400' : 'text-zinc-600'
            }`}>
            <span className="text-lg">📅</span>
            <span className="text-[10px] font-medium">Jadwal</span>
          </button>
          <button onClick={() => setTab('summary')}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors ${
              tab === 'summary' ? 'text-orange-400' : 'text-zinc-600'
            }`}>
            <span className="text-lg">📊</span>
            <span className="text-[10px] font-medium">Progress</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
