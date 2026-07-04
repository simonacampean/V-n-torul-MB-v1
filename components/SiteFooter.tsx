import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="site">
      <div className="wrap">
        <div className="in">
          VÂNĂTORUL MB v2.0 · platformă pentru pasionații de Mercedes clasice ·{' '}
          <Link href="/termeni">Termeni și condiții</Link> ·{' '}
          <Link href="/confidentialitate">Confidențialitate</Link>
        </div>
      </div>
    </footer>
  );
}
