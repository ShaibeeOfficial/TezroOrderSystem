// src/data/productsData.js
const productsData = [
  // 🌽 Corn
  
   {
    id: 17,
    slug: "opv-aflatoon-wheat",
    crop: "Wheat",
    type: "OPV",
    variety: "Aflatoon",
    packSize: "50Kg",
    price: 6405,
    category: "Wheat",
    image: "/images/Aflatoon.jpg",
    descriptionUrdu: "یہ گندم کی قسم سرد موسم میں بہتر پیداوار دیتی ہے۔"
  },
  {
    id: 18,
    slug: "opv-arastu-wheat",
    crop: "Wheat",
    type: "OPV",
    variety: "ARASTU",
    packSize: "50Kg",
    price: 6905,
    category: "Wheat",
    image: "/images/Arastu.png",
    descriptionUrdu: "یہ گندم کی قسم بیماریوں سے مضبوط اور زیادہ فائدہ مند ہے۔"
  },
  {
    id: 19,
    slug: "opv-tezro-classic-wheat",
    crop: "Wheat",
    type: "OPV",
    variety: "TEZRO CLASSIC",
    packSize: "50Kg",
    price: 6905,
    category: "Wheat",
    image: "/images/Tezro-Classic.jpeg",
    descriptionUrdu: "یہ گندم کی کلاسک قسم اعلی معیار اور ذائقہ دار پیداوار کے لیے جانی جاتی ہے۔"
  },
  
  
  {
    id: 1,
    slug: "hybrid-spring-corn",
    crop: "Corn",
    type: "Hybrid",
    variety: "Spring Corn TR-1530",
    packSize: "35000 Seeds",
    price: 11500,
    category: "Corn",
    image: "/images/corn-hybrid.jpg",
    descriptionUrdu: "یہ ہائبرڈ بہاری مکئی اعلی پیداوار دینے والی قسم ہے جو مختلف اقسام کی زمین پر اگائی جا سکتی ہے۔"
  },

  // 🌾 Sorghum
  {
    id: 2,
    slug: "hybrid-ssg-usa-sultan",
    crop: "Sorghum",
    type: "Hybrid",
    variety: "SSG (USA) Sultan",
    packSize: "10Kg",
    price: 6200,
    category: "Sorghum",
    descriptionUrdu: "یہ ہائبرڈ سرگم قسم زرخیز زمینوں اور خشک موسم کے لیے موزوں ہے۔"
  },

  // 🌱 Afgoi
  {
    id: 3,
    slug: "afgoi-opv-sg-2002-afgoi",
    crop: "Afgoi",
    type: "OPV",
    variety: "SG-2002",
    packSize: "20Kg",
    price: 4595,
    category: "Afgoi",
    descriptionUrdu: "یہ OPV افگویی قسم کم پانی میں بھی اچھی پیداوار دیتی ہے۔"
  },

  // 🥬 Vegetables
  {
    id: 4,
    slug: "partheno-casper-f1-cucumber",
    crop: "Cucumber",
    type: "Partheno",
    variety: "Casper F1",
    packSize: "500 Seed",
    price: 4600,
    category: "Vegetables",
    descriptionUrdu: "یہ کھیرا قسم جلدی پکنے والی اور اعلی معیار کی سبزی فراہم کرتی ہے۔"
  },
  {
    id: 5,
    slug: "hybrid-hot-spicy-4-f1-pepper",
    crop: "Hot Pepper",
    type: "Hybrid",
    variety: "Hot Spicy 4 F1",
    packSize: "10g",
    price: 2190,
    category: "Vegetables",
    descriptionUrdu: "یہ مرچ کی قسم تیز مصالحہ دار اور زیادہ پیداوار دینے والی ہے۔"
  },

  // 🍚 Hybrid Rice
  {
    id: 6,
    slug: "hybrid-long-grain-515-500g",
    crop: "Hybrid Rice",
    type: "Hybrid",
    variety: "Long Grain-515",
    packSize: "500g",
    price: 1500,
    category: "Hybrid Rice",
    descriptionUrdu: "یہ ہائبرڈ چاول کی قسم لمبی دانے والی اور عمدہ ذائقہ رکھتی ہے۔"
  },
  {
    id: 7,
    slug: "hybrid-long-grain-515-1kg",
    crop: "Hybrid Rice",
    type: "Hybrid",
    variety: "Long Grain-515",
    packSize: "01Kg",
    price: 3000,
    category: "Hybrid Rice",
    descriptionUrdu: "یہ ہائبرڈ چاول کی قسم مکمل پیکج میں دستیاب ہے۔"
  },

  // 🌿 Cotton
  {
    id: 8,
    slug: "triple-gene-ckc-1-cotton",
    crop: "Cotton",
    type: "Triple Gene",
    variety: "CKC-1",
    packSize: "10Kg",
    price: 8731,
    category: "Cotton",
    descriptionUrdu: "یہ کپاس کی قسم اعلی معیار کی ریشہ پیدا کرتی ہے۔"
  },
  {
    id: 9,
    slug: "bt-super-sultan-cotton",
    crop: "Cotton",
    type: "BT",
    variety: "Super Sultan",
    packSize: "5Kg",
    price: 5788,
    category: "Cotton",
    descriptionUrdu: "یہ BT کپاس کی قسم کیڑوں سے محفوظ اور زیادہ پیداوار دینے والی ہے۔"
  },

  // 🌻 Mustard
  {
    id: 10,
    slug: "opv-khanpur-raya-mustard",
    crop: "Mustard",
    type: "OPV",
    variety: "Khanpur Raya",
    packSize: "2Kg",
    price: 1190,
    category: "Mustard",
    descriptionUrdu: "یہ رائی کی قسم موسم سرما کے لیے موزوں اور معیاری تیل دیتی ہے۔"
  },
  {
    id: 11,
    slug: "opv-super-raya-mustard",
    crop: "Mustard",
    type: "OPV",
    variety: "Super Raya",
    packSize: "2Kg",
    price: 1190,
    category: "Mustard",
    descriptionUrdu: "یہ رائی کی قسم جلدی پکنے والی اور زیادہ منافع بخش ہے۔"
  },

  // 🌾 Paddy
  {
    id: 12,
    slug: "opv-irri-06-paddy",
    crop: "Paddy",
    type: "OPV",
    variety: "IRRI-06",
    packSize: "20Kg",
    price: 3950,
    category: "Paddy",
    descriptionUrdu: "یہ چاول کی قسم زیادہ پانی والی زمین کے لیے بہترین ہے۔"
  },
  {
    id: 13,
    slug: "opv-ksk-133-paddy",
    crop: "Paddy",
    type: "OPV",
    variety: "KSK-133",
    packSize: "20Kg",
    price: 3950,
    category: "Paddy",
    descriptionUrdu: "یہ OPV چاول قسم بیماریوں سے مضبوط اور زیادہ پیداوار دیتی ہے۔"
  },
  {
    id: 14,
    slug: "opv-basmati-515-paddy",
    crop: "Paddy",
    type: "OPV",
    variety: "Basmati 515",
    packSize: "20Kg",
    price: 5700,
    category: "Paddy",
    descriptionUrdu: "یہ باسمتی چاول کی قسم خوشبو دار اور اعلی معیار کی ہے۔"
  },

  // 🌾 Pearl Millet
  {
    id: 15,
    slug: "hybrid-sikandar-pearl-millet",
    crop: "Pearl Millet",
    type: "Hybrid",
    variety: "Sikandar",
    packSize: "2.5Kg",
    price: 3085,
    category: "Pearl Millet",
    image: "/images/Sikander.jpeg",
    descriptionUrdu: "یہ ہائبرڈ باجرا قسم خشک علاقوں میں بہترین پیداوار دیتی ہے۔"
  },

  // 🌿 Green Pea
  {
    id: 16,
    slug: "opv-meteor-green-pea",
    crop: "Green Pea",
    type: "OPV",
    variety: "Meteor",
    packSize: "25Kg",
    price: 13200,
    category: "Green Pea",
    image: "/images/Green-Pea.png",
    descriptionUrdu: "یہ مٹر کی قسم جلدی پکنے والی اور ذائقہ دار ہے۔"
  },

  // 🌾 Wheat
 
];

export default productsData;
