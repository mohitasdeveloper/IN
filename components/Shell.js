'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { sb, today, fd, wdate, setW } from '../lib/db';
const links = [['/', 'Dashboard'], ['/loans', 'Loans'], ['/customers', 'Customers'], ['/reports', 'Reports'], ['/pj', 'PJ']];
export default function Shell({ children }) {
  const [s, setS] = useState(undefined), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [ts, setTs] = useState([]);
  const path = usePathname(), [dark, setDark] = useState(false), [wd, setWd] = useState(today()), dref = useRef(null), gm = useRef(false), [help, setHelp] = useState(false), router = useRouter();
  const flip = () => { const t = dark ? 'light' : 'dark'; document.documentElement.dataset.theme = t; try { localStorage.setItem('theme', t); } catch (e) {} setDark(!dark); };
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark'); setWd(wdate());
    const k = e => {
      if (e.key === 'F2') { e.preventDefault(); dref.current?.showPicker?.(); return; }
      if (e.key === 'Escape') setHelp(false);
      const t = e.target; if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(t.tagName) || t.isContentEditable) return;
      if (gm.current) { gm.current = false; const r = { d: '/', l: '/loans', c: '/customers', p: '/pj', r: '/reports' }[e.key]; if (r) router.push(r); return; }
      if (e.key === 'g') { gm.current = true; setTimeout(() => { gm.current = false; }, 1200); }
      else if (e.key === '/') { e.preventDefault(); document.querySelector('input[type=search]')?.focus(); }
      else if (e.key === '?') setHelp(h => !h);
      else if (e.key === 'n') { const el = document.querySelector('[data-new]'); if (el) { e.preventDefault(); if (el.matches('input,select')) el.focus(); else { el.click(); setTimeout(() => document.querySelector('details[open] input,details[open] select')?.focus(), 60); } } }
    }; window.addEventListener('keydown', k);
    sb.auth.getSession().then(({ data }) => setS(data.session));
    const { data } = sb.auth.onAuthStateChange((_, x) => setS(x));
    const on = e => { const t = { id: Math.random(), ...e.detail }; setTs(a => [...a, t]); setTimeout(() => setTs(a => a.filter(x => x.id !== t.id)), 3500); };
    window.addEventListener('toast', on);
    return () => { data.subscription.unsubscribe(); window.removeEventListener('toast', on); window.removeEventListener('keydown', k); };
  }, []);
  if (s === undefined) return <p className="center">Loading…</p>;
  if (!s) return (
    <form className="card login" onSubmit={async e => { e.preventDefault(); setBusy(true); setErr(''); const f = new FormData(e.target); const { error } = await sb.auth.signInWithPassword({ email: f.get('e'), password: f.get('p') }); setBusy(false); if (error) setErr(error.message); }}>
      <h1>Gold Loan Manager</h1>
      <input name="e" type="email" placeholder="Email" autoComplete="username" required />
      <input name="p" type="password" placeholder="Password" autoComplete="current-password" required />
      <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button><p className="err">{err}</p>
    </form>);
  return (<>
    <nav>{links.map(([h, n]) => <Link key={h} href={h} className={(h === '/' ? path === '/' : path.startsWith(h)) ? 'on' : ''}>{n}</Link>)}
      <span className="sp"><span className="dt"><button className={wd === today() ? 'ghost' : 'warn'} title="Working date (F2)" onClick={() => dref.current?.showPicker?.()}>Date: {fd(wd)}</button><input ref={dref} type="date" value={wd} aria-label="Working date" onChange={e => { if (e.target.value) { setW(e.target.value); setWd(e.target.value); } }} /></span><button className="ghost" title="Keyboard shortcuts" onClick={() => setHelp(h => !h)}>?</button><button className="ghost" onClick={flip}>{dark ? 'Light mode' : 'Dark mode'}</button><button className="ghost" onClick={() => sb.auth.signOut()}>Sign out</button></span></nav>
    <main key={wd}>{children}</main>
    {help && <div className="card help" role="dialog" aria-label="Keyboard shortcuts"><h2>Keyboard shortcuts</h2><p><kbd>F2</kbd> working date</p><p><kbd>n</kbd> new entry on this page</p><p><kbd>/</kbd> search</p><p><kbd>g</kbd> then <kbd>d</kbd> dashboard, <kbd>l</kbd> loans, <kbd>c</kbd> customers, <kbd>p</kbd> PJ, <kbd>r</kbd> reports</p><p><kbd>↑</kbd> <kbd>↓</kbd> move between loan rows, <kbd>Enter</kbd> open or save</p><p><kbd>Esc</kbd> close this</p></div>}
    <div className="toasts" aria-live="polite">{ts.map(t => <div key={t.id} className={'toast ' + t.type}>{t.m}</div>)}</div></>);
}
