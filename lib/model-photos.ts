// Fotografii reale per model (homepage) — Wikimedia Commons, licențe libere.
// Blueprint-urile SVG proprii rămân identitatea vizuală tehnică a platformei;
// fotografiile sunt un adaos vizual, cu atribuire obligatorie (CC BY/BY-SA).
export interface ModelPhoto {
  file: string;
  width: number;
  height: number;
  author: string;
  license: string;
  licenseUrl: string | null; // null pentru domeniu public — nicio atribuire obligatorie
  sourceUrl: string;
}

export const MODEL_PHOTOS: Record<string, ModelPhoto> = {
  W124: {
    file: '/models/w124.jpg',
    width: 1600,
    height: 731,
    author: 'Rutger van der Maar',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mercedes-Benz_W124_Coup%C3%A9_(C124)_(17427755131).jpg',
  },
  R129: {
    file: '/models/r129.jpg',
    width: 1600,
    height: 1086,
    author: 'Jakub „flyz1" Maciejewski',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mercedes-Benz_SL_R129_(MSP17).jpg',
  },
  W201: {
    file: '/models/w201.jpg',
    width: 1600,
    height: 1066,
    author: 'Jeremy',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:1987_Mercedes_Benz_190_E_(W201)_2.6_sedan_(23799249239).jpg',
  },
  W126: {
    file: '/models/w126.jpg',
    width: 1600,
    height: 810,
    author: 'Hasting',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:1986-1991_Mercedes-Benz_560_SEC_(C126)_coupe_01.jpg',
  },
  W123: {
    file: '/models/w123.jpg',
    width: 1600,
    height: 842,
    author: 'OSX',
    license: 'Domeniu public',
    licenseUrl: null,
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:1985_Mercedes-Benz_280_CE_(C_123)_coupe_(2012-06-24).jpg',
  },
  W140: {
    file: '/models/w140.jpg',
    width: 1600,
    height: 1066,
    author: 'Jiří Sedláček',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mercedes_Benz_S_Coupe_W140_at_Legendy_2018_in_Prague.jpg',
  },
};
