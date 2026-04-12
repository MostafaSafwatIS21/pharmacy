export const formatCurrency = (value) =>
  new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
  }).format(Number(value || 0));

const AR_ONES = [
  "",
  "واحد",
  "اثنان",
  "ثلاثة",
  "أربعة",
  "خمسة",
  "ستة",
  "سبعة",
  "ثمانية",
  "تسعة",
];

const AR_TENS = [
  "",
  "",
  "عشرون",
  "ثلاثون",
  "أربعون",
  "خمسون",
  "ستون",
  "سبعون",
  "ثمانون",
  "تسعون",
];

const AR_TEENS = [
  "عشرة",
  "أحد عشر",
  "اثنا عشر",
  "ثلاثة عشر",
  "أربعة عشر",
  "خمسة عشر",
  "ستة عشر",
  "سبعة عشر",
  "ثمانية عشر",
  "تسعة عشر",
];

const AR_HUNDREDS = [
  "",
  "مائة",
  "مائتان",
  "ثلاثمائة",
  "أربعمائة",
  "خمسمائة",
  "ستمائة",
  "سبعمائة",
  "ثمانمائة",
  "تسعمائة",
];

const joinArabicParts = (parts) => parts.filter(Boolean).join(" و ");

const convertTripletToArabic = (num) => {
  if (!num) {
    return "";
  }

  const hundreds = Math.floor(num / 100);
  const rest = num % 100;
  const tens = Math.floor(rest / 10);
  const ones = rest % 10;

  const tokens = [];
  if (hundreds) {
    tokens.push(AR_HUNDREDS[hundreds]);
  }

  if (rest >= 10 && rest <= 19) {
    tokens.push(AR_TEENS[rest - 10]);
    return joinArabicParts(tokens);
  }

  if (ones && tens >= 2) {
    tokens.push(`${AR_ONES[ones]} و ${AR_TENS[tens]}`);
    return joinArabicParts(tokens);
  }

  if (tens >= 2) {
    tokens.push(AR_TENS[tens]);
    return joinArabicParts(tokens);
  }

  if (ones) {
    tokens.push(AR_ONES[ones]);
  }

  return joinArabicParts(tokens);
};

const convertIntegerToArabicWords = (num) => {
  if (num === 0) {
    return "صفر";
  }

  const scales = [
    { value: 1000000000, single: "مليار", dual: "ملياران", plural: "مليارات" },
    { value: 1000000, single: "مليون", dual: "مليونان", plural: "ملايين" },
    { value: 1000, single: "ألف", dual: "ألفان", plural: "آلاف" },
  ];

  let remaining = num;
  const parts = [];

  for (const scale of scales) {
    const amount = Math.floor(remaining / scale.value);
    if (!amount) {
      continue;
    }

    if (amount === 1) {
      parts.push(scale.single);
    } else if (amount === 2) {
      parts.push(scale.dual);
    } else if (amount >= 3 && amount <= 10) {
      parts.push(`${convertTripletToArabic(amount)} ${scale.plural}`);
    } else {
      parts.push(`${convertTripletToArabic(amount)} ${scale.single}`);
    }

    remaining %= scale.value;
  }

  if (remaining > 0) {
    parts.push(convertTripletToArabic(remaining));
  }

  return joinArabicParts(parts);
};

export const numberToArabicCurrencyText = (value) => {
  const safeValue = Math.max(0, Number(value || 0));
  const pounds = Math.floor(safeValue);
  const piasters = Math.round((safeValue - pounds) * 100);

  const poundsText = `${convertIntegerToArabicWords(pounds)} جنيه`;
  if (!piasters) {
    return `${poundsText} فقط لا غير`;
  }

  const piastersText = `${convertIntegerToArabicWords(piasters)} قرش`;
  return `${poundsText} و ${piastersText} فقط لا غير`;
};
