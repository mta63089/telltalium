import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { TelltaliumMark } from "./telltalium-mark";

export function DocsShell({
  index,
  kicker,
  title,
  introduction,
  children,
}: {
  index: string;
  kicker: string;
  title: string;
  introduction: string;
  children: React.ReactNode;
}) {
  return (
    <div className="telltalium-app">
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="wordmark" aria-label="Telltalium home">
            <TelltaliumMark size={34} />
            <span>
              TELLTALIUM<span className="wordmark-dot">.</span>
            </span>
          </Link>
          <nav className="header-nav" aria-label="Site navigation">
            <Link href="/#results">THE REPORT</Link>
            <Link href="/methodology">METHODOLOGY</Link>
            <Link href="/privacy">PRIVACY</Link>
          </nav>
          <Link className="header-action" href="/">
            NEW SCAN <ArrowUpRight size={16} />
          </Link>
        </div>
      </header>
      <main className="wrap docs-main">
        <Link className="docs-back" href="/">
          <ArrowLeft size={14} /> BACK TO INVESTIGATION
        </Link>
        <div className="section-eyebrow">
          <span className="section-index">{index}</span>
          {kicker}
          <span className="section-rule" />
        </div>
        <h1 className="docs-title">
          {title}
          <span className="accent-period">.</span>
        </h1>
        <p className="docs-intro">{introduction}</p>
        <div className="docs-content">{children}</div>
      </main>
      <footer className="docs-footer wrap">
        <span>TELLTALIUM / QUESTION THE SIGNAL</span>
        <Link href="/">
          START AN INVESTIGATION <ArrowUpRight size={13} />
        </Link>
      </footer>
    </div>
  );
}
