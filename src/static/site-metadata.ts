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
      name: 'Running Log',
      url: '/',
    },
    {
      name: 'Tracks',
      url: '/tracks',
    },
  ],
};

export default data;
