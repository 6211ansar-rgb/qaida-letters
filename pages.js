// Each Qaida page is one entry. To add a new page later:
// 1. put its cropped tiles in letters/<page-id>/ (or reuse the crop script)
// 2. add an entry here with the tiles in reading order (right to left, top to bottom)
// `cols` is how many boxes per row the book page has, so the picker looks like the book.
// Arabic names, spoken by the phone's Arabic voice when Mum taps "Hear answer"
const AR_NAMES = [
  "أَلِف", "بَاء", "تَاء", "ثَاء", "جِيم", "حَاء",
  "خَاء", "دَال", "ذَال", "رَاء", "زَاي", "سِين",
  "شِين", "صَاد", "ضَاد", "طَاء", "ظَاء", "عَيْن",
  "غَيْن", "فَاء", "قَاف", "كَاف", "لَام", "مِيم",
  "نُون", "وَاو", "هَاء", "هَمْزَة", "يَاء", "يَاء"
];

window.QAIDA_PAGES = [
  {
    id: "takhti-1",
    title: "Alif Ba Ta",
    cols: 6,
    letters: [
      "Alif", "Ba", "Ta", "Sa", "Jeem", "Ha",
      "Kha", "Daal", "Zaal", "Ra", "Za", "Seen",
      "Sheen", "Saad", "Zwaad", "Toay", "Zoay", "Ain",
      "Ghain", "Fa", "Qaaf", "Kaaf", "Laam", "Meem",
      "Noon", "Waw", "Ha", "Hamza", "Ya", "Bari Ya"
    ].map((name, i) => ({ name, ar: AR_NAMES[i], img: `letters/${String(i).padStart(2, "0")}.svg` }))
  }
];
