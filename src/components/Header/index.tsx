import { Link } from 'react-router-dom';
import useSiteMetadata from '@/hooks/useSiteMetadata';

const Header = () => {
  const { navLinks } = useSiteMetadata();

  return (
    <nav className="flex justify-between items-center w-full px-6 py-4 bg-background text-primary">
      <div className="flex items-center">
        <Link to="/" className="text-2xl font-black italic tracking-tighter text-white">
            RUN <span className="text-white">COLIN</span>
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
