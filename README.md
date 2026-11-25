# Qaida Letters

A tiny, friendly revision app for Noorani Qaida. It shows the letters one at a time, shuffled, so a child learns to recognise each letter on its own instead of reciting from Alif every time.

- **Start**: all 30 boxes from the page, shuffled
- **Choose letters**: tap a letter or swipe across a row to pick which ones to test
- **Didn't know / Knew it!**: missed letters come back later in the round, and you can test only the missed ones at the end
- **Speed mode**: an optional 3, 5 or 8 second timer bar
- **Colours / Black**: show the letters in colour or plain black like the student's book

It's plain static HTML, CSS and JS with no build step. To deploy on Vercel, import the repo and click Deploy.

## Adding another page later
Crop the page's boxes into `letters/` (or a sub-folder) and add an entry to `pages.js`.
