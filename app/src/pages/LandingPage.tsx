import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ClipboardList, 
  Wrench, 
  ShieldCheck, 
  PackageCheck, 
  Database, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Cpu, 
  ChevronRight, 
  Server, 
  RotateCcw,
  Check,
  Menu,
  X
} from 'lucide-react';
import { ProdOpsLogo, ProdOpsIcon } from '../components/ProdOpsBrand';

export const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#1e293b',
      fontFamily: 'var(--font-sans)',
      lineHeight: 1.5,
      overflowX: 'hidden'
    }}>
      {/* ========================================================================= */}
      {/* 1. TOP UTILITY BAR (SAP ECOSYSTEM NOTICE) */}
      {/* ========================================================================= */}
      <div style={{
        backgroundColor: '#082641',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '6px 1.5rem',
        fontSize: '0.75rem',
        color: '#cbd5e1',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#10b981'
          }} />
          <span style={{ fontWeight: 600, color: '#f8fafc' }}>SAP S/4HANA Integration Ready</span>
          <span style={{ color: '#64748b' }}>•</span>
          <span>Discrete & Process Manufacturing Operations</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#94a3b8' }}>Release 2026.1 • Enterprise Edition</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ENTERPRISE HEADER */}
      {/* ========================================================================= */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Official Brand Logo */}
          <Link to="/landing" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <ProdOpsLogo height={38} variant="light" />
          </Link>

          {/* Navigation Links */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem'
          }} className="desktop-nav">
            <a href="#platform" style={{ color: '#334155', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>Platform</a>
            <a href="#production" style={{ color: '#334155', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>Production</a>
            <a href="#quality" style={{ color: '#334155', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>Quality Control</a>
            <a href="#integration" style={{ color: '#334155', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>SAP Integration</a>
            <a href="#movements" style={{ color: '#334155', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>Goods Movements</a>
          </nav>

          {/* Header Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link 
              to="/login"
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: '#082641',
                padding: '0.5rem 1.25rem',
                borderRadius: '6px',
                textDecoration: 'none',
                transition: 'all 0.15s',
                boxShadow: '0 2px 4px rgba(8, 38, 65, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Sign In</span>
              <ArrowRight size={14} />
            </Link>
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: 'none',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                color: '#334155',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-nav-drawer" style={{
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            padding: '1rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <a href="#platform" onClick={() => setMobileMenuOpen(false)} style={{ color: '#334155', textDecoration: 'none', fontWeight: 600, padding: '6px 0' }}>Platform</a>
            <a href="#production" onClick={() => setMobileMenuOpen(false)} style={{ color: '#334155', textDecoration: 'none', fontWeight: 600, padding: '6px 0' }}>Production</a>
            <a href="#quality" onClick={() => setMobileMenuOpen(false)} style={{ color: '#334155', textDecoration: 'none', fontWeight: 600, padding: '6px 0' }}>Quality Control</a>
            <a href="#integration" onClick={() => setMobileMenuOpen(false)} style={{ color: '#334155', textDecoration: 'none', fontWeight: 600, padding: '6px 0' }}>SAP Integration</a>
            <a href="#movements" onClick={() => setMobileMenuOpen(false)} style={{ color: '#334155', textDecoration: 'none', fontWeight: 600, padding: '6px 0' }}>Goods Movements</a>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 3. HERO SECTION */}
      {/* ========================================================================= */}
      <section style={{
        backgroundColor: '#082641',
        backgroundImage: 'radial-gradient(ellipse at 80% 20%, rgba(1, 108, 225, 0.18) 0%, transparent 60%)',
        color: '#ffffff',
        padding: '4rem 1.5rem 5rem 1.5rem',
        borderBottom: '1px solid #1e3a5f'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3.5rem',
            alignItems: 'center'
          }}>
            {/* Hero Left Content */}
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: '20px',
                padding: '4px 12px',
                marginBottom: '1.5rem'
              }}>
                <ProdOpsIcon size={16} />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.3px', color: '#93c5fd' }}>
                  Enterprise Production Operations Platform
                </span>
              </div>

              <h1 style={{
                fontSize: 'clamp(2.4rem, 4vw, 3.4rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.8px',
                marginBottom: '1.25rem'
              }}>
                Run Production.<br />
                Control Operations.<br />
                <span style={{ color: '#38bdf8' }}>Deliver Quality.</span>
              </h1>

              <p style={{
                fontSize: '1.05rem',
                color: '#cbd5e1',
                lineHeight: 1.6,
                maxWidth: '560px',
                marginBottom: '2rem'
              }}>
                ProdOps connects production planning, shop-floor execution, quality inspection,
                operation confirmations, and material movements through an enterprise operational experience
                designed around SAP S/4HANA processes.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                <a
                  href="#platform"
                  style={{
                    backgroundColor: '#016ce1',
                    color: '#ffffff',
                    padding: '0.85rem 1.75rem',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(1, 108, 225, 0.4)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <span>Explore Platform</span>
                  <ChevronRight size={16} />
                </a>

                <a
                  href="#lifecycle"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    padding: '0.85rem 1.5rem',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Production Lifecycle</span>
                </a>
              </div>

              {/* Status pills */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1.5rem',
                marginTop: '2.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.8rem',
                color: '#94a3b8'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={14} color="#38bdf8" />
                  <span>Discrete & Process Orders</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={14} color="#38bdf8" />
                  <span>SAP Movement 261 / 101</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={14} color="#38bdf8" />
                  <span>QM Inspection & UD</span>
                </div>
              </div>
            </div>

            {/* Hero Right Visual: Process Flow Monitoring Console */}
            <div>
              <div style={{
                backgroundColor: '#0c2e4e',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '1.25rem',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
              }}>
                {/* Console Bar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '0.75rem',
                  marginBottom: '1rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                      PRODOPS PIPELINE MONITOR
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontFamily: 'monospace',
                    color: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    ORDER #1000284 • REL
                  </span>
                </div>

                {/* Process Step Chain */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {/* Step 1 */}
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: '#0a6ed1',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>01</div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>Production Order</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Material: MZ-FG-R100 • Plant 1010</div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#0ca678',
                      backgroundColor: 'rgba(12, 166, 120, 0.15)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>RELEASED (REL)</span>
                  </div>

                  {/* Step 2 */}
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: '#0a6ed1',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>02</div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>Goods Issue (261)</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Bill of Materials Components Posted</div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#0ca678',
                      backgroundColor: 'rgba(12, 166, 120, 0.15)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>ISSUED (GI)</span>
                  </div>

                  {/* Step 3 */}
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: '#016ce1',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>03</div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>Operation 0010 Confirmation</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Work Center: WC-ASSY • Yield: 100 EA</div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#38bdf8',
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>CONFIRMED (CNF)</span>
                  </div>

                  {/* Step 4 */}
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: '#7048e8',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>04</div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>Quality Inspection Lot</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Lot #4000102 • Usage Decision: Accepted</div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#a855f7',
                      backgroundColor: 'rgba(168, 85, 247, 0.15)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>APPROVED</span>
                  </div>

                  {/* Step 5 */}
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: '#087f5b',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>05</div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>Goods Receipt (101)</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Material Doc #49000188 • Unrestricted Stock</div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#22c55e',
                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>COMPLETED (GR)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. BUILT AROUND SAP S/4HANA (ARCHITECTURE SECTION) */}
      {/* ========================================================================= */}
      <section id="integration" style={{
        padding: '5rem 1.5rem',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem' }}>
            <div style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#0a6ed1',
              backgroundColor: '#e8f4fd',
              padding: '3px 10px',
              borderRadius: '4px',
              marginBottom: '0.75rem'
            }}>
              System Architecture & Data Flow
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#082641', marginBottom: '0.75rem' }}>
              Built Around SAP S/4HANA
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#51585f' }}>
              ProdOps provides an enterprise application experience around SAP production processes
              and integrated business data, maintaining end-to-end synchronization with enterprise backends.
            </p>
          </div>

          {/* Clean Enterprise Architecture Diagram */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            position: 'relative'
          }}>
            {/* Layer 1: ProdOps UI */}
            <div style={{
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#082641',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <ProdOpsIcon size={22} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#082641', marginBottom: '0.25rem' }}>ProdOps UI</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>SAP Fiori Horizon Design System with responsive web interfaces</p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', fontWeight: 600, color: '#0a6ed1' }}>
                React 19 • UI5 Components
              </div>
            </div>

            {/* Layer 2: Real-Time State Layer */}
            <div style={{
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#016ce1',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <Cpu size={20} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#082641', marginBottom: '0.25rem' }}>Portal Engine</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Role-based access guard, real-time WebSocket sync & client caching</p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', fontWeight: 600, color: '#016ce1' }}>
                Event Mesh • TanStack Query
              </div>
            </div>

            {/* Layer 3: CAP Services Layer */}
            <div style={{
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#354a5f',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <Server size={20} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#082641', marginBottom: '0.25rem' }}>CAP Services</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>SAP Cloud Application Programming Model OData v4 runtime</p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', fontWeight: 600, color: '#354a5f' }}>
                CDS Models • SQLite / HANA
              </div>
            </div>

            {/* Layer 4: SAP APIs & Integration */}
            <div style={{
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#0a6ed1',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <Database size={20} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#082641', marginBottom: '0.25rem' }}>SAP OData Integration</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Live OData v2 APIs for Orders, Confirmations & Material Documents</p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', fontWeight: 600, color: '#0a6ed1' }}>
                API_PRODUCTION_ORDER_2_SRV
              </div>
            </div>

            {/* Layer 5: SAP S/4HANA */}
            <div style={{
              border: '2px solid #016ce1',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#082641',
                color: '#38bdf8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                fontWeight: 800,
                fontSize: '0.85rem'
              }}>
                SAP
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#082641', marginBottom: '0.25rem' }}>SAP S/4HANA</h3>
              <p style={{ fontSize: '0.8rem', color: '#475569' }}>Enterprise core system of record for PP, MM, QM and Inventory</p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span>Integration Ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CORE CAPABILITIES SECTION */}
      {/* ========================================================================= */}
      <section id="platform" style={{
        padding: '5rem 1.5rem',
        backgroundColor: '#f4f6fa',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem' }}>
            <div style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#082641',
              backgroundColor: '#e2e8f0',
              padding: '3px 10px',
              borderRadius: '4px',
              marginBottom: '0.75rem'
            }}>
              Functional Modules
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#082641', marginBottom: '0.75rem' }}>
              Production Operations, Connected.
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#51585f' }}>
              Every capability is backed by genuine manufacturing logic, direct SAP business objects,
              and role-governed execution flows.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Card 1: Production Orders */}
            <div className="sap-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: '#e8f4fd', color: '#0a6ed1' }}>
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#082641' }}>Production Orders</h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>SAP Object: ProductionOrder</span>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#51585f', flexGrow: 1 }}>
                Complete order lifecycle control: creation, reference copying, scheduling, BOM/routing explosion, release, and technical completion.
              </p>
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f3f5', fontSize: '0.75rem', color: '#0a6ed1', fontWeight: 600 }}>
                Status: CRTD • REL • TECO • CLSD
              </div>
            </div>

            {/* Card 2: Production Operations */}
            <div className="sap-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#016ce1' }}>
                  <Layers size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#082641' }}>Production Operations</h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Routing Sequence & Work Centers</span>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#51585f', flexGrow: 1 }}>
                Operation sequence visibility, planned vs actual setup and machine duration tracking across certified shop-floor work centers.
              </p>
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f3f5', fontSize: '0.75rem', color: '#016ce1', fontWeight: 600 }}>
                Operations 0010 → 0020 → 0030
              </div>
            </div>

            {/* Card 3: Operation Confirmations */}
            <div className="sap-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: '#e6fcf5', color: '#0ca678' }}>
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#082641' }}>Shop Floor Confirmations</h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Time, Yield & Scrap Recording</span>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#51585f', flexGrow: 1 }}>
                Real-time milestone confirmations with validated yield, scrap variance explanations, operator attribution, and automatic milestone posting.
              </p>
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f3f5', fontSize: '0.75rem', color: '#0ca678', fontWeight: 600 }}>
                API_PROD_ORDER_CONFIRMATION_2_SRV
              </div>
            </div>

            {/* Card 4: Quality Inspection */}
            <div className="sap-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: '#f3f0ff', color: '#7048e8' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#082641' }}>Quality Inspection</h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Inspection Lots & Results</span>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#51585f', flexGrow: 1 }}>
                Automated inspection lot generation at order release and receipt, quantitative characteristic recording, and defect classification.
              </p>
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f3f5', fontSize: '0.75rem', color: '#7048e8', fontWeight: 600 }}>
                Lots: CREATED • PENDING • COMPLETED
              </div>
            </div>

            {/* Card 5: Usage Decisions */}
            <div className="sap-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: '#ebfbee', color: '#37b24d' }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#082641' }}>Usage Decisions</h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Stock Posting Governance</span>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#51585f', flexGrow: 1 }}>
                Formal quality sign-off with definitive usage decision codes (A / R) governing stock release into unrestricted or blocked inventory.
              </p>
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f3f5', fontSize: '0.75rem', color: '#37b24d', fontWeight: 600 }}>
                UD: APPROVED • REJECTED
              </div>
            </div>

            {/* Card 6: Goods Issue (261) */}
            <div className="sap-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: '#fff9db', color: '#f08c00' }}>
                  <PackageCheck size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#082641' }}>Goods Issue (261)</h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Component Consumption</span>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#51585f', flexGrow: 1 }}>
                Direct consumption of BOM components against order reservations with inventory batch allocation and reversal (262) handling.
              </p>
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f3f5', fontSize: '0.75rem', color: '#f08c00', fontWeight: 600 }}>
                Movement 261 / 262 (Reversal)
              </div>
            </div>

            {/* Card 7: Goods Receipt (101) */}
            <div className="sap-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: '#e6fffa', color: '#087f5b' }}>
                  <PackageCheck size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#082641' }}>Goods Receipt (101)</h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Finished Goods Posting</span>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#51585f', flexGrow: 1 }}>
                Receipt of finished manufactured goods into plant storage location stock with automated material document generation and reversal (102).
              </p>
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f3f5', fontSize: '0.75rem', color: '#087f5b', fontWeight: 600 }}>
                Movement 101 / 102 (Reversal)
              </div>
            </div>

            {/* Card 8: Material Documents */}
            <div className="sap-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: '#e2e8f0', color: '#475569' }}>
                  <Database size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#082641' }}>Material Documents</h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>ZAPI_MATERIAL_DOCUMENT_SRV</span>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#51585f', flexGrow: 1 }}>
                Immutable audit trail of all inventory postings linked to production order numbers, posting dates, and document line items.
              </p>
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f3f5', fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                Full Traceability & Audit Trail
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. PRODUCTION LIFECYCLE PIPELINE */}
      {/* ========================================================================= */}
      <section id="lifecycle" style={{
        padding: '5rem 1.5rem',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem' }}>
            <div style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#082641',
              backgroundColor: '#e2e8f0',
              padding: '3px 10px',
              borderRadius: '4px',
              marginBottom: '0.75rem'
            }}>
              Production Lifecycle
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#082641', marginBottom: '0.75rem' }}>
              Standard SAP Production Order Workflow
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#51585f' }}>
              The end-to-end execution path implemented in the ProdOps platform from order inception to financial closing.
            </p>
          </div>

          {/* 9-Step Sequential Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {[
              { step: '01', title: 'Create', desc: 'Production Order Creation', status: 'CRTD', color: '#0d6efd' },
              { step: '02', title: 'Plan', desc: 'BOM / Routing Explosion', status: 'MACA', color: '#0ca678' },
              { step: '03', title: 'Release', desc: 'Order Authorization', status: 'REL', color: '#f08c00' },
              { step: '04', title: 'Issue', desc: '261 Goods Issue', status: 'GI', color: '#1c7ed6' },
              { step: '05', title: 'Execute', desc: 'Work Center Operations', status: 'STRT', color: '#0a6ed1' },
              { step: '06', title: 'Inspect', desc: 'Quality Inspection Lot', status: 'INSP', color: '#7048e8' },
              { step: '07', title: 'Confirm', desc: 'Operation Confirmation', status: 'CNF', color: '#37b24d' },
              { step: '08', title: 'Receive', desc: '101 Goods Receipt', status: 'GR', color: '#087f5b' },
              { step: '09', title: 'Complete', desc: 'Technical Completion', status: 'TECO', color: '#212529' },
            ].map((item) => (
              <div 
                key={item.step}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  padding: '1.25rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: '#082641',
                    letterSpacing: '-0.5px'
                  }}>{item.step}</span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: item.color,
                    backgroundColor: '#ffffff',
                    border: `1px solid ${item.color}`,
                    padding: '1px 5px',
                    borderRadius: '4px'
                  }}>{item.status}</span>
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
                  {item.title}
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. QUALITY MANAGEMENT & SHOP FLOOR EXECUTION (DEEP DIVE) */}
      {/* ========================================================================= */}
      <section id="quality" style={{
        padding: '5rem 1.5rem',
        backgroundColor: '#f4f6fa',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2.5rem'
          }}>
            {/* Left: Quality Management Deep Dive */}
            <div className="sap-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                <ShieldCheck size={22} color="#7048e8" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#082641' }}>Quality Control (QM)</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#51585f', marginBottom: '1.5rem' }}>
                Inspection processes execute seamlessly alongside production operations without separate silos.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#e8f4fd', color: '#0a6ed1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>1</div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>Inspection Lot Generation</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Automated lot creation on production order release and receipt stages.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f3f0ff', color: '#7048e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>2</div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>Results Recording</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Defect codes, quantitative sample checks, and operator inspector sign-off.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#ebfbee', color: '#37b24d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>3</div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>Usage Decision (UD)</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Formal acceptance (Approved) or rejection routing inventory to scrap/rework.</div>
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '1.5rem',
                padding: '0.75rem',
                backgroundColor: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem'
              }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>QM Status Codes:</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ backgroundColor: '#e2e7ec', color: '#5c6b77', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>CREATED</span>
                  <span style={{ backgroundColor: '#fff9db', color: '#f08c00', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>PENDING</span>
                  <span style={{ backgroundColor: '#ebfbee', color: '#37b24d', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>APPROVED</span>
                </div>
              </div>
            </div>

            {/* Right: Shop Floor Execution Deep Dive */}
            <div className="sap-card" id="production">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                <Wrench size={22} color="#016ce1" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#082641' }}>Shop Floor Execution</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#51585f', marginBottom: '1.5rem' }}>
                Intuitive operator interfaces designed for fast throughput, touch operation, and minimal data entry overhead.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#016ce1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>1</div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>Work Center Dispatching</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Operations queued by scheduled start time, work center capability, and plant line.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#016ce1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>2</div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>Time & Yield Recording</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Actual setup hours, labor duration, yield quantity, and scrap reasons entered directly.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#016ce1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>3</div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>Milestone Confirmation</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Automatic progression to subsequent operation steps upon milestone completion.</div>
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '1.5rem',
                padding: '0.75rem',
                backgroundColor: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem'
              }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>Execution States:</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ backgroundColor: '#fff9db', color: '#f08c00', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>READY</span>
                  <span style={{ backgroundColor: '#e8f7ff', color: '#1c7ed6', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>RUNNING</span>
                  <span style={{ backgroundColor: '#ebfbee', color: '#37b24d', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>CONFIRMED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. GOODS MOVEMENTS SECTION (SAP MOVEMENT TYPES) */}
      {/* ========================================================================= */}
      <section id="movements" style={{
        padding: '5rem 1.5rem',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem' }}>
            <div style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#082641',
              backgroundColor: '#e2e8f0',
              padding: '3px 10px',
              borderRadius: '4px',
              marginBottom: '0.75rem'
            }}>
              Material Management
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#082641', marginBottom: '0.75rem' }}>
              Standard SAP Movement Types
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#51585f' }}>
              Built-in support for standard ERP inventory movement codes and reversals with strict validation.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* 261 Goods Issue */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#082641'
                }}>261</span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#0a6ed1',
                  backgroundColor: '#e8f4fd',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>Goods Issue</span>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                Component Consumption
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Issues materials from inventory stock against the production order reservation, reducing on-hand inventory.
              </p>
            </div>

            {/* 262 Reversal */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#082641'
                }}>262</span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#e9730c',
                  backgroundColor: '#fff9db',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>GI Reversal</span>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                Consumption Reversal
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Cancels previous goods issue posting and restores component stock to unrestricted inventory.
              </p>
            </div>

            {/* 101 Goods Receipt */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#082641'
                }}>101</span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#087f5b',
                  backgroundColor: '#e6fffa',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>Goods Receipt</span>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                Finished Product Receipt
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Receives manufactured goods into finished warehouse inventory and credits the production order cost collector.
              </p>
            </div>

            {/* 102 Reversal */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#082641'
                }}>102</span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#bb0000',
                  backgroundColor: '#fee2e2',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>GR Reversal</span>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                Receipt Reversal
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Reverses finished stock receipt in case of quantity discrepancy or post-receipt quality rejection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. ENTERPRISE APPLICATION PREVIEW */}
      {/* ========================================================================= */}
      <section style={{
        padding: '5rem 1.5rem',
        backgroundColor: '#f4f6fa',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3rem' }}>
            <div style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#082641',
              backgroundColor: '#e2e8f0',
              padding: '3px 10px',
              borderRadius: '4px',
              marginBottom: '0.75rem'
            }}>
              Interface Preview
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#082641', marginBottom: '0.75rem' }}>
              High-Density Enterprise Workspace
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#51585f' }}>
              Designed according to SAP Fiori principles for operational speed, high data density, and clear status governance.
            </p>
          </div>

          {/* Realistic Application UI Mockup */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }}>
            {/* Simulated ShellBar */}
            <div style={{
              backgroundColor: '#354a5f',
              padding: '0 1.25rem',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff',
              fontSize: '0.8rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                  <ProdOpsIcon size={20} />
                  <span>ProdOps</span>
                  <span style={{ fontSize: '0.65rem', backgroundColor: '#e2e8f0', color: '#1e293b', padding: '1px 4px', borderRadius: '3px' }}>S/4HANA</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', opacity: 0.9 }}>
                  <span style={{ fontWeight: 600, borderBottom: '2px solid #ffffff', paddingBottom: '2px' }}>Operations Overview</span>
                  <span>Production Orders</span>
                  <span>Confirm Operations</span>
                  <span>Quality Control</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                <span>SAP Live Sync: Active</span>
              </div>
            </div>

            {/* Simulated App Header & Table */}
            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#32363a' }}>Production Orders Overview</h4>
                  <span style={{ fontSize: '0.75rem', color: '#6a7b8c' }}>Plant 1010 • Discrete Manufacturing Execution</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Filter: All Orders (14)</span>
                  <span style={{ padding: '4px 10px', borderRadius: '4px', backgroundColor: '#0a6ed1', color: '#ffffff', fontSize: '0.75rem', fontWeight: 600 }}>+ Create Order</span>
                </div>
              </div>

              {/* Data Table */}
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Order ID</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Material</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Description</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Target Qty</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Start Date</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>SAP Status</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0a6ed1' }}>1000284</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>MZ-FG-R100</td>
                      <td style={{ padding: '8px 12px' }}>High Precision Servo Motor</td>
                      <td style={{ padding: '8px 12px' }}>150 EA</td>
                      <td style={{ padding: '8px 12px' }}>2026-09-18</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ backgroundColor: '#fff9db', color: '#f08c00', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700 }}>REL</span>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#0a6ed1', fontWeight: 600 }}>View Details</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0a6ed1' }}>1000285</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>MZ-FG-C200</td>
                      <td style={{ padding: '8px 12px' }}>Electronic Controller Assembly</td>
                      <td style={{ padding: '8px 12px' }}>300 EA</td>
                      <td style={{ padding: '8px 12px' }}>2026-09-19</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ backgroundColor: '#e8f4fd', color: '#0d6efd', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700 }}>CRTD</span>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#0a6ed1', fontWeight: 600 }}>View Details</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0a6ed1' }}>1000280</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>MZ-FG-M500</td>
                      <td style={{ padding: '8px 12px' }}>Industrial Pump Housing</td>
                      <td style={{ padding: '8px 12px' }}>80 EA</td>
                      <td style={{ padding: '8px 12px' }}>2026-09-15</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ backgroundColor: '#ebfbee', color: '#37b24d', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700 }}>CNF</span>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#0a6ed1', fontWeight: 600 }}>View Details</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0a6ed1' }}>1000276</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>MZ-FG-T300</td>
                      <td style={{ padding: '8px 12px' }}>Thermal Sensor Unit</td>
                      <td style={{ padding: '8px 12px' }}>500 EA</td>
                      <td style={{ padding: '8px 12px' }}>2026-09-12</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ backgroundColor: '#e6fffa', color: '#087f5b', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700 }}>GR</span>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#0a6ed1', fontWeight: 600 }}>View Details</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. CALL TO ACTION (CTA) SECTION */}
      {/* ========================================================================= */}
      <section style={{
        backgroundColor: '#082641',
        backgroundImage: 'linear-gradient(135deg, #082641 0%, #0a335c 100%)',
        color: '#ffffff',
        padding: '5rem 1.5rem',
        textAlign: 'center',
        borderTop: '1px solid #1e3a5f'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <ProdOpsIcon size={44} style={{ marginBottom: '1.25rem' }} />
          <h2 style={{
            fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: '1rem',
            letterSpacing: '-0.5px'
          }}>
            Production operations,<br />
            connected in one platform.
          </h2>
          <p style={{
            fontSize: '1rem',
            color: '#cbd5e1',
            marginBottom: '2.5rem',
            lineHeight: 1.6
          }}>
            Experience streamlined production order management, shop floor confirmations,
            and quality inspection designed around SAP S/4HANA.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              to="/login"
              style={{
                backgroundColor: '#016ce1',
                color: '#ffffff',
                padding: '0.85rem 2.25rem',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(1, 108, 225, 0.4)',
                transition: 'all 0.15s'
              }}
            >
              <span>User Login</span>
              <ArrowRight size={16} />
            </Link>

            <a
              href="#platform"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.25)',
                padding: '0.85rem 1.75rem',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Explore Capabilities
            </a>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. ENTERPRISE FOOTER */}
      {/* ========================================================================= */}
      <footer style={{
        backgroundColor: '#051829',
        borderTop: '1px solid #0f2e4d',
        color: '#94a3b8',
        padding: '3rem 1.5rem 2rem 1.5rem',
        fontSize: '0.85rem'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2.5rem',
            marginBottom: '3rem'
          }}>
            {/* Col 1: Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                <ProdOpsIcon size={24} />
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                  Prod<span style={{ color: '#38bdf8' }}>Ops</span>
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                Production Planning, Execution & Quality Platform
              </p>
              <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                Designed around SAP S/4HANA processes.
              </div>
            </div>

            {/* Col 2: Production */}
            <div>
              <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                Production Execution
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                <li><Link to="/orders" style={{ color: '#94a3b8', textDecoration: 'none' }}>Production Orders</Link></li>
                <li><Link to="/operations" style={{ color: '#94a3b8', textDecoration: 'none' }}>Operation Confirmations</Link></li>
                <li><Link to="/goods-issue" style={{ color: '#94a3b8', textDecoration: 'none' }}>Goods Issue (261)</Link></li>
                <li><Link to="/inventory" style={{ color: '#94a3b8', textDecoration: 'none' }}>Stock & Inventory</Link></li>
              </ul>
            </div>

            {/* Col 3: Quality & Governance */}
            <div>
              <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                Quality & Governance
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                <li><Link to="/quality" style={{ color: '#94a3b8', textDecoration: 'none' }}>Quality Control</Link></li>
                <li><Link to="/quality" style={{ color: '#94a3b8', textDecoration: 'none' }}>Inspection Lots</Link></li>
                <li><Link to="/quality" style={{ color: '#94a3b8', textDecoration: 'none' }}>Usage Decisions</Link></li>
                <li><Link to="/admin" style={{ color: '#94a3b8', textDecoration: 'none' }}>Administration</Link></li>
              </ul>
            </div>

            {/* Col 4: Platform Navigation */}
            <div>
              <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                Access & Navigation
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                <li><Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>User Login</Link></li>
                <li><a href="#integration" style={{ color: '#94a3b8', textDecoration: 'none' }}>Architecture Diagram</a></li>
                <li><a href="#lifecycle" style={{ color: '#94a3b8', textDecoration: 'none' }}>Production Lifecycle</a></li>
                <li><a href="#movements" style={{ color: '#94a3b8', textDecoration: 'none' }}>Goods Movements</a></li>
              </ul>
            </div>
          </div>

          <div style={{
            paddingTop: '1.5rem',
            borderTop: '1px solid #0f2e4d',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.75rem',
            color: '#64748b'
          }}>
            <div>
              ProdOps • Production Planning, Execution & Quality Platform
            </div>
            <div>
              SAP S/4HANA Production Operations
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
