"""
server.py — SAK26 field telemetry receiver: DJI Cloud API (own aircraft)
           + ESP32/Sky-Spy Remote ID (other nearby drones).

This one small service now covers BOTH of SAK26's live-position features,
so a single Raspberry Pi (see ../README.md) can run everything:

  1. DJI CLOUD API (own aircraft + controller)
     DJI Pilot 2 pushes live telemetry over MQTT to a URL you give it
     under Cloud Service -> Open Platform — DJI's own sanctioned
     mechanism. See GET /telemetry/latest.

  2. ESP32 / SKY-SPY REMOTE ID (other drones nearby)
     A Sky-Spy-flashed ESP32-S3 (github.com/colonelpanichacks/Sky-Spy)
     plugged into this Pi's USB port sniffs ASTM F3411/ASD-STAN Remote ID
     broadcasts from ANY nearby compliant drone and outputs one JSON
     line per detection over USB serial — including both the drone's
     position AND the reported pilot/operator position. This script
     reads that serial stream and re-exposes it. See GET /remoteid/latest.

Both sources use the exact same pattern: something that can do what a
browser fundamentally cannot (speak MQTT / read raw USB serial) does the
real work, and SAK26 just polls a plain JSON endpoint — no different
from how it already polls PRIA/NOTAM/Sheets.

WHAT'S UNCERTAIN / NEEDS YOUR OWN VERIFICATION AGAINST REAL HARDWARE
---------------------------------------------------------------------
- DJI side: disambiguating "this SN is the aircraft" vs "this SN is the
  controller" isn't a labeled field in DJI's protocol — see
  `guess_device_kind()`. The JSBridge handshake sequence can also vary
  slightly by Pilot 2 version; the DJI Cloud API docs
  (github.com/dji-sdk/Cloud-API-Doc) are the source of truth, not this
  comment, if Pilot 2 doesn't connect on the first try.
- ESP32 side: the exact serial device path (e.g. /dev/ttyACM0) depends
  on your Pi/USB setup — set ESP32_SERIAL_PORT accordingly. Sky-Spy's
  JSON field names are matched exactly as documented in its README as
  of when this was written; if colonelpanichacks updates the schema,
  check `parse_remoteid_line()` against your actual serial output.
"""

import json
import os
import time
import threading

import paho.mqtt.client as mqtt
import serial
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

DJI_APP_ID = os.environ.get("DJI_APP_ID", "")
DJI_APP_KEY = os.environ.get("DJI_APP_KEY", "")
DJI_LICENSE = os.environ.get("DJI_LICENSE", "")

# The MQTT broker Pilot 2 will be told to connect to. On Fly.io, run this
# alongside an EMQX broker (see fly.toml / Dockerfile) reachable at this
# host — MQTT_BROKER_HOST should be the broker's public hostname:port that
# Pilot 2 (out in the field, on cellular data) can actually reach.
MQTT_BROKER_HOST = os.environ.get("MQTT_BROKER_HOST", "localhost")
MQTT_BROKER_PORT = int(os.environ.get("MQTT_BROKER_PORT", "1883"))

# CORS: SAK26 runs on a different origin (GitHub Pages / your own domain),
# so the browser needs this endpoint to allow cross-origin GET requests.
# Restrict this to your actual SAK26 URL once you know it, rather than "*".
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

# ESP32 (Sky-Spy firmware) Remote ID sniffer, connected via USB serial.
# Leave ESP32_SERIAL_PORT empty to run with DJI telemetry only (e.g. while
# testing before the ESP32 hardware exists yet) — this reader simply
# won't start rather than crashing the whole receiver.
ESP32_SERIAL_PORT = os.environ.get("ESP32_SERIAL_PORT", "")
ESP32_SERIAL_BAUD = int(os.environ.get("ESP32_SERIAL_BAUD", "115200"))

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# In-memory store of the latest telemetry per device (serial number).
# Fine for a single-operator setup; not meant for multi-tenant use.
latest_telemetry = {}
telemetry_lock = threading.Lock()

# In-memory store of the latest Remote ID detections, keyed by the
# transmitting drone's MAC address (Sky-Spy's own device identifier).
latest_remoteid = {}
remoteid_lock = threading.Lock()


def guess_device_kind(sn: str, data: dict) -> str:
    """Best-effort label — verify against your real hardware and adjust.
    Aircraft OSD messages carry flight-specific fields (gimbal payloads,
    horizontal_speed, gear/flight-mode); a ground-based controller's own
    OSD is expected to be simpler (just its own GPS/network/battery)."""
    aircraft_signal_fields = ("horizontal_speed", "gear", "elevation", "attitude_head")
    if any(f in data for f in aircraft_signal_fields):
        return "aircraft"
    return "controller"


def on_connect(client, userdata, flags, reason_code, properties=None):
    print(f"[MQTT] Connected (reason_code={reason_code}). Subscribing to thing/product/+/osd")
    client.subscribe("thing/product/+/osd")
    client.subscribe("sys/product/+/status")  # device online/offline registration


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
    except Exception as e:
        print(f"[MQTT] Failed to parse message on {msg.topic}: {e}")
        return

    # Topic shape: thing/product/{sn}/osd
    parts = msg.topic.split("/")
    if len(parts) < 3:
        return
    sn = parts[2]
    data = payload.get("data", {})

    if "latitude" not in data or "longitude" not in data:
        return  # not a telemetry message we care about (or fields not yet populated)

    with telemetry_lock:
        latest_telemetry[sn] = {
            "sn": sn,
            "kind": guess_device_kind(sn, data),
            "latitude": data.get("latitude"),
            "longitude": data.get("longitude"),
            "height": data.get("height"),
            "horizontal_speed": data.get("horizontal_speed"),
            "attitude_head": data.get("attitude_head"),
            "updated_at": time.time(),
            "raw": data,  # kept in full so SAK26's popup can show everything, same
                          # pattern as the NOTAM GEO "show all data" feature
        }
    print(f"[MQTT] Updated telemetry for {sn} ({latest_telemetry[sn]['kind']})")


def start_mqtt_client():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="sak26-receiver")
    client.on_connect = on_connect
    client.on_message = on_message
    while True:
        try:
            client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, keepalive=60)
            client.loop_forever()
        except Exception as e:
            print(f"[MQTT] Connection failed ({e}), retrying in 5s...")
            time.sleep(5)


def parse_remoteid_line(line: str):
    """Parse one line of Sky-Spy's JSON serial output. Returns the parsed
    dict, or None if the line isn't a valid/complete detection (Sky-Spy
    also sends periodic non-detection heartbeat lines)."""
    try:
        data = json.loads(line)
    except json.JSONDecodeError:
        return None
    if "mac" not in data or "drone_lat" not in data or "drone_long" not in data:
        return None  # heartbeat or malformed line, not a real detection
    return data


def start_remoteid_reader():
    print(f"[RemoteID] Opening {ESP32_SERIAL_PORT} @ {ESP32_SERIAL_BAUD} baud")
    while True:
        try:
            with serial.Serial(ESP32_SERIAL_PORT, ESP32_SERIAL_BAUD, timeout=2) as ser:
                print("[RemoteID] Serial port open, reading detections...")
                while True:
                    raw_line = ser.readline().decode("utf-8", errors="ignore").strip()
                    if not raw_line:
                        continue
                    data = parse_remoteid_line(raw_line)
                    if not data:
                        continue
                    with remoteid_lock:
                        latest_remoteid[data["mac"]] = {**data, "updated_at": time.time()}
                    print(f"[RemoteID] Detection: {data.get('basic_id', data['mac'])}")
        except Exception as e:
            print(f"[RemoteID] Serial error ({e}), retrying in 5s...")
            time.sleep(5)


@app.get("/telemetry/latest")
def telemetry_latest():
    """Polled by SAK26. Returns every device currently reporting telemetry."""
    with telemetry_lock:
        # Drop anything stale (no update in the last 30s) so a closed
        # session doesn't leave a ghost marker on the map forever.
        cutoff = time.time() - 30
        fresh = {sn: d for sn, d in latest_telemetry.items() if d["updated_at"] > cutoff}
    return JSONResponse({"devices": list(fresh.values()), "server_time": time.time()})


@app.get("/remoteid/latest")
def remoteid_latest():
    """Polled by SAK26. Returns every Remote ID detection seen recently."""
    with remoteid_lock:
        # Remote ID broadcasts repeat roughly once per second while a
        # drone is in range — a longer silence means it's out of range
        # (or landed/powered off), so drop it rather than leaving a
        # stale marker on the map.
        cutoff = time.time() - 15
        fresh = {mac: d for mac, d in latest_remoteid.items() if d["updated_at"] > cutoff}
    return JSONResponse({"detections": list(fresh.values()), "server_time": time.time()})



@app.get("/health")
def health():
    return {"ok": True, "time": time.time()}


@app.get("/pilot-login", response_class=HTMLResponse)
def pilot_login():
    """
    This is the H5 page DJI Pilot 2 requests when you enter this server's
    URL under Cloud Service -> Open Platform. Per DJI's documented
    handshake, it must call window.djiBridge.platformVerifyLicense(...)
    — that JS object is injected by Pilot 2's own WebView, not by us.
    """
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>SAK26 Telemetry Receiver</title></head>
<body>
<p id="status">Connecting to Pilot 2 cloud module...</p>
<script>
  function verify() {{
    if (window.djiBridge && window.djiBridge.platformVerifyLicense) {{
      try {{
        const result = window.djiBridge.platformVerifyLicense(
          "{DJI_APP_ID}", "{DJI_APP_KEY}", "{DJI_LICENSE}"
        );
        document.getElementById('status').textContent = 'License verify result: ' + result;
      }} catch (e) {{
        document.getElementById('status').textContent = 'Verify failed: ' + e;
      }}
    }} else {{
      // djiBridge may not be injected immediately — retry briefly.
      setTimeout(verify, 300);
    }}
  }}
  verify();
</script>
</body></html>"""


@app.on_event("startup")
def startup():
    if not (DJI_APP_ID and DJI_APP_KEY and DJI_LICENSE):
        print("[WARN] DJI_APP_ID / DJI_APP_KEY / DJI_LICENSE not set — "
              "the Pilot 2 login page will not be able to verify your app. "
              "Set these as Fly.io secrets (see README.md).")
    threading.Thread(target=start_mqtt_client, daemon=True).start()

    if ESP32_SERIAL_PORT:
        threading.Thread(target=start_remoteid_reader, daemon=True).start()
    else:
        print("[RemoteID] ESP32_SERIAL_PORT not set — Remote ID detection disabled "
              "(fine if you're only using the DJI telemetry feature so far).")
