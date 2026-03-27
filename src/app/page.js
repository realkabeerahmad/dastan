import Link from "next/link";
import { ArrowRight, Building, Globe, ShieldCheck, Activity } from "lucide-react";

export const metadata = {
  title: "Mulk | Manage renting portfolios",
  description: "The modern operating system for property management and rental portfolios.",
};

export default function LandingPage() {
  return (
    <div className="landing-container">
      <style suppressHydrationWarning>{`
        .landing-container {
          min-height: 100vh;
          background-color: #000000;
          color: #ededed;
          font-family: var(--font-inter), sans-serif;
          overflow-x: hidden;
          position: relative;
          padding: 0 0 100px 0
        }

        /* Ambient Top Glow */
        .landing-container::before {
          content: "";
          position: absolute;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 80vw;
          height: 600px;
          background: radial-gradient(ellipse at top, rgba(16, 185, 129, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
          z-index: 0;
          pointer-events: none;
        }

        .content-wrapper {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 5%;
        }

        /* ── Floating Navbar ── */
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          max-width: 1200px;
          margin-top: 2rem;
          padding: 0.75rem 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 99px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          animation: slideDown 0.8s ease-out;
        }

        .brand {
          font-family: var(--font-outfit), sans-serif;
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .nav-actions {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }

        .btn-ghost {
          color: #a1a1aa;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: color 0.2s;
        }
        .btn-ghost:hover {
          color: #ffffff;
        }

        .btn-nav-primary {
          background: #ffffff;
          color: #000000;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.5rem 1rem;
          border-radius: 99px;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          transition: transform 0.2s;
        }
        .btn-nav-primary:hover {
          transform: scale(1.02);
        }

        /* ── Central Hero ── */
        .hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          width: 100%;
          max-width: 900px;
          padding-top: 10vh;
          padding-bottom: 5vh;
        }

        .hero-badge {
          background: rgba(255, 255, 255, 0.03);
          color: #a1a1aa;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.4rem 1rem;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.05em;
          margin-bottom: 2.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          animation: fadeUp 0.8s ease-out 0.1s both;
        }
        .hero-badge-dot {
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 8px #10b981;
        }

        .hero-title {
          font-family: var(--font-outfit), sans-serif;
          font-size: clamp(3rem, 7vw, 5.5rem);
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -0.05em;
          margin-bottom: 1.5rem;
          background: linear-gradient(180deg, #ffffff 0%, #8b8b8b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: fadeUp 0.8s ease-out 0.2s both;
        }

        .hero-sub {
          font-size: 1.125rem;
          color: #a1a1aa;
          max-width: 580px;
          margin-bottom: 3rem;
          line-height: 1.6;
          font-weight: 400;
          animation: fadeUp 0.8s ease-out 0.3s both;
        }

        .hero-buttons {
          display: flex;
          gap: 1.25rem;
          animation: fadeUp 0.8s ease-out 0.4s both;
        }

        .btn-large-primary {
          background: #ffffff;
          color: #000000;
          padding: 0.875rem 2rem;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 99px;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 8px 20px rgba(255,255,255,0.15);
          transition: all 0.2s;
        }
        .btn-large-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.2), 0 12px 24px rgba(255,255,255,0.25);
        }

        .btn-large-secondary {
          background: rgba(255, 255, 255, 0.02);
          color: #ededed;
          padding: 0.875rem 2rem;
          font-size: 1rem;
          font-weight: 500;
          border-radius: 99px;
          text-decoration: none;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
          transition: all 0.2s;
        }
        .btn-large-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
        }

        /* ── Sleek Compact Features Row ── */
        .features {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          width: 100%;
          max-width: 1000px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          overflow: hidden;
          margin-top: 3rem;
          animation: fadeUp 0.8s ease-out 0.5s both;
        }

        .feature-card {
          background: #050505;
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          transition: background 0.3s;
        }
        .feature-card:hover {
          background: #09090b;
        }

        .feature-icon {
          color: #ededed;
          margin-bottom: 1rem;
        }

        .feature-title {
          font-family: var(--font-outfit), sans-serif;
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #ffffff;
          letter-spacing: -0.02em;
        }

        .feature-desc {
          font-size: 0.8125rem;
          color: #a1a1aa;
          line-height: 1.5;
        }

        @media (max-width: 900px) {
          .features { grid-template-columns: repeat(2, 1fr); border-radius: 12px; }
        }
        @media (max-width: 600px) {
          .features { grid-template-columns: 1fr; }
          .hero-buttons { flex-direction: column; width: 100%; }
          .btn-large-primary, .btn-large-secondary { width: 100%; justify-content: center; }
        }

        /* ── Animations ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="content-wrapper">
        <nav className="navbar">
          <div className="brand">
            Mulk
            <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#71717a", letterSpacing: "normal", marginLeft: "0.5rem", borderLeft: "1px solid #27272a", paddingLeft: "0.75rem" }}>
              Property Management
            </span>
          </div>
          <div className="nav-actions">
            <Link href="/login" className="btn-ghost">Log in</Link>
            <Link href="/register" className="btn-nav-primary">
              Get Started <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>
        </nav>

        <header className="hero">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span> Next-Gen Analytics Core
          </div>
          <h1 className="hero-title">Manage renting<br />portfolios effortlessly.</h1>
          <p className="hero-sub">
            The ultra-fast, multi-tenant operating system for property owners. Fully integrated financial ledgers, per-night Airbnb-style billing, and multi-currency global snapshots.
          </p>
          <div className="hero-buttons">
            <Link href="/register" className="btn-large-primary">
              Start your free trial
            </Link>
            <Link href="/login" className="btn-large-secondary">
              Sign in to dashboard
            </Link>
          </div>
        </header>

        <section className="features">
          <div className="feature-card">
            <div className="feature-icon"><Building size={20} strokeWidth={2} /></div>
            <h3 className="feature-title">Multi-Tenant Vaults</h3>
            <p className="feature-desc">Isolate properties and cross-border currency pools securely with fully segregated ledgers.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Activity size={20} strokeWidth={2} /></div>
            <h3 className="feature-title">Live Analytics</h3>
            <p className="feature-desc">Custom Python ETLs crunch your data instantly to provide mathematically infallible dashboards.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Globe size={20} strokeWidth={2} /></div>
            <h3 className="feature-title">Multi-Currency</h3>
            <p className="feature-desc">Native support for cross-ledger transfers and direct instantaneous exchange rate logging.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><ShieldCheck size={20} strokeWidth={2} /></div>
            <h3 className="feature-title">Immutable Audit</h3>
            <p className="feature-desc">Every action writes an unalterable trace in the ledger. Absolute truth, guaranteed.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
