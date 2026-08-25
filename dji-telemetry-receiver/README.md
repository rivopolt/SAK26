# SAK26 DJI telemetry receiver — deployment guide

This is a small, separate service (NOT part of the GitHub Pages static
site) that receives live telemetry from DJI Pilot 2 via DJI's official
"Cloud API," and exposes it as a plain JSON endpoint that SAK26 polls.

**Status: verified as far as I could without your actual hardware.**
Everything here has been tested for internal correctness (the FastAPI
app runs, the endpoint returns correct JSON, `paho-mqtt`'s exact API
usage was checked against the installed library's real source, the
`requirements.txt` installs cleanly, the Fly.io region code is real).
What I *cannot* verify without a real Matrice 4T + RC Plus 2 Enterprise
is whether DJI Pilot 2 actually completes its login handshake with this
exact H5 page and connects to the broker — that needs a live test on
your end. If it doesn't connect first try, the
[DJI Cloud API docs](https://github.com/dji-sdk/Cloud-API-Doc) and the
[DJI SDK forum](https://sdk-forum.dji.net) are the sources of truth,
not this README.

## What you need before starting

1. **A DJI developer account** — register free at
   [developer.dji.com](https://developer.dji.com). You'll need an
   **App ID**, **App Key**, and a **License** for the Cloud API — these
   are obtained through DJI's developer console (may require an
   application/approval step; this is DJI's process, not something I
   can shortcut).
2. **A Fly.io account** — free to create, billed only for what you run
   (~$5/month for the size this needs).
3. The `fly` CLI installed on your computer
   ([instructions](https://fly.io/docs/flyctl/install/)).

## Step 1 — Deploy an MQTT broker (EMQX)

DJI Pilot 2 needs an MQTT broker to connect to. EMQX has an official
Docker image and deploys to Fly.io directly:

```bash
fly launch --image emqx/emqx:5.0.20 --name sak26-emqx --region arn --now
```

Take note of the resulting hostname (e.g. `sak26-emqx.fly.dev`) — this
is your `MQTT_BROKER_HOST`. EMQX's default MQTT port is 1883.

**Note:** the free EMQX image defaults to *anonymous* MQTT login (no
username/password) — fine for a single-operator setup like this. If you
want to lock it down later, see EMQX's own docs for enabling
authentication, and update `server.py`'s MQTT client accordingly.

## Step 2 — Deploy this receiver

From inside this `dji-telemetry-receiver/` folder:

```bash
fly launch --now
```

(This uses the `fly.toml` and `Dockerfile` already in this folder — you
may be prompted to confirm the app name `sak26-dji-receiver` is
available, or pick a different one if it's taken.)

Then set your DJI credentials and the broker address as secrets (never
commit these to the repo):

```bash
fly secrets set DJI_APP_ID=your_app_id
fly secrets set DJI_APP_KEY=your_app_key
fly secrets set DJI_LICENSE=your_license
fly secrets set MQTT_BROKER_HOST=sak26-emqx.fly.dev
```

Once set, redeploy so the app picks them up:

```bash
fly deploy
```

## Step 3 — Connect DJI Pilot 2

1. On the RC Plus 2 Enterprise, open **DJI Pilot 2**.
2. Go to **Cloud Service → Open Platform**.
3. Enter your receiver's URL: `https://sak26-dji-receiver.fly.dev/pilot-login`
   (use your actual Fly.io app hostname).
4. Tap Connect. Watch the Fly.io logs (`fly logs`) — you should see
   `[MQTT] Connected` and then `[MQTT] Updated telemetry for <serial>`
   once Pilot 2 starts pushing data.

## Step 4 — Verify the endpoint works

```bash
curl https://sak26-dji-receiver.fly.dev/telemetry/latest
```

Should return JSON like:
```json
{"devices": [{"sn": "...", "kind": "aircraft", "latitude": ..., "longitude": ...}], "server_time": ...}
```

If `"kind"` looks wrong (e.g. the controller is labeled `"aircraft"`),
check the `raw` field for that device in the response and adjust
`guess_device_kind()` in `server.py` — see the comment at the top of
that function.

## Step 5 — Point SAK26 at it

In SAK26's `js/config.js`, set `CONFIG.droneTelemetry.receiverUrl` to
your receiver's base URL (e.g. `https://sak26-dji-receiver.fly.dev`).
See the main project README for how the map-side feature works.

## Optional — Remote ID (other nearby drones) via ESP32 + Sky-Spy

This server also runs a Remote ID reader — for detecting *other*
compliant drones nearby, not just your own Matrice 4T. It's off by
default and doesn't affect the DJI telemetry feature at all.

1. **Buy an ESP32-S3 board** — a Seeed XIAO ESP32-S3 is Sky-Spy's
   recommended board (~$10-15).
2. **Flash Sky-Spy firmware**: follow
   [colonelpanichacks/Sky-Spy](https://github.com/colonelpanichacks/Sky-Spy)'s
   own build instructions (PlatformIO, `pio run -e seeed_xiao_esp32s3`).
3. **Plug the ESP32 into your Pi** via USB.
4. **Find its serial device path** — on the Pi, run `ls /dev/ttyACM*` or
   `ls /dev/ttyUSB*` right after plugging it in; the new entry that
   appears is your port (commonly `/dev/ttyACM0`).
5. **Set the environment variable** and restart the receiver:
   ```bash
   fly secrets set ESP32_SERIAL_PORT=/dev/ttyACM0
   ```
   (If running this on the Pi directly rather than Fly.io — see below —
   just set this as a regular environment variable or in a `.env` file.)
6. **Verify**: `curl https://your-receiver-url/remoteid/latest` should
   return `{"detections": [...]}`, populated once Sky-Spy detects an
   actual nearby broadcasting drone.
7. In `js/config.js`, set `CONFIG.remoteId.receiverUrl` to the same URL
   as `droneTelemetry.receiverUrl`.

**Note on where this runs:** since this needs a physical USB connection
to the ESP32, it only makes sense running on the Raspberry Pi (see
below), not on Fly.io — Fly.io machines don't have a USB port for your
ESP32 to plug into. The DJI telemetry piece can stay on Fly.io *or* move
to the Pi; the Remote ID piece can only run wherever the ESP32
physically is.

## Security note

This is intentionally minimal — no auth on the `/telemetry/latest`
endpoint, no MQTT password. That's appropriate for a personal/single-
operator setup, but it does mean anyone who finds your receiver's URL
could read your live position while flying. Tighten `ALLOWED_ORIGIN` in
`fly.toml` to your actual SAK26 domain at minimum, and consider adding a
shared-secret query parameter or proper auth if that matters for your
use case.

## Moving to (or starting with) a Raspberry Pi

Everything here is plain Python + Docker, so it runs on a Pi with
minimal changes — the main differences: no Fly.io `fly.toml` (run the
containers directly, e.g. `docker compose`, or just `pip install -r
requirements.txt` + `uvicorn server:app` straight on the Pi's OS without
Docker at all, which is simplest for a single always-on device), and
you'll need either a local WiFi hotspot (simplest for field use with no
internet dependency — see the main SAK26 README's note on this) or
dynamic DNS (e.g. free DuckDNS) + a reverse proxy (Caddy makes HTTPS
nearly automatic) if you want it reachable over the regular internet.

**Recommended board: Raspberry Pi 3B+** (~$35) — quad-core, 1GB RAM,
**dual-band 2.4/5GHz WiFi**, native USB-A ports. This supersedes an
earlier draft of this README that recommended the Pi Zero 2 W — worth
explaining why, since it's a safety-relevant reason, not just a spec
upgrade:

DJI's own SDK documentation and OcuSync literature confirm the Matrice
4T's control link (like other enterprise OcuSync/O3 systems) is
genuinely dual-band and auto-switches to 2.4GHz when it judges that
clearer — it isn't a 5.8GHz-only system. The Pi Zero 2 W's WiFi is
**2.4GHz-only**. If this receiver hosts its own local WiFi network for
field use (see above) and sits physically next to actively-flying
control equipment that may itself be using 2.4GHz, that's a real
spectrum-sharing risk, not a theoretical one — worth avoiding outright
rather than trusting OcuSync's interference-avoidance to handle it
gracefully. The 3B+'s dual-band radio lets you dedicate the local
network to 5GHz specifically, removing the overlap entirely. Its native
USB-A ports are also a smaller, unrelated bonus — no OTG adapter needed
for the ESP32.

Either way, swap the MQTT broker from EMQX to **Mosquitto** — EMQX's
baseline footprint is unnecessary weight for a single-aircraft,
single-operator setup regardless of which Pi you use; Mosquitto does
the identical job far more lightly.

**Note:** the Remote ID (ESP32/Sky-Spy) feature above can *only* run on
a Pi (or similar), never on Fly.io, since it needs a physical USB port
for the ESP32. If you want both features, the Pi is the natural home for
both rather than splitting them across Fly.io and a Pi.
