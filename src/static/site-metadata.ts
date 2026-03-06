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
      name: 'Tracks',
      url: '/tracks',
    },
    {
      name: '🏃',
      url: 'https://imcolin.fan',
    },
  ],
};

export default data;
