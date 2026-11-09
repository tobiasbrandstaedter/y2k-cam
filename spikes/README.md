# Spikes

Throwaway prototypes that answer the open technical questions in `PRODUKTVISION.md` before the stack is final. Each folder is a self contained static page. Nothing here is production code; the real app lives in `src/`.

| Spike             | Answers                                                                                                           | Vision IDs                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `video-export/`   | Can a 30 s 1080p clip with a per frame effect be re-encoded to MP4 in at most 2x clip length? Does audio survive? | QA-3, QA-4, QA-5, offene Frage 1 |
| `input-formats/`  | What does iOS Safari hand over for HEIC photos and HEVC/HDR MOV clips? Does iOS transcode?                        | IM-3, offene Frage 4             |
| `image-pipeline/` | How long does a Look switch take on a 12 MP photo with four chained WebGL2 passes?                                | QA-2                             |

`index.html` is a hub that also prints a capability table (WebCodecs, WebGL2, storage, share, ...). Open it first and photograph or copy the table.

## Serving to the iPhone

The pages need HTTPS: WebCodecs and `navigator.share` only exist in secure contexts, and a plain `http://192.168.x.x` LAN address is not one.

**Option 1: local dev server over WLAN (fastest loop)**

1. On the PC, in the repo root: `pnpm install` once, then `pnpm spikes`.
2. Vite prints a `Network:` URL like `https://192.168.1.23:5180/`. PC and iPhone must be on the same WLAN.
3. Open that URL in Safari on the iPhone. Safari warns about the self signed certificate: tap "Show Details", then "visit this website", confirm.
4. The page is now a secure context. Open the spike you want.

If the warning page offers no way through, use option 2.

**Option 2: any static host (most reliable)**

Upload the `spikes/` folder as is to a static host with HTTPS (Netlify Drop, Cloudflare Pages, GitHub Pages, your own web space). Open `https://<host>/spikes/` on the phone. mediabunny is loaded from jsdelivr, so the phone needs internet either way.

## Reading the numbers

Each page prints its measurements into tables on screen. Copy them into `docs/testing/spike-protocol.md`. Do a run both from a Safari tab and from the home screen (Share, "Add to Home Screen") because capabilities can differ.
