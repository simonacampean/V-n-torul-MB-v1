// Fotografii reale per model (homepage) — Wikimedia Commons, licențe libere.
// Fiecare model are 3 unghiuri (față/lateral/spate) — înlocuiesc blueprint-urile
// SVG schematice, la cererea explicită a beneficiarului („prea schematizate,
// neatractive vizual"). Atribuire obligatorie sub fiecare imagine (cu excepția
// domeniului public).
export interface ModelPhoto {
  file: string;
  width: number;
  height: number;
  author: string;
  license: string;
  licenseUrl: string | null; // null pentru domeniu public — nicio atribuire obligatorie
  sourceUrl: string;
}

export type CarAngle = 'front' | 'side' | 'rear';

export interface TechImage {
  file: string;
  width: number;
  height: number;
}

// Fișă tehnică unică per model (față+motor+spate+lateral într-o singură
// ilustrație) — generată de beneficiar, înlocuiește rândul de 3 fotografii
// separate acolo unde există. Modelele fără intrare aici cad pe MODEL_ANGLE_PHOTOS
// (vezi CarPhotoRow/ModelTechFigure).
export const MODEL_TECH_IMAGE: Partial<Record<string, TechImage>> = {
  W124: { file: '/models/w124-tech.jpg', width: 1600, height: 872 },
  R129: { file: '/models/r129-tech.jpg', width: 1600, height: 872 },
  W201: { file: '/models/w201-tech.jpg', width: 1600, height: 872 },
  W126: { file: '/models/w126-tech.jpg', width: 1600, height: 872 },
  W123: { file: '/models/w123-tech.jpg', width: 1600, height: 872 },
  W140: { file: '/models/w140-tech.jpg', width: 1600, height: 872 },
};

// Fotografia hero (mare, deasupra fișei modelului) — neschimbată.
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

// Cele 3 unghiuri tehnice (față/lateral/spate) — înlocuiesc Blueprint.tsx (SVG).
export const MODEL_ANGLE_PHOTOS: Record<string, Record<CarAngle, ModelPhoto>> = {
  W124: {
    front: {
      file: '/models/w124-front.jpg', width: 1600, height: 1066,
      author: 'Jeremy', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:1993_Mercedes-Benz_320_CE_(C_124)_coupe_(22081848080).jpg',
    },
    side: {
      file: '/models/w124-side.jpg', width: 1600, height: 1066,
      author: 'Jeremy', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:1993_Mercedes-Benz_320_CE_(C_124)_coupe_(22269934925).jpg',
    },
    rear: {
      file: '/models/w124-rear.jpg', width: 1600, height: 901,
      author: 'Jeremy', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:1993_Mercedes-Benz_320_CE_(C_124)_coupe_(22269875775).jpg',
    },
  },
  R129: {
    front: {
      file: '/models/r129-front.jpg', width: 1600, height: 1200,
      author: 'nakhon100', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mercedes-Benz_SL_R129_(8598310797).jpg',
    },
    side: {
      file: '/models/r129-side.jpg', width: 1600, height: 1200,
      author: 'nakhon100', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mercedes-Benz_SL_R129_(8598310855).jpg',
    },
    rear: {
      file: '/models/r129-rear.jpg', width: 1600, height: 858,
      author: 'Rudolf Stricker', license: 'Attribution (licență liberă)', licenseUrl: 'https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mercedes-Benz_R129_rear_20080625.jpg',
    },
  },
  W201: {
    front: {
      file: '/models/w201-front.jpg', width: 1600, height: 1066,
      author: 'Jeremy', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:1987_Mercedes_Benz_190_E_(W201)_2.6_sedan_(24058960472).jpg',
    },
    side: {
      file: '/models/w201-side.jpg', width: 1600, height: 1066,
      author: 'Jeremy', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:1987_Mercedes_Benz_190_E_(W201)_2.6_sedan_(24084486981).jpg',
    },
    // Reutilizează exact fotografia hero — face parte din același set de 4 poze, aceeași mașină.
    rear: MODEL_PHOTOS.W201,
  },
  W126: {
    front: {
      file: '/models/w126-front.jpg', width: 1600, height: 1200,
      author: 'BrokenSphere', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:1984_black_Mercedes_SEC_500_front.JPG',
    },
    side: {
      file: '/models/w126-side.jpg', width: 1600, height: 1200,
      author: 'BrokenSphere', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:1984_black_Mercedes_SEC_500_left_side.JPG',
    },
    rear: {
      file: '/models/w126-rear.jpg', width: 1600, height: 1200,
      author: 'BrokenSphere', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:1984_black_Mercedes_SEC_500_rear.JPG',
    },
  },
  W123: {
    front: {
      file: '/models/w123-front.jpg', width: 1600, height: 900,
      author: 'Hendy Sannidhya', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mercedes_Benz_C123_(tampak_depan),_Surabaya.jpg',
    },
    // Reutilizează fotografia hero — mașină diferită de față/spate; nu există un set complet
    // cu aceeași mașină pe Commons pentru acest model.
    side: MODEL_PHOTOS.W123,
    rear: {
      file: '/models/w123-rear.jpg', width: 1600, height: 1067,
      author: 'Hendy Sannidhya', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mercedes_Benz_C123_(tampak_belakang),_Surabaya.jpg',
    },
  },
  W140: {
    front: {
      file: '/models/w140-front.jpg', width: 1600, height: 1066,
      author: 'Jeremy', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:1995_Mercedes-Benz_CL_500_(C_140)_coupe_(27752572212).jpg',
    },
    side: {
      file: '/models/w140-side.jpg', width: 1600, height: 1066,
      author: 'Jeremy', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:1995_Mercedes-Benz_CL_500_(C_140)_coupe_(27576170630).jpg',
    },
    rear: {
      file: '/models/w140-rear.jpg', width: 1600, height: 1066,
      author: 'Jeremy', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:1995_Mercedes-Benz_CL_500_(C_140)_coupe_(27752589912).jpg',
    },
  },
};

