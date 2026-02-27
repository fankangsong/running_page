import { Link } from 'react-router-dom';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { useRef, useCallback } from 'react';
import CyclingText, { CyclingTextHandle } from '@/components/CyclingText';

const Header = () => {
  const { navLinks } = useSiteMetadata();
  const runRef = useRef<CyclingTextHandle>(null);
  const colinRef = useRef<CyclingTextHandle>(null);

  const handleMouseEnter = useCallback(() => {
    runRef.current?.play();
  }, []);

  return (
    <nav className="flex justify-between items-center w-full px-6 py-4 bg-background text-primary">
      <div className="flex items-center">
        <Link 
          to="/" 
          className="group flex items-center gap-1 text-2xl font-black italic tracking-tighter text-white"
          onMouseEnter={handleMouseEnter}
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
      <div className="flex justify-end items-center space-x-8">
        {navLinks.map((n, i) => (
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
        ))}
      </div>
    </nav>
  );
};

export default Header;
