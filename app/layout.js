import './globals.css';
import Shell from '../components/Shell';
export const metadata = { title: 'Gold Loan Manager' };
export default function Root({ children }) { return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.dataset.theme=t}catch(e){}" }} /></head><body><Shell>{children}</Shell></body></html>; }
