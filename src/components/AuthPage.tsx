import { useState } from 'react';
import { Mail, Lock, User as UserIcon, Phone, ArrowLeft, Loader2, ShieldCheck, Users, Eye, EyeOff, Truck } from 'lucide-react';
import { useAuth } from '../lib/auth';

interface AuthPageProps {
  onBack?: () => void;
}

export default function AuthPage({ onBack }: AuthPageProps) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [portal, setPortal] = useState<'customer' | 'staff'>('customer');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  function switchPortal(p: 'customer' | 'staff') {
    setPortal(p);
    setMode('login');
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    if (mode === 'login') {
      const { error } = await signIn(email.trim(), password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email.trim(), password, name.trim(), phone.trim());
      if (error) setError(error);
    }
    setBusy(false);
  }

  async function handleGoogle() {
    setError(null);
    setGoogleBusy(true);
    const { error } = await signInWithGoogle();
    if (error) { setError(error); setGoogleBusy(false); }
  }

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-[960px] bg-white rounded-[28px] shadow-elevated overflow-hidden grid md:grid-cols-2">
        {onBack && (
          <button onClick={onBack} className="absolute top-5 right-5 z-20 inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white bg-black/20 hover:bg-black/30 backdrop-blur px-3 py-1.5 rounded-full transition-colors md:text-ink-400 md:bg-transparent md:hover:bg-ink-50 md:hover:text-ink-700">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </button>
        )}

        {/* Left visual panel */}
        <div className="relative hidden md:flex flex-col justify-between p-8 min-h-[600px] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1749244768351-2726dc23d26c?fm=jpg&q=80&w=1200&auto=format&fit=crop"
            alt="Warehouse hub"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/60 to-ink-950/20" />

          <div className="relative flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-white backdrop-blur bg-white/10 border border-white/15 px-2 py-1 rounded-full">GRTV Speed Parcel Service</span>
          </div>

          <div className="relative">
            <h2 className="text-3xl font-extrabold text-white leading-tight">
              Every parcel,<br />on track.
            </h2>
            <p className="text-white/70 text-sm mt-3 max-w-xs">
              Book, track, and manage LTL &amp; FTL shipments across every hub — from pickup to final delivery.
            </p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="p-7 sm:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-6 border-b border-ink-100 mb-6">
            <button
              onClick={() => switchPortal('customer')}
              className={`relative pb-3 flex items-center gap-1.5 text-sm font-semibold transition-colors ${portal === 'customer' ? 'text-ink-900' : 'text-ink-400 hover:text-ink-600'}`}
            >
              <Users className="w-4 h-4" /> Customer
              {portal === 'customer' && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-brand-600 rounded-full" />}
            </button>
            <button
              onClick={() => switchPortal('staff')}
              className={`relative pb-3 flex items-center gap-1.5 text-sm font-semibold transition-colors ${portal === 'staff' ? 'text-ink-900' : 'text-ink-400 hover:text-ink-600'}`}
            >
              <ShieldCheck className="w-4 h-4" /> Staff
              {portal === 'staff' && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-brand-600 rounded-full" />}
            </button>
          </div>

          <div key={`${portal}-${mode}`} className="animate-slide-up">
            <h1 className="text-2xl font-extrabold text-ink-900 mb-1.5">
              {portal === 'staff' ? 'Staff sign in' : mode === 'login' ? 'Welcome back to GRTV' : 'Create your account'}
            </h1>
            <p className="text-sm text-ink-500 mb-7">
              {portal === 'staff'
                ? 'Use the credentials your admin gave you.'
                : mode === 'login'
                ? 'Book, track, and manage shipments effortlessly with our logistics platform.'
                : 'Sign up to start booking shipments in seconds.'}
            </p>

            {portal === 'staff' && (
              <div className="mb-6 p-3 rounded-xl bg-brand-50 border border-brand-100 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                <p className="text-xs text-brand-800 leading-relaxed">
                  Admin, Hub Operator, and Driver accounts are created by your administrator — there's no self sign-up for staff. If you don't have login details yet, contact your admin.
                </p>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {portal === 'customer' && mode === 'signup' && (
                <>
                  <div>
                    <label className="label">Full Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                      <input className="input pl-9" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                      <input className="input pl-9" placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <input type="email" className="input pl-9" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="label mb-0">Password</label>
                  {portal === 'customer' && mode === 'login' && (
                    <button type="button" className="text-xs font-semibold text-brand-700 hover:text-brand-800 mb-1.5">Forgot password?</button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <input type={showPassword ? 'text' : 'password'} className="input pl-9 pr-10" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {portal === 'customer' && mode === 'login' && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm text-ink-600">Remember me on this device</span>
                  <button
                    type="button"
                    onClick={() => setRemember((v) => !v)}
                    className={`relative w-10 h-[22px] rounded-full transition-colors shrink-0 ${remember ? 'bg-brand-600' : 'bg-ink-200'}`}
                  >
                    <span className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform ${remember ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-danger-50 border border-danger-100 text-sm text-danger-700 animate-shake">{error}</div>
              )}

              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (portal === 'staff' || mode === 'login') ? 'Log In' : 'Create Account'}
              </button>
            </form>

            {portal === 'customer' && (
              <>
                <div className="flex items-center gap-2 my-5">
                  <div className="flex-1 h-px bg-ink-100" />
                  <span className="text-xs text-ink-400">or</span>
                  <div className="flex-1 h-px bg-ink-100" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={googleBusy}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-ink-200 bg-white hover:bg-ink-50 hover:border-ink-300 text-sm font-semibold text-ink-700 transition-all disabled:opacity-60 active:scale-[0.98]"
                >
                  {googleBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.63h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.8z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.25 21.3 7.31 24 12 24z" />
                      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.6H1.27A11.98 11.98 0 000 12c0 1.93.46 3.76 1.27 5.4l4-3.11z" />
                      <path fill="#EA4335" d="M12 4.75c1.76 0 3.35.6 4.6 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.6l4 3.11C6.22 6.86 8.87 4.75 12 4.75z" />
                    </svg>
                  )}
                  Continue with Google
                </button>

                <p className="text-center text-sm text-ink-500 mt-6">
                  {mode === 'login' ? (
                    <>Don't have an account? <button onClick={() => { setMode('signup'); setError(null); }} className="font-semibold text-brand-700 hover:text-brand-800">Sign up</button></>
                  ) : (
                    <>Already have an account? <button onClick={() => { setMode('login'); setError(null); }} className="font-semibold text-brand-700 hover:text-brand-800">Log in</button></>
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}