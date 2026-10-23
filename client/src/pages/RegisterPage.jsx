import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Clapperboard } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { errorMessage } from '../api/axiosClient';
import Button from '../components/ui/Button';

const schema = z.object({ username: z.string().trim().min(2, 'Enter at least 2 characters'), email: z.string().trim().email('Enter a valid email address'), password: z.string().min(8, 'Use at least 8 characters').regex(/[A-Z]/, 'Add an uppercase letter').regex(/\d/, 'Add a number'), confirm: z.string(), accepted: z.literal(true, { errorMap: () => ({ message: 'Please accept the terms to continue' }) }) }).refine((data) => data.password === data.confirm, { path: ['confirm'], message: 'Passwords do not match' });
export default function RegisterPage() {
  const { signUp, signIn } = useAuth(); const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });
  const password = watch('password', '');
  const submit = async ({ username, email, password: pass }) => { try { const normalizedEmail = email.trim().toLowerCase(); await signUp({ username: username.trim(), email: normalizedEmail, password: pass }); await signIn({ email: normalizedEmail, password: pass }); toast.success('Your account is ready'); navigate('/movies', { replace: true }); } catch (error) { toast.error(errorMessage(error)); } };
  return <section className="auth-page"><div className="auth-art register-art"><div className="auth-art-copy"><span className="brand-mark"><Clapperboard size={20} /></span><span className="eyebrow">A SEAT WITH YOUR NAME ON IT</span><h1>Stories are<br />better together.</h1><p>Join Reelhouse and make movie night a ritual.</p></div><span className="auth-photo-credit">YOUR NEXT FAVORITE STARTS HERE</span></div><div className="auth-form-side"><Link to="/" className="back-link"><ArrowLeft size={16} /> Back to home</Link><form className="auth-form" onSubmit={handleSubmit(submit)} noValidate><span className="eyebrow">BECOME A MEMBER</span><h2>Create account<span className="brand-dot">.</span></h2><p className="muted">A few details, then pick your movie.</p>
    <label className="field"><span>Name</span><input autoComplete="name" placeholder="Your name" {...register('username')} />{errors.username && <small className="field-error">{errors.username.message}</small>}</label>
    <label className="field"><span>Email</span><input type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />{errors.email && <small className="field-error">{errors.email.message}</small>}</label>
    <label className="field"><span>Password</span><input type="password" autoComplete="new-password" placeholder="At least 8 characters" {...register('password')} />{errors.password && <small className="field-error">{errors.password.message}</small>}<small className="field-hint">{password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password) ? 'Password checks passed' : '8+ characters, one uppercase letter, and one number'}</small></label>
    <label className="field"><span>Confirm password</span><input type="password" autoComplete="new-password" {...register('confirm')} />{errors.confirm && <small className="field-error">{errors.confirm.message}</small>}</label>
    <label className="terms-check"><input type="checkbox" {...register('accepted')} /><span>I agree to the terms of service.</span></label>{errors.accepted && <small className="field-error">{errors.accepted.message}</small>}
    <Button type="submit" size="lg" loading={isSubmitting} className="full-width">Create account <span aria-hidden="true">→</span></Button><p className="auth-switch">Already a member? <Link to="/login">Sign in</Link></p>
  </form></div></section>;
}
