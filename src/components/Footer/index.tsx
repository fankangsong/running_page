import useSiteMetadata from '@/hooks/useSiteMetadata';

const Footer = () => {
  const { siteTitle } = useSiteMetadata();
  const year = new Date().getFullYear();

  return (
    <footer className="w-full px-6 py-8 mt-12 border-t border-gray-800/50">
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <span>© {year} {siteTitle}</span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/fankangsong/running_page"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors duration-200"
          >
            Running Page
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
