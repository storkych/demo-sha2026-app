# Opening video: Ignatiy after the crash

## Current approved version — 2026-10-09

`intro.mp4` is the user-approved Gemini Omni version: 1920×1080, H.264/AAC, approximately 28.96 seconds. Russian speech and lip movements were generated together through Polza (`gemini-omni-video`). The crashed aircraft and exterior scenery remain stationary.

Four generated segments were assembled. A repeated phrase was removed with its matching picture. Strong digital packet-loss effects and brief audio crackles conceal the joins. Five additional partial digital disturbances appear between joins without additional sound. The slow reach toward the camera is shortened by a concealed cut directly to the hand covering the lens, followed by black. The complete dialogue below is retained; no separate TTS replaces the Gemini speech.

The approved eight-second sample cost 50 RUB; three additional image-reference segments cost 155 RUB. Rejected video-reference requests are not used.

Approved source: `.local/media-production/intro-gemini-full/intro-gemini-1080p-digital-damage-v2.mp4`. Generation prompts: `intro-hd-tests/gemini-1080p-prompt.json` and `intro-gemini-full/image-prompt-2.json` through `image-prompt-4.json`. Edit settings: `digital-damage-edits.json` and `scattered-damage-edits.json`. Source clips, job IDs, transcripts, scripts and old versions remain locally outside Git under `.local/media-production/`.

## Previous version — retained production history

Created on 2026-10-07. `intro.mp4` is a 25.85-second H.264/AAC video, 1280×720. It replaces the previous opening video.

The opening still was generated with the built-in image generation tool using the supplied Ignatiy portrait for identity and the updated crashed passenger cabin for the setting. Prompt: Preserve the same adult man's face, blue eyes, tousled blond hair, light stubble and white open-collar shirt. Show him in a centered chest-up medium close-up, seated inside the wrecked cabin, sad, exhausted and apprehensive. Dusty rumpled shirt, no blood. Dark-blue leather seats, torn ceiling panels, exposed wiring, sunset and amber practical lights. Stationary eye-level personal video message, no other people, text, captions or interface.

Motion generated through Polza using `bytedance/seedance-2-mini`, 480p, three clips of 12, 10 and 12 seconds. Video generation cost: 87.21 RUB. The final file is scaled to 720p for playback; the source video is 480p.

The model's native Russian dialogue was inaccurate, so its audio was replaced with a single male voice (`openai/gpt-4o-mini-tts`, `onyx`) through Polza. Voice generation cost: approximately 0.51 RUB. Lip synchronization is approximate. The assembled voice track was independently transcribed to verify the complete dialogue, with no extra closing phrase.

Dialogue, verbatim:

> я последний кто остался на этом самолёте. тут невозможно было выжить, мне грустно за этих людей. они же все хотели к своим семьям. мне их очень жаль. Мне кажется за мной следят, еще ничего не закончилось, больше ничего сказать не могу

Motion prompt: Stationary medium close-up matching the supplied frame and the same character's face, hair and dirty white shirt. Survivor records a personal message inside the grounded wrecked aircraft cabin. Subtle breathing, exhausted sad delivery, growing unease near the end. He glances over his shoulder and lowers his voice, then reaches toward the camera after his last sentence. No music, subtitles, added characters or scene changes. The final edit adds brief transmission dropouts between the clips and an abrupt black ending after he reaches toward the camera.

Source clips, prompts, job identifiers, reference portraits and previous opening video are saved locally outside Git in `.local/media-production/`.
