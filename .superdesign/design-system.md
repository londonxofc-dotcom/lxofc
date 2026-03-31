# Design System — Epstein File Generator

## Product Context
A satirical, interactive web app that generates random publicly-released Jeffrey Epstein court document links. The hero element is a large animated cutout of Epstein's face — the jaw splits open like South Park's Ike, and a spinning newspaper VFX sequence flies out of the mouth revealing a document headline. Sometimes a video player spins out instead. The tone is tabloid noir — conspiratorial, dramatic, slightly absurdist.

## Visual Direction
**Tabloid Noir** — classic investigative journalism aesthetics filtered through a dark web conspiracy board. Think: night-edition broadsheet, redacted documents, newsroom urgency. No clean SaaS polish. Rough, high-contrast, tactile.

## Color Palette
```
--black:      #080808   /* near-black page background */
--ink:        #1a1a1a   /* card/panel backgrounds */
--red:        #CC0000   /* tabloid red — primary accent */
--red-hot:    #FF1A1A   /* hover/active red */
--newsprint:  #F5E9C8   /* aged newsprint yellow-cream */
--headline:   #FFFFFF   /* stark white for big headlines */
--muted:      rgba(245, 233, 200, 0.45) /* muted text */
--border:     rgba(204, 0, 0, 0.25)     /* red tint borders */
--redact:     #000000   /* redacted block fill */
```

## Typography
- **Headlines / Display:** `Anton` (Google Fonts) — condensed bold, all-caps, tabloid energy
- **Subheadings:** `Bebas Neue` — for document labels, stamps, badges
- **Body / UI text:** `IBM Plex Mono` — monospace, typewriter feel, document-authentic
- **Redacted / Code:** `Courier New` — classic document text

```
--font-headline: 'Anton', sans-serif;
--font-sub:      'Bebas Neue', sans-serif;
--font-body:     'IBM Plex Mono', monospace;
```

## Layout
- **Single-page app** — full viewport
- **Hero zone** (top ~60% of screen): large Epstein face cutout centered, mouth animation triggers on click
- **Output zone** (bottom or overlaid): spinning newspaper / video player appears when mouth opens
- **Controls bar**: "OPEN FILES" trigger button, source badge, share button
- Mobile: face scales down, same layout stacks vertically

## Component Patterns

### Face Cutout
- Large (400–600px wide) REAL PHOTO of Jeffrey Epstein — no cartoon, no illustration
- Photo cropped/masked to show just the head/face, dark background bleeds out
- Two image layers, both showing the same photo:
  - Upper layer: clipped to show everything ABOVE the mouth line (forehead, eyes, nose)
  - Lower layer: clipped to show everything BELOW the mouth line (jaw, chin)
- Lower jaw layer animates: `transform: translateY(60px) rotate(12deg)` on trigger, revealing a dark cavity/"mouth opening" between the two halves
- Inside the gap (the revealed mouth opening): glowing red vignette, this is where the newspaper flies out from
- The split should feel like the face literally tears open at the lips

### Spinning Newspaper VFX
- A document card (newspaper front-page style) starts small, perspective-spins toward user
- `animation: spinIn 0.8s cubic-bezier(0.2, 0, 0.4, 1) forwards`
- Shows: HEADLINE (Anton, large), document date/source, redacted body text preview
- Has a "VIEW FULL DOCUMENT →" button
- Sometimes replaced by a video player thumbnail that spins in the same way

### Document Card
```
background: var(--newsprint)
color: var(--black)
border: 3px solid var(--red)
font-family: Anton for headline, IBM Plex Mono for body
top-bar: red strip with white text "CLASSIFIED" or source label
redacted lines: black blocks over partial text
```

### Video Card
- Same spin-in VFX as document
- Dark background (`--ink`)
- Thumbnail with red play button overlay
- "VIDEO EVIDENCE" label in Anton

### Trigger Button
```
background: var(--red)
color: var(--headline)
font: Anton, 24px, letter-spacing 0.15em
text: "OPEN THE FILES"
hover: scale(1.04), background: var(--red-hot)
border-radius: 0 (sharp corners — tabloid/stamp feel)
```

## Motion Patterns
- **Jaw open:** `0.35s ease-out` lower jaw rotates down ~25deg; tongue/gum revealed
- **Newspaper spin-in:** perspective 3D spin from small to full size, 0.8s, from inside mouth
- **Headline typewriter:** text reveals character by character after card lands
- **Redact shimmer:** subtle pulse on redacted blocks (opacity 0.7→1 loop)
- **Page load:** face fades in from below, Anton headline "THE FILES" slams in

## Texture & Atmosphere
- Very subtle grain overlay on entire page (SVG noise filter or CSS backdrop)
- Document cards have a slight paper texture or off-white gradient
- Red glow/vignette emanating from the mouth opening when active
- Scanline effect optional on video cards

## File/Document Data Shape
Each "file" entry:
```js
{
  type: "document" | "video",
  headline: "EPSTEIN ISLAND FLIGHT LOGS — FULL LIST",
  date: "Jan 3, 2024",
  source: "SDNY Court Filing",
  preview: "...[REDACTED]... victim alleges...[REDACTED]...",
  url: "https://..."  // actual public court doc link
}
```
