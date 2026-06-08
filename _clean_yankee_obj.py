"""
Clean the Yankee Pier ULTRA OBJ by clipping mesh to a tight bounding box
around the pier deck. Removes surrounding vegetation, water, skyline noise
without re-running ODM. Run on EC2 as root via sudo python3.
"""
import os, shutil, sys, time

OBJ = "/var/lib/odm-data/2abe1a45-0fc7-4e92-9d87-5c7cc7b0c1b8/odm_texturing/odm_textured_model_geo.obj"
BAK = OBJ + ".pre_clean.bak"
TMP = OBJ + ".tmp"

# Tunables (metres)
DECK_BAND = 1.5      # window around median Z to identify the pier deck plane
FOOTPRINT_PCT = 0.02 # ignore outermost N% of deck vertices when computing XY footprint
XY_BUFFER = 6.0      # extra metres around pier footprint (catches pier edge + a little waterline)
Z_DOWN = 6.0         # keep Z from deck − 6 m (underside / piles)
Z_UP   = 14.0        # keep Z from deck + 14 m (any rooftop structures on pier)

def main():
    t0 = time.time()
    assert os.path.exists(OBJ), f"missing OBJ: {OBJ}"

    # Backup once — if a backup already exists, we are running a second pass; keep original backup.
    if not os.path.exists(BAK):
        print(f"[1/4] backing up original → {BAK}")
        shutil.copy2(OBJ, BAK)
    else:
        print(f"[1/4] backup already exists → {BAK}  (re-cleaning from original)")
        shutil.copy2(BAK, OBJ)

    # Pass 1: read all vertices
    print("[2/4] reading vertices...")
    verts = [None]  # 1-indexed in OBJ
    with open(BAK, "r") as f:
        for line in f:
            if line.startswith("v "):
                _, x, y, z = line.split()[:4]
                verts.append((float(x), float(y), float(z)))
    total_v = len(verts) - 1
    print(f"      {total_v:,} vertices")

    # Find deck plane (median Z is the pier deck — it's the dominant horizontal surface)
    zs = sorted(v[2] for v in verts[1:])
    median_z = zs[len(zs) // 2]
    print(f"      median Z (deck): {median_z:.2f} m")

    # Identify pier footprint by taking the X-Y bbox of vertices within DECK_BAND of median Z
    deck_v = [v for v in verts[1:] if abs(v[2] - median_z) < DECK_BAND]
    print(f"      deck-band vertices: {len(deck_v):,}")
    if len(deck_v) < 1000:
        print("FATAL: too few deck-band vertices, aborting"); sys.exit(2)

    xs = sorted(v[0] for v in deck_v)
    ys = sorted(v[1] for v in deck_v)
    n = len(xs)
    x_lo = xs[int(n * FOOTPRINT_PCT)] - XY_BUFFER
    x_hi = xs[int(n * (1 - FOOTPRINT_PCT))] + XY_BUFFER
    y_lo = ys[int(n * FOOTPRINT_PCT)] - XY_BUFFER
    y_hi = ys[int(n * (1 - FOOTPRINT_PCT))] + XY_BUFFER
    z_lo = median_z - Z_DOWN
    z_hi = median_z + Z_UP
    print(f"      clip box: X[{x_lo:.1f}, {x_hi:.1f}]  Y[{y_lo:.1f}, {y_hi:.1f}]  Z[{z_lo:.1f}, {z_hi:.1f}]")
    print(f"      footprint: {x_hi-x_lo:.1f} × {y_hi-y_lo:.1f} × {z_hi-z_lo:.1f} m")

    # Pass 2: mark which vertices to keep
    keep = bytearray(len(verts))   # 0 = drop, 1 = keep
    for i in range(1, len(verts)):
        x, y, z = verts[i]
        if x_lo <= x <= x_hi and y_lo <= y <= y_hi and z_lo <= z <= z_hi:
            keep[i] = 1
    kept_v = sum(keep)
    print(f"[3/4] {kept_v:,} / {total_v:,} vertices in clip box ({100*kept_v/total_v:.1f}%)")

    # Pass 3: rewrite OBJ, dropping faces with any rejected vertex
    print(f"[4/4] writing cleaned OBJ → {TMP}")
    kept_f = 0
    dropped_f = 0
    with open(BAK, "r") as fin, open(TMP, "w") as fout:
        for line in fin:
            if line.startswith("f "):
                parts = line.split()[1:]
                # Each part: "v" or "v/vt" or "v/vt/vn" or "v//vn"
                idxs = []
                ok = True
                for p in parts:
                    try:
                        idxs.append(int(p.split("/")[0]))
                    except ValueError:
                        ok = False; break
                if not ok:
                    fout.write(line); continue
                if all(keep[i] for i in idxs):
                    fout.write(line)
                    kept_f += 1
                else:
                    dropped_f += 1
            else:
                fout.write(line)

    # Atomic swap
    os.replace(TMP, OBJ)
    new_size = os.path.getsize(OBJ) / 1e6
    bak_size = os.path.getsize(BAK) / 1e6
    print(f"      faces kept: {kept_f:,}  dropped: {dropped_f:,}  ({100*kept_f/(kept_f+dropped_f):.1f}% kept)")
    print(f"      new OBJ:  {new_size:.1f} MB   (was {bak_size:.1f} MB)")
    print(f"      done in {time.time()-t0:.1f}s")

if __name__ == "__main__":
    main()
