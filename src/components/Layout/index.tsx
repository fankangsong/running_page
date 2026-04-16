import PropTypes from 'prop-types';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import styles from './style.module.scss';

const Layout = ({ children, fullWidth = false }: React.PropsWithChildren<{ fullWidth?: boolean }>) => {
  const { siteTitle, description } = useSiteMetadata();

  return (
    <div className="bg-background min-h-screen flex flex-col font-sans text-primary w-full">
      <Helmet bodyAttributes={{ class: styles.body }}>
        <html lang="en" />
        <title>{siteTitle}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content="running" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
      </Helmet>
      <Header />
      <main className={`flex-grow w-full mx-auto min-w-0 ${fullWidth ? 'max-w-full p-0' : 'max-w-full md:max-w-[1000px] p-4 md:p-8'}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
