# Qaida Letters

A tiny, friendly revision app for Noorani Qaida. It shows the letters one at a time, shuffled, so a child learns to recognise each letter on its own instead of reciting from Alif every time.

- **Start**: all 30 boxes from the page, shuffled
- **Choose letters**: tap a letter or swipe across a row to pick which ones to test
- **Not yet / Got it!**: missed letters come back later in the round
- **End of round**: first-try score, average seconds per letter, and the letters that were missed or slow, with a button to test only those
- **Practice week**: a star for every day practised and a streak counter
- **Timer**: an optional 3, 5 or 8 second bar under each letter
- **Colour / Black** letters, gentle sounds (can be turned off), and the screen stays on during a round
- Letters are vector traces of the book page, so they stay sharp at any size

It's plain static HTML, CSS and JS with no build step. To deploy on Vercel, import the repo and click Deploy.

## Adding another page later
Crop the page's boxes into `letters/` (or a sub-folder) and add an entry to `pages.js`.
