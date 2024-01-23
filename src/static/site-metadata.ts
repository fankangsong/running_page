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
  siteTitle: "Colin，加油！",
  siteUrl: 'https://imcolin.fan',
  logo: 'https://imcolin.fan/static/avatar-859a99b5703f5352e0b9357c90442030.jpg',
  description: '',
  navLinks: [
    {
      name: 'Strava',
      url: 'https://www.strava.com/athletes/129314348'
    },
    {
      name: 'About',
      url: '/about'
    },
  ],
};

export default data;
