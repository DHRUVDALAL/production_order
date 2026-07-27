import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '80vh',
      fontFamily: 'var(--font-sans)',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <ShieldAlert size={64} color="#bb0000" style={{ marginBottom: '1.5rem', display: 'inline' }} />
      <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#32363a', marginBottom: '0.5rem' }}>Access Denied (403)</h2>
      <p style={{ color: '#6a7b8c', maxWidth: '400px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        You do not have the required authorization permissions to access this page. Please contact your Plant Administrator or switch user persona.
      </p>
      <Link to="/" className="sap-btn sap-btn-primary" style={{ textDecoration: 'none' }}>
        Go to Home Dashboard
      </Link>
    </div>
  );
};
