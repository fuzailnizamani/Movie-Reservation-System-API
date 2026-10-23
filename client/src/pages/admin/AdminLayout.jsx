import { Link, Outlet } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import AdminSidebar from '../../components/admin/AdminSidebar';

export default function AdminLayout() {
  return <div className="admin-shell"><AdminSidebar /><div className="admin-main"><header className="admin-topbar"><span className="eyebrow">REELHOUSE / STUDIO</span><span><Link to="/admin">Management console <ChevronRight size={14} /></Link></span></header><div className="admin-content"><Outlet /></div></div></div>;
}
