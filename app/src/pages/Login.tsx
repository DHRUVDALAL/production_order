import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, User } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const success = await login(username, password);
    setLoading(false);
    if (success) {
      navigate("/", { replace: true });
    } else {
      setError('Invalid username or password. Check demo users below.');
    }
  };

  const demoUsers = [
    { username: 'admin', role: 'SYS_ADMIN', name: 'Albin Smith (Admin)', pass: 'admin123' },
    { username: 'planner1', role: 'PROD_PLANNER', name: 'Patricia Laine (Planner)', pass: 'planner123' },
    { username: 'operator1', role: 'PROD_OPERATOR', name: 'John Doe (Operator)', pass: 'operator123' },
    { username: 'inv_mgr1', role: 'INV_MANAGER', name: 'Sarah Connor (Inventory)', pass: 'inventory123' },
    { username: 'inspector1', role: 'QUAL_INSPECTOR', name: 'Michael Chang (Quality)', pass: 'inspector123' },
    { username: 'supervisor1', role: 'PLANT_SUPV', name: 'Robert Vance (Supervisor)', pass: 'super123' },
    { username: 'manager1', role: 'PLANT_MGR', name: 'Jane Miller (Plant Manager)', pass: 'manager123' },
    { username: 'purchaser1', role: 'PURCHASER', name: 'Purchaser (Purchasing)', pass: 'purchaser123' },
  ];

  const handleSelectDemoUser = (user: typeof demoUsers[0]) => {
    setUsername(user.username);
    setPassword(user.pass);
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'var(--font-sans)',
      backgroundColor: '#0a2240', // High-end deep corporate dark blue
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '485px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden'
      }}>
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '2rem 1.5rem 1.5rem',
          color: '#082641',
          textAlign: 'center'
        }}>
          <img 
            src="/branding/prodops-logo.png" 
            alt="ProdOps — Production Planning, Execution & Quality Platform" 
            style={{ width: '100%', maxWidth: '320px', height: 'auto', display: 'block', margin: '0 auto 0.6rem' }} 
          />
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            color: '#334155',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.3px'
          }}>
            SAP S/4HANA Production Operations
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ padding: '2rem' }}>
          {error && (
            <div style={{
              backgroundColor: '#ffe3e3',
              border: '1px solid #ffb3b3',
              color: '#bb0000',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: '1.25rem'
            }}>
              {error}
            </div>
          )}

          <div className="sap-form-group">
            <label className="sap-label">Username</label>
            <input 
              type="text" 
              className="sap-input" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. planner1"
              required
            />
          </div>

          <div className="sap-form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="sap-label">Password</label>
            <input 
              type="password" 
              className="sap-input" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            className="sap-btn sap-btn-primary" 
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Log In'}
          </button>
        </form>

        <div style={{ 
          borderTop: '1px solid #eee', 
          backgroundColor: '#f8f9fa', 
          padding: '1.5rem 2rem',
          fontSize: '0.8rem'
        }}>
          <div style={{ fontWeight: 600, color: '#495057', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <User size={14} />
            <span>Select Demo Persona (Autofills credentials)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {demoUsers.map(du => (
              <button 
                key={du.username}
                type="button"
                onClick={() => handleSelectDemoUser(du)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#495057',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0a6ed1'; e.currentTarget.style.backgroundColor = '#f1f8ff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#ced4da'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
              >
                <strong>{du.role}</strong>: {du.username}
              </button>
            ))}
          </div>
          <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid #e9ecef', textAlign: 'center' }}>
            <Link to="/landing" style={{ fontSize: '0.78rem', color: '#0a6ed1', textDecoration: 'none', fontWeight: 600 }}>
              ← Return to ProdOps Platform Overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
