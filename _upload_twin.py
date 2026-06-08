"""
Bulk-upload H20T wide JPGs to the Mira backend + trigger ODM (3D twin).
Usage:  python _upload_twin.py <photo_folder> <asset_id> <mission_name>
"""
import json, os, sys, time, requests
from datetime import datetime
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

BASE = "http://3.133.43.231/api/v1"
EMAIL, PASSWORD = "brooklynarmyterminal@gmail.com", "brooklynarmyterminal123"

# ── helpers ──────────────────────────────────────────────────────────────────
def gps_to_decimal(coord, ref):
    if not coord: return None
    d, m, s = coord
    dec = float(d) + float(m)/60 + float(s)/3600
    if ref in ("S", "W"): dec = -dec
    return dec

def read_exif(path):
    """Return (lat, lon, alt, timestamp_iso) from a JPG's EXIF; None on missing."""
    try:
        img = Image.open(path)
        exif = img._getexif() or {}
        tags = {TAGS.get(k, k): v for k, v in exif.items()}
        gps  = {GPSTAGS.get(k, k): v for k, v in tags.get("GPSInfo", {}).items()}
        lat  = gps_to_decimal(gps.get("GPSLatitude"),  gps.get("GPSLatitudeRef"))
        lon  = gps_to_decimal(gps.get("GPSLongitude"), gps.get("GPSLongitudeRef"))
        alt  = float(gps["GPSAltitude"]) if "GPSAltitude" in gps else None
        ts   = tags.get("DateTimeOriginal") or tags.get("DateTime")
        if ts:
            ts_iso = datetime.strptime(ts, "%Y:%m:%d %H:%M:%S").isoformat()
        else:
            ts_iso = datetime.now().isoformat()
        return lat, lon, alt, ts_iso
    except Exception as e:
        print(f"  EXIF read failed for {path}: {e}")
        return None, None, None, datetime.now().isoformat()

def login():
    r = requests.post(f"{BASE}/auth/login",
                      json={"email": EMAIL, "password": PASSWORD},
                      timeout=15)
    r.raise_for_status()
    return r.json()["access_token"]

def create_mission(tok, asset_id, name):
    h = {"Authorization": f"Bearer {tok}"}
    r = requests.post(f"{BASE}/missions",
                      json={"name": name,
                            "asset_id": asset_id,
                            "routine_type": "orbit",
                            "description": "Oblique 3D twin capture (DJI Pilot 2)"},
                      headers=h, timeout=20)
    r.raise_for_status()
    return r.json()["id"]

def upload_one(tok, mission_id, path):
    lat, lon, alt, ts = read_exif(path)
    if lat is None or lon is None:
        return False, "no GPS in EXIF"
    metadata = {
        "lat": lat, "lon": lon, "alt": alt or 0.0,
        "heading": 0.0, "gimbal_pitch": -60.0,
        "timestamp": ts, "camera_lens": "wide",
    }
    with open(path, "rb") as f:
        files = {"file": (os.path.basename(path), f, "image/jpeg")}
        data  = {"metadata": json.dumps(metadata)}
        r = requests.post(f"{BASE}/missions/{mission_id}/images/upload",
                          files=files, data=data,
                          headers={"Authorization": f"Bearer {tok}"},
                          timeout=120)
    if r.status_code >= 400:
        return False, f"HTTP {r.status_code}: {r.text[:200]}"
    return True, None

def trigger_odm(tok, mission_id):
    r = requests.post(f"{BASE}/odm/process",
                      json={"mission_id": mission_id},
                      headers={"Authorization": f"Bearer {tok}"},
                      timeout=30)
    return r.status_code, r.text[:500]

# ── main ─────────────────────────────────────────────────────────────────────
def main():
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(1)
    folder, asset_id, mission_name = sys.argv[1], sys.argv[2], sys.argv[3]
    photos = sorted([os.path.join(folder, f) for f in os.listdir(folder)
                     if f.lower().endswith((".jpg", ".jpeg"))])
    if not photos:
        print("no JPGs"); sys.exit(1)
    print(f"folder: {folder}")
    print(f"photos: {len(photos)}")

    # Sanity-check ONE photo's EXIF before doing all 280
    lat, lon, alt, ts = read_exif(photos[0])
    print(f"\nfirst photo EXIF: lat={lat} lon={lon} alt={alt}m ts={ts}")
    if lat is None or lon is None:
        print("FATAL: first photo has no GPS in EXIF — bailing out.")
        sys.exit(1)

    print("\nlogging in...")
    tok = login()
    print("creating mission...")
    mission_id = create_mission(tok, asset_id, mission_name)
    print(f"mission_id = {mission_id}")

    print(f"\nuploading {len(photos)} photos...")
    ok, fail = 0, 0
    t0 = time.time()
    for i, p in enumerate(photos, 1):
        success, err = upload_one(tok, mission_id, p)
        if success:
            ok += 1
        else:
            fail += 1
            print(f"  [{i}/{len(photos)}] FAIL {os.path.basename(p)}: {err}")
        if i % 20 == 0 or i == len(photos):
            elapsed = time.time() - t0
            rate = i / elapsed if elapsed else 0
            eta = (len(photos) - i) / rate if rate else 0
            print(f"  [{i}/{len(photos)}]  ok={ok}  fail={fail}  "
                  f"elapsed={elapsed:.0f}s  rate={rate:.1f}/s  eta={eta:.0f}s")

    print(f"\nupload done: {ok} ok, {fail} fail in {time.time()-t0:.0f}s")
    if ok == 0:
        print("nothing uploaded — skipping ODM trigger"); return

    print("\nSKIPPING auto ODM trigger — backend's docker compose call is broken (no 'odm' service).")
    print("ODM will be run manually with high-quality flags. See post-upload steps.")
    sc, body = "skipped", "manual run pending"
    print(f"  status: {sc}")
    print(f"  body:   {body}")
    print(f"\nDONE. View at http://3.133.43.231/twin/?mid={mission_id}&name={mission_name.replace(' ', '%20')}")

if __name__ == "__main__":
    main()
