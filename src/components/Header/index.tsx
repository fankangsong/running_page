import { Link } from 'react-router-dom';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { useRef, useCallback, useState } from 'react';
import CyclingText, { CyclingTextHandle } from '@/components/CyclingText';

const Header = () => {
  const { navLinks } = useSiteMetadata();
  const runRef = useRef<CyclingTextHandle>(null);
  const colinRef = useRef<CyclingTextHandle>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMouseEnter = useCallback(() => {
    runRef.current?.play();
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="flex justify-between items-center w-full px-6 py-4 bg-background text-primary relative z-50">
      <div className="flex items-center relative z-50">
        <Link
          to="/"
          className="group flex items-center gap-1 text-2xl font-black italic tracking-tighter text-white"
          onMouseEnter={handleMouseEnter}
          onClick={() => setIsMenuOpen(false)}
        >
          <CyclingText
            ref={runRef}
            text="RUN"
            className="inline-block group-hover:scale-105 origin-left transition-transform duration-300"
            hoverPlay={true}
          />
          <CyclingText
            ref={colinRef}
            text="COLIN"
            className="text-white inline-block group-hover:scale-105 origin-left transition-transform duration-300"
            hoverPlay={true}
          />
        </Link>
      </div>

      {/* Desktop Menu */}
      <div className="hidden md:flex justify-end items-center space-x-8">
        {navLinks.map((n, i) =>
          n.url.startsWith('/') ? (
            <Link
              key={i}
              to={n.url}
              className="text-secondary hover:text-primary font-bold uppercase text-sm tracking-wide transition-colors duration-200"
            >
              {n.name}
            </Link>
          ) : (
            <a
              key={i}
              href={n.url}
              className="text-secondary hover:text-primary font-bold uppercase text-sm tracking-wide transition-colors duration-200"
            >
              {n.name}
            </a>
          )
        )}
      </div>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden relative z-50 w-10 h-10 flex flex-col justify-center items-center focus:outline-none"
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span
          className={`block w-6 h-0.5 bg-white transition-all duration-300 ease-out ${
            isMenuOpen ? 'rotate-45 translate-y-1.5' : '-translate-y-1'
          }`}
        />
        <span
          className={`block w-6 h-0.5 bg-white transition-all duration-300 ease-out my-0.5 ${
            isMenuOpen ? 'opacity-0' : 'opacity-100'
          }`}
        />
        <span
          className={`block w-6 h-0.5 bg-white transition-all duration-300 ease-out ${
            isMenuOpen ? '-rotate-45 -translate-y-1.5' : 'translate-y-1'
          }`}
        />
      </button>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black/95 backdrop-blur-sm z-40 transition-all duration-300 ease-in-out md:hidden flex flex-col justify-center items-center gap-8 ${
          isMenuOpen
            ? 'opacity-100 visible'
            : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        {navLinks.map((n, i) =>
          n.url.startsWith('/') ? (
            <Link
              key={i}
              to={n.url}
              className="text-white hover:text-primary font-black uppercase text-2xl tracking-widest transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              {n.name}
            </Link>
          ) : (
            <a
              key={i}
              href={n.url}
              className="text-white hover:text-primary font-black uppercase text-2xl tracking-widest transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              {n.name}
            </a>
          )
        )}
      </div>
    </nav>
  );
};

export default Header;
