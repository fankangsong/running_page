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
  siteTitle: '一个跑步的中年人',
  siteUrl: 'https://imcolin.fan',
  logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQTtc69JxHNcmN1ETpMUX4dozAgAN6iPjWalQ&usqp=CAU',
  description: '一个跑步的中年人 - imcoiln.fan',
  navLinks: [
    {
      name: 'imcolin.fan',
      url: 'https://imcolin.fan'
    },
  ],
};

export default data;
