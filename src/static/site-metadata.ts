interface ISiteMetadataResult {
  siteTitle: string;
  siteUrl: string;
  description: string;
  logo: string;
  navLinks: {
    name: string;
    url: string;
  }[];
}

const data: ISiteMetadataResult = {
  siteTitle: 'Run Colin, Run!',
  siteUrl: 'https://imcolin.fan',
  logo: 'https://imcolin.fan/a.jpg',
  description: '',
  navLinks: [
    {
      name: 'Running',
      url: '/',
    },
    {
      name: 'Map',
      url: '/map',
    },
    {
      name: 'Tracks',
      url: '/tracks',
    },
    {
      name: 'About',
      url: 'https://imcolin.fan',
    },
  ],
};

export default data;
