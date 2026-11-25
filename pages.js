// Each Qaida page is one entry. To add a new page later:
// 1. put its cropped tiles in letters/<page-id>/ (or reuse the crop script)
// 2. add an entry here with the tiles in reading order (right to left, top to bottom)
// `cols` is how many boxes per row the book page has, so the picker looks like the book.
window.QAIDA_PAGES = [
  {
    id: "takhti-1",
    title: "Alif Ba Ta",
    cols: 6,
    letters: [
      "Alif", "Ba", "Ta", "Sa", "Jeem", "Ha",
      "Kha", "Daal", "Zaal", "Ra", "Za", "Seen",
      "Sheen", "Saad", "Dwaad", "Toay", "Zoay", "Ain",
      "Ghain", "Fa", "Qaaf", "Kaaf", "Laam", "Meem",
      "Noon", "Waw", "Ha", "Hamza", "Ya", "Bari Ya"
    ].map((name, i) => ({ name, img: `letters/${String(i).padStart(2, "0")}.svg` }))
  }
];
