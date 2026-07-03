import Link from 'next/link';
import AuthNav from '@/components/AuthNav';

export default function SiteHeader() {
  return (
    <header className="site">
      <div className="wrap">
        <div className="hdr-top">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div className="eyebrow mono">INVESTIȚII AUTO CLASICE</div>
            <h1 className="brand">
              VÂNĂTORUL <span className="red">MB</span>
            </h1>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <nav className="hdr-nav mono">
              <Link href="/oferte">Top oferte</Link>
            </nav>
            <AuthNav />
          </div>
        </div>
      </div>
    </header>
  );
}
