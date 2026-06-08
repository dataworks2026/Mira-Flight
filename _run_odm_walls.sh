#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  BAT Pier 4 — WALL-ONLY twin (140 photos from waypoint9 wall scan)
#  ULTRA-quality preset, identical flags to v1 but on a much smaller image set:
#    - 140 photos vs 794 = 17% the count
#    - 1920x1080 vs 4056x3040 = 33% the pixels
#    - Net: ~5-8% of v1's compute budget at the same quality settings
#  Expected wall-clock on c5.4xlarge: 60-120 min.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# Filled in by deploy script before running
MID="${MID:?must set MID env var}"
INSPECTION="${INSPECTION:?must set INSPECTION env var}"

SRC_DIR="/var/lib/docker/volumes/app_backend_storage/_data/inspections/${INSPECTION}"
DATASET_DIR="/var/lib/odm-data/${MID}"
IMAGES_DIR="${DATASET_DIR}/images"
LOG="${DATASET_DIR}/odm_run.log"
DOCKER_NAME="odm-walls-${MID:0:8}"

echo "════════════════════════════════════════════════════════════════════"
echo " BAT Pier 4 — WALL-ONLY twin · ULTRA-quality"
echo " mission: ${MID}"
echo "════════════════════════════════════════════════════════════════════"

echo "[1/5] Source storage"
sudo test -d "${SRC_DIR}" || { echo "FATAL: ${SRC_DIR} missing"; exit 2; }
JPG_COUNT=$(sudo find "${SRC_DIR}" -maxdepth 1 \( -name "*.JPG" -o -name "*.jpg" \) | wc -l)
echo "      ${JPG_COUNT} JPGs"

echo "[2/5] Stop any prior container"
sudo docker rm -f "${DOCKER_NAME}" 2>/dev/null || true

echo "[3/5] Stage dataset with HARDLINKS (so ODM container can read)"
sudo mkdir -p "${IMAGES_DIR}"
sudo find "${IMAGES_DIR}" -maxdepth 1 \( -type l -o -type f \) -delete
sudo find "${SRC_DIR}" -maxdepth 1 \( -name "*.JPG" -o -name "*.jpg" \) -print0 \
    | sudo xargs -0 -I{} ln -f {} "${IMAGES_DIR}/"
LINKED=$(sudo find "${IMAGES_DIR}" -maxdepth 1 -type f | wc -l)
echo "      ${LINKED} hardlinks created"

echo "[4/5] Pre-flight"
df -h /var/lib | tail -1
free -h | grep Mem
nproc

echo "[5/5] Launching ODM (detached)"
sudo truncate -s 0 "${LOG}"
sudo chmod 666 "${LOG}"

# ──── ODM FLAGS — ULTRA preset, identical to v1 ─────────────────────────────
#  Same flag set that produced the v1 99 MB OBJ / 346 atlas / 951k face twin.
#  Applied to just the 140 wall-scan photos for a focused side-view twin.
#  See _run_odm_pier4.sh for full rationale on each flag.
# ─────────────────────────────────────────────────────────────────────────────

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
echo "════════════════════════════════════════════════════════════════════"
echo " WALL-TWIN BUILD STARTED"
echo "════════════════════════════════════════════════════════════════════"
echo "  log    : tail -f ${LOG}"
echo "  output : ${DATASET_DIR}/odm_texturing/odm_textured_model_geo.obj"
echo "  viewer : http://3.133.43.231/twin/?mid=${MID}&name=BAT%20Pier%204%20Wall"
echo "  ETA    : 30 - 90 min"
