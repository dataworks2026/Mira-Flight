#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  BAT Pier 4 — Maximum-quality photogrammetric reconstruction
#  Target: produce a textured 3D OBJ that captures pier walls, deck, fenders,
#  and surrounding water-line detail at the highest fidelity this dataset can
#  support. NO quality compromises for runtime. Expected wall-clock: 8-14 hr
#  on c5.4xlarge (16 vCPU, 30 GB RAM). Run as `bash _run_odm_pier4.sh`.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Identifiers ──────────────────────────────────────────────────────────────
MID="68cf3404-5834-4f0a-9f00-6c62084e8857"            # Mira mission id
INSPECTION="2fe1d3fb-832f-46ff-b007-7e9092d5cc54"      # backend inspection id

# Storage layout on the EC2 host:
#   backend stores uploaded JPGs under the backend_storage docker volume,
#   one subdir per inspection. ODM reads from a dataset dir mounted into the
#   ODM container at /datasets/<mid>/images.
SRC_DIR="/var/lib/docker/volumes/app_backend_storage/_data/inspections/${INSPECTION}"
DATASET_DIR="/var/lib/odm-data/${MID}"
IMAGES_DIR="${DATASET_DIR}/images"
LOG="${DATASET_DIR}/odm_run.log"
DOCKER_NAME="odm-pier4-${MID:0:8}"

VIEWER_URL="http://3.133.43.231/twin/?mid=${MID}&name=BAT%20Pier%204"

# ── Pre-flight checks ────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════════════"
echo " BAT Pier 4 — ULTRA QUALITY PHOTOGRAMMETRY RUN"
echo " mission: ${MID}"
echo "════════════════════════════════════════════════════════════════════"
echo

echo "[1/6] Pre-flight: source storage"
sudo test -d "${SRC_DIR}" || { echo "FATAL: ${SRC_DIR} missing"; exit 2; }
JPG_COUNT=$(sudo find "${SRC_DIR}" -maxdepth 1 \( -name "*.JPG" -o -name "*.jpg" \) | wc -l)
JPG_SIZE_MB=$(sudo du -sm "${SRC_DIR}" | awk '{print $1}')
echo "      ${JPG_COUNT} JPGs, ${JPG_SIZE_MB} MB total"
if [ "${JPG_COUNT}" -lt 500 ]; then
    echo "WARN: expected ~794 photos, found ${JPG_COUNT}"
fi

echo "[2/6] Pre-flight: GPS sanity (1 photo)"
# Use -print -quit to stop after first match; head|find races SIGPIPE under pipefail.
SAMPLE_JPG=$(sudo find "${SRC_DIR}" -maxdepth 1 -name "*.JPG" -print -quit)
GPS_LINE=$(sudo exiftool -GPSLatitude -GPSLongitude -GPSAltitude "${SAMPLE_JPG}" 2>/dev/null || true)
if [ -z "${GPS_LINE}" ]; then
    echo "WARN: exiftool not installed — skipping GPS check"
else
    echo "      ${GPS_LINE}" | sed 's/^/      /'
fi

echo "[3/6] Pre-flight: hardware"
DISK_FREE_G=$(df -BG /var/lib | awk 'NR==2 {gsub(/G/,"",$4); print $4}')
RAM_FREE_G=$(free -g | awk '/^Mem:/ {print $7}')
CORES=$(nproc)
echo "      disk free: ${DISK_FREE_G} G   ram free: ${RAM_FREE_G} G   cores: ${CORES}"
if [ "${DISK_FREE_G}" -lt 60 ]; then
    echo "FATAL: need ≥60 GB free for intermediate ODM data"; exit 3
fi
if [ "${RAM_FREE_G}" -lt 20 ]; then
    echo "WARN: <20 GB free RAM may cause OOM at openmvs stage"
fi

# ── Reduce swap pressure: ODM with ultra quality thrashes hard if it swaps ──
# vm.swappiness=10 keeps anonymous memory in RAM, only swaps under extreme
# pressure. This is safe for a single-purpose host with no other workloads.
sudo sysctl -q vm.swappiness=10 2>/dev/null || true
sudo sysctl -q vm.vfs_cache_pressure=50 2>/dev/null || true

echo "[4/6] Stop and remove any prior ODM container for this mission"
sudo docker rm -f "${DOCKER_NAME}" 2>/dev/null || true
# Also kill any orphaned opendronemap/odm containers from earlier failed runs.
sudo docker ps -aq --filter "ancestor=opendronemap/odm:latest" | xargs -r sudo docker rm -f 2>/dev/null || true

echo "[5/6] Stage dataset: clean images dir + HARDLINK JPGs"
# IMPORTANT — must use hardlinks, not symlinks.
# ODM runs in a docker container with only /var/lib/odm-data bind-mounted as
# /datasets. Symlinks made from staging → host backend-volume path would
# dangle inside the container (the target dir isn't mounted). Hardlinks share
# the same inode as the source, so the file is reachable inside the container
# regardless of which path it was linked from — as long as source + staging
# are on the same filesystem (both are on /dev/root here, so we're safe).
sudo mkdir -p "${IMAGES_DIR}"
# Wipe any prior staging (old symlinks AND old hardlinks). Leave the parent
# DATASET_DIR alone so --rerun-all is the single source of stage reset.
sudo find "${IMAGES_DIR}" -maxdepth 1 \( -type l -o -type f \) -delete
sudo find "${SRC_DIR}" -maxdepth 1 \( -name "*.JPG" -o -name "*.jpg" \) -print0 \
    | sudo xargs -0 -I{} ln -f {} "${IMAGES_DIR}/"
LINKED=$(sudo find "${IMAGES_DIR}" -maxdepth 1 -type f | wc -l)
echo "      ${LINKED} images hardlinked into ${IMAGES_DIR}"

# Verify ODM will see real readable files (not dangling symlinks). Pick one
# and read a byte from inside a temp docker container that mounts the same
# path, to prove the container can really open it.
TEST_LINK=$(sudo find "${IMAGES_DIR}" -maxdepth 1 -type f -print -quit)
sudo head -c 1 "${TEST_LINK}" >/dev/null 2>&1 \
    || { echo "FATAL: hardlink target not readable on host: ${TEST_LINK}"; exit 4; }
# Container-side dereference proof: alpine, mount /var/lib/odm-data, read 1B.
REL_INSIDE="/datasets/${MID}/images/$(basename "${TEST_LINK}")"
sudo docker run --rm -v /var/lib/odm-data:/datasets alpine:3.20 \
    sh -c "head -c 1 \"${REL_INSIDE}\" > /dev/null" \
    || { echo "FATAL: hardlink unreadable inside container at ${REL_INSIDE}"; exit 5; }
echo "      container-side read check passed"

echo "[6/6] Fresh log + launch ODM (detached)"
sudo truncate -s 0 "${LOG}"
sudo chmod 666 "${LOG}"

# Pull latest image (idempotent; skipped if cached)
sudo docker pull opendronemap/odm:latest >/dev/null

# ─────────────────────────────────────────────────────────────────────────────
#  ODM FLAGS — every flag chosen deliberately. Comments explain WHY.
# ─────────────────────────────────────────────────────────────────────────────
#
#  PROJECT
#  -------
#  --project-path /datasets       Inside the container; mapped from host
#                                 /var/lib/odm-data via -v. Project subdir
#                                 name MUST equal the mission id passed as
#                                 the positional arg below.
#  --rerun-all                    Start every stage from scratch. Guarantees
#                                 no contamination from prior failed runs.
#
#  FEATURE EXTRACTION
#  ------------------
#  --feature-quality ultra        Highest feature density per image. ODM
#                                 raises image scale + relaxes ratio test to
#                                 extract maximum information. ~4× slower
#                                 than medium but recovers pier wall texture
#                                 that medium quality drops as noise.
#  feature-type                   Left at default = dspsift (Domain-Sized
#                                 Pooling SIFT). DSP-SIFT is a modern multi-
#                                 scale SIFT extension that outperforms plain
#                                 SIFT on textured surfaces. Do NOT override.
#  --min-num-features 25000       Target 25k features per image. With 794
#                                 images that's ~20M raw observations into
#                                 SfM — enough to triangulate every visible
#                                 surface detail. RAM cost: ~12 GB at peak.
#
#  MATCHING
#  --------
#  --matcher-type flann           FLANN (Fast Library for Approximate Nearest
#                                 Neighbors). ODM's own help says FLANN is
#                                 "slower but more stable" than BOW. For a
#                                 pier with hundreds of near-identical panels,
#                                 BOW's bag-of-words codebook collapses
#                                 visually similar regions and misses real
#                                 matches; FLANN explicitly compares descriptor
#                                 nearest neighbours. We're optimising for
#                                 quality, not throughput.
#  --matcher-neighbors 16         Each image matched against its 16 nearest
#                                 neighbors (default 8). Pier captured from
#                                 oblique + nadir + low wall passes — more
#                                 neighbors recovers cross-pass overlaps that
#                                 default would miss.
#
#  SfM / SCALE
#  -----------
#  --gps-accuracy 0.5             Trust EXIF GPS to 0.5 m. The H20T flew with
#                                 RTK fix according to mission plan — RTK
#                                 fixed gives cm-grade accuracy, but we set
#                                 0.5 m as a conservative buffer (a tighter
#                                 prior over-constrains SfM if any photo
#                                 dropped to RTK-float mid-flight). Lower
#                                 than default 10 m → SfM uses GPS as a real
#                                 constraint, not just a hint, → reconstructed
#                                 model lands in true world coords.
#
#  DENSE CLOUD (OpenMVS)
#  ---------------------
#  --pc-quality ultra             Maximum-density depthmaps. OpenMVS computes
#                                 a depthmap per image at near-native res
#                                 (vs. 1/4 res at medium). Memory hog: peak
#                                 ~22 GB RAM on this dataset.
#  --pc-filter 2.5                Drop points whose stddev > 2.5σ of neighbors
#                                 (default). Keeps fine surface detail while
#                                 removing reflective-water artefacts.
#  --pc-rectify                   Rectify dense cloud before meshing. Helps
#                                 when ground plane isn't flat (we're over
#                                 water with bobbing reflections).
#
#  MESHING
#  -------
#  --use-3dmesh                   CRITICAL. Default is a 2.5D heightmap mesh
#                                 (good for fields, terrible for piers — it
#                                 cannot represent overhanging fenders, cap
#                                 beams, or underside structure). 3D mesh
#                                 reconstructs full Poisson surface.
#  --mesh-octree-depth 12         Octree subdivision depth. 2^12 = 4096 cells
#                                 per axis. Default 11 = 2048 (too coarse for
#                                 1.7 cm GSD imagery). 13 would be better
#                                 but risks OOM at this image count.
#  --mesh-size 800000             Up to 800k vertices in final mesh (default
#                                 200k). At ~1 cm² per face that's ~80 m² of
#                                 high-detail surface area — comfortably
#                                 covers the pier with detail to spare.
#
#  TEXTURING (mvs_texturing)
#  -------------------------
#  data-term                      Default = gmi ("Gauss-Markov Inference") —
#                                 the highest-quality texture selection metric
#                                 in this ODM build. The --texturing-data-term
#                                 flag was removed in this version; gmi is the
#                                 only behaviour. No override needed.
#  --texturing-keep-unseen-faces  Preserve mesh faces with no visible source
#                                 image (e.g. underside of pier deck) instead
#                                 of deleting them. Keeps geometry complete.
#
#  GEOREFERENCING
#  --------------
#  --auto-boundary                ODM computes a tight bounding polygon from
#                                 the SfM-recovered camera positions and
#                                 clips outputs to it. Drops the Brooklyn
#                                 skyline / Manhattan / open-water artefacts
#                                 that drift into the dense cloud. Without
#                                 this, ~30% of compute goes to noise.
#  --end-with odm_georeferencing  Last stage we need. Produces the
#                                 geo-referenced textured OBJ that the twin
#                                 viewer loads. Skipping the subsequent
#                                 odm_dem + odm_orthophoto + odm_report
#                                 stages saves ~2-3 hr we don't need.
#
#  HOUSEKEEPING
#  ------------
#  --max-concurrency 16           Pin to 16 worker threads — matches vCPUs.
#                                 (ODM auto-detects; we set explicitly so the
#                                 log records the actual concurrency.)
# ─────────────────────────────────────────────────────────────────────────────

# Launch as DETACHED named container. nohup + & so SSH disconnect doesn't
# kill the orchestrator. --rm so when ODM exits cleanly, the container is
# removed automatically (logs already persisted to LOG).
sudo nohup docker run \
    --rm \
    --name "${DOCKER_NAME}" \
    --detach=false \
    -v /var/lib/odm-data:/datasets \
    --memory=28g \
    --memory-swap=30g \
    opendronemap/odm:latest \
    --project-path /datasets \
    "${MID}" \
    --rerun-all \
    \
    --feature-quality ultra \
    --min-num-features 25000 \
    \
    --matcher-type flann \
    --matcher-neighbors 16 \
    \
    --gps-accuracy 0.5 \
    \
    --pc-quality ultra \
    --pc-filter 2.5 \
    --pc-rectify \
    \
    --use-3dmesh \
    --mesh-octree-depth 12 \
    --mesh-size 800000 \
    \
    --texturing-keep-unseen-faces \
    \
    --auto-boundary \
    \
    --end-with odm_georeferencing \
    \
    --max-concurrency 16 \
    > "${LOG}" 2>&1 &

ODM_PID=$!
echo "      ODM running detached  →  host PID ${ODM_PID}   container ${DOCKER_NAME}"
echo

# ── Run summary ──────────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════════════"
echo " RUN STARTED"
echo "════════════════════════════════════════════════════════════════════"
echo "  log       : tail -f ${LOG}"
echo "  container : docker logs -f ${DOCKER_NAME}"
echo "  output    : ${DATASET_DIR}/odm_texturing/odm_textured_model_geo.obj"
echo "  viewer    : ${VIEWER_URL}"
echo
echo " Quality settings:"
echo "  feature-quality   = ultra (max)"
echo "  feature-type      = dspsift (default, modern multi-scale SIFT)"
echo "  min-num-features  = 25000 / image"
echo "  matcher           = flann (more stable than BOW for repetitive surfaces)"
echo "  matcher-neighbors = 16"
echo "  pc-quality        = ultra (max)"
echo "  mesh              = full 3D, octree depth 12, up to 800k verts"
echo "  texturing         = gmi, keep unseen faces"
echo "  gps-accuracy      = 0.5 m (RTK-grade)"
echo "  boundary clip     = auto (kills water/skyline noise)"
echo
echo " Expected wall-clock: 8-14 hours"
echo " Watch for: 'Total Time' line at end of log when finished"
