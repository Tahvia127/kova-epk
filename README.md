# KOVA — Electronic Press Kit

An artist site with a player that actually plays, dates a promoter can read, and a press kit they can download without emailing anyone.

**Status:** unpublished demo. Not on GitHub Pages, not linked from the studio site.
**Built by:** Framework Studio.

---

## What this one proves

**Embedded media that works.** A custom audio player: playlist, play and pause, click-to-seek, running time, auto-advance to the next track, and durations read from each file's metadata rather than typed into the data by hand. No player library.

**Tour dates that respect the reader.** Upcoming and past are separate views. Sold-out shows say so instead of linking to a dead ticket page, and past dates are kept because promoters look at where an artist has already played.

**A press kit with no gate.** Photographs and the bio-plus-rider download directly. Making a promoter email for assets is how an artist loses the slot.

**Mailing list capture** with validation, which is the one piece of an EPK that compounds.

## The audio is original

The three preview clips were **synthesised for this build** by `tools/synth.py`, using nothing but the Python standard library. That was deliberate: it means the player is genuinely functional rather than decorative, and there is no licensing question about redistributing someone else's music in a portfolio piece.

```bash
python3 tools/synth.py     # regenerate the clips
```

They are WAV because there is no MP3 encoder in the build environment. For a real client these are the artist's own MP3s at roughly a tenth of the size, or this whole block is swapped for a Bandcamp or Spotify embed.

## How it works

```
data/site.json  ─┐
data/music.json ─┤─> build.mjs ─> index.html
data/dates.json ─┘
```

`build.mjs` checks that every track file named in `music.json` exists on disk and **exits non-zero** if one is missing, because a player pointed at a 404 fails silently and looks like a broken site.

Zero dependencies.

## Repository layout

```
tools/synth.py     Generates the preview clips. Stdlib only.
data/music.json    Tracks, releases, artwork, audio paths.
data/dates.json    Tour dates. status: tickets | soldout | past.
data/site.json     Artist details, bio, booking contacts, demo notice.
assets/press/      The downloadable bio and tech rider.
build.mjs          Renders and validates. No dependencies.
index.html         Generated. Do not edit by hand.
```

## Design notes

- **Dark-first**, which suits the subject and is the one register the rest of the portfolio does not cover.
- **Type:** Syne for display, Inter for body.
- **Color:** `#0B0B0F` ground, violet `#A78BFA`. Every text pairing clears WCAG AA; the lowest is 5.15:1.
- **`.date[hidden]{display:none}` is explicit**, because `.date` is a grid and a `display` value in a stylesheet beats the browser's default rule for the `hidden` attribute. Without it the toggle sets the attribute and nothing visibly changes.

## Before this goes to a real client

1. Replace the clips with the artist's own audio, or swap the section for a Bandcamp embed.
2. Point ticket links at the real ticketing pages.
3. Point the mailing list at Mailchimp, Buttondown or ConvertKit.
4. Replace the photography and add real photo credits.
5. Set `demo.show` to `false` in `data/site.json`.

## A note on the artist

KOVA is fictional. The venues are real Midwest rooms but the bookings are invented, the contact addresses use `.example`, and the phone is in the reserved 555 block. Photography is Unsplash, under the Unsplash License, and the press-photo credit lines are placeholders rather than invented photographer names.
