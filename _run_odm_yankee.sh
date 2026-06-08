#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Yankee Pier — ULTRA-quality rerun, in-place at mission 2abe1a45
#  Same flag set as BAT Pier 4 v1 (the 15-hour ULTRA run that produced the
#  99 MB / 951k face / 173 atlas twin). 280 photos vs BAT's 794 → expect
#  ~5-7 hr wall-clock on c5.4xlarge. Mission ID stays the same so the
#  gov_island dashboard auto-picks up the new OBJ when it lands.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

MID="2abe1a45-0fc7-4e92-9d87-5c7cc7b0c1b8"
DATASET_DIR="/var/lib/odm-data/${MID}"
IMAGES_DIR="${DATASET_DIR}/images"
LOG="${DATASET_DIR}/odm_run.log"
DOCKER_NAME="odm-yankee-${MID:0:8}"

echo "════════════════════════════════════════════════════════════════════"
echo " Yankee Pier — ULTRA QUALITY rerun"
echo " mission: ${MID}"
echo "════════════════════════════════════════════════════════════════════"

JPG_COUNT=$(sudo find "${IMAGES_DIR}" -maxdepth 1 \( -name "*.JPG" -o -name "*.jpg" \) | wc -l)
echo "[1/3] ${JPG_COUNT} images in dataset (sourced from prior twin run)"
[ "${JPG_COUNT}" -ge 250 ] || { echo "FATAL: too few images, expected ~280"; exit 1; }

echo "[2/3] Stop any prior container + clear stale ODM state"
sudo docker rm -f "${DOCKER_NAME}" 2>/dev/null || true
sudo rm -rf "${DATASET_DIR}/opensfm" "${DATASET_DIR}/odm_filterpoints" \
            "${DATASET_DIR}/odm_meshing" "${DATASET_DIR}/odm_georeferencing" \
            "${DATASET_DIR}/odm_orthophoto" "${DATASET_DIR}/odm_dem" \
            "${DATASET_DIR}/odm_report" "${DATASET_DIR}/odm_texturing" \
            "${DATASET_DIR}/cameras.json" "${DATASET_DIR}/images.json" \
            "${DATASET_DIR}/img_list.txt"
sudo truncate -s 0 "${LOG}"
sudo chmod 666 "${LOG}"

sudo sysctl -q vm.swappiness=10 2>/dev/null || true

echo "[3/3] Launching ULTRA-quality ODM (detached)"

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

echo
echo "════════════════════════════════════════════════════════════════════"
echo " RUN STARTED"
echo "════════════════════════════════════════════════════════════════════"
echo "  log     : tail -F ${LOG}"
echo "  output  : ${DATASET_DIR}/odm_texturing/odm_textured_model_geo.obj"
echo "  viewer  : http://3.133.43.231/twin/?mid=${MID}&name=Yankee%20Pier"
echo "  ETA     : ~5-7 hours"
