import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { UserRound, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth';
import Button from '../components/ui/Button';

export default function ProfilePage() {
  const { user, signOut, isAdmin } = useAuth(); const navigate = useNavigate();
  const logout = async () => { try { await signOut(); toast.success('Signed out'); navigate('/'); } catch { toast.error('Could not sign out.'); } };
  return <section className="container section page-enter"><div className="page-heading"><div><span className="eyebrow">ACCOUNT</span><h1>Your profile<span className="brand-dot">.</span></h1></div></div><div className="profile-panel"><div className="profile-avatar"><UserRound size={27} /></div><div><span className="eyebrow">MEMBER</span><h2>{user?.username || user?.email || 'Reelhouse member'}</h2><p>{user?.email}</p><span className={`badge ${isAdmin ? 'badge-warning' : 'badge-neutral'}`}>{isAdmin ? 'Administrator' : 'Member'}</span></div></div><div className="notice"><p>Password changes and profile editing are not supported by the current API.</p></div><div className="profile-actions"><Link className="btn btn-secondary" to="/reservations">View reservations</Link><Button variant="danger" onClick={logout}><LogOut size={16} /> Sign out</Button></div></section>;
}
