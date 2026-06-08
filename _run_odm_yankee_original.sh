#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Yankee Pier — REVERT to original-style muddy twin (per user request)
#  Flag set chosen to match what the original ODM run used (defaults). The
#  user prefers the simpler 22 MB / 165k-face blob over today's ULTRA rerun
#  because the ULTRA reconstruction picked up too much surrounding vegetation
#  detail that obscured the pier.
#
#  Also preserves today's ULTRA OBJ + textures aside so we can switch back.
#  Same mission_id (2abe1a45) — dashboard auto-picks the new OBJ when done.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

MID="2abe1a45-0fc7-4e92-9d87-5c7cc7b0c1b8"
DATASET_DIR="/var/lib/odm-data/${MID}"
IMAGES_DIR="${DATASET_DIR}/images"
TEX_DIR="${DATASET_DIR}/odm_texturing"
LOG="${DATASET_DIR}/odm_run.log"
DOCKER_NAME="odm-yankee-revert-${MID:0:8}"

# Snapshot today's ULTRA build for one-line revert later
ULTRA_BACKUP_DIR="${DATASET_DIR}/_ULTRA_BACKUP_$(date +%Y%m%d_%H%M%S)"

echo "════════════════════════════════════════════════════════════════════"
echo " Yankee Pier — REVERT to original (default-quality) twin"
echo " mission: ${MID}"
echo "════════════════════════════════════════════════════════════════════"

# 1) Sanity
JPG_COUNT=$(sudo find "${IMAGES_DIR}" -maxdepth 1 \( -name "*.JPG" -o -name "*.jpg" \) | wc -l)
echo "[1/4] ${JPG_COUNT} images in dataset"
[ "${JPG_COUNT}" -ge 250 ] || { echo "FATAL: too few images"; exit 1; }

# 2) Move today's ULTRA outputs aside (don't delete — easy revert)
echo "[2/4] Snapshotting today's ULTRA outputs → ${ULTRA_BACKUP_DIR}"
sudo mkdir -p "${ULTRA_BACKUP_DIR}"
sudo mv "${TEX_DIR}" "${ULTRA_BACKUP_DIR}/odm_texturing" 2>/dev/null || true
sudo mv "${DATASET_DIR}/odm_meshing"        "${ULTRA_BACKUP_DIR}/" 2>/dev/null || true
sudo mv "${DATASET_DIR}/odm_filterpoints"   "${ULTRA_BACKUP_DIR}/" 2>/dev/null || true
sudo mv "${DATASET_DIR}/odm_georeferencing" "${ULTRA_BACKUP_DIR}/" 2>/dev/null || true

# 3) Wipe ODM intermediates so --rerun-all is clean
sudo docker rm -f "${DOCKER_NAME}" 2>/dev/null || true
sudo rm -rf "${DATASET_DIR}/opensfm" "${DATASET_DIR}/odm_orthophoto" \
            "${DATASET_DIR}/odm_dem" "${DATASET_DIR}/odm_report" \
            "${DATASET_DIR}/cameras.json" "${DATASET_DIR}/images.json" \
            "${DATASET_DIR}/img_list.txt" "${DATASET_DIR}/log.json" \
            "${DATASET_DIR}/options.json" "${DATASET_DIR}/benchmark.txt"
sudo truncate -s 0 "${LOG}"
sudo chmod 666 "${LOG}"

echo "[3/4] Launching ODM with DEFAULT-style flags (matches original muddy twin)"

# Flag set chosen for cleanest minimal output — no fancy passes, no auto-clip,
# default mesh-octree-depth, default pc-quality. This is intentionally weak
# so the result resembles the original 22 MB / 165k face baseline.
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
    --max-concurrency 16 \
    --end-with odm_georeferencing \
    > "${LOG}" 2>&1 &

echo "      ODM container=${DOCKER_NAME}"

echo "[4/4] Ready"
echo
echo "════════════════════════════════════════════════════════════════════"
echo " RUN STARTED"
echo "════════════════════════════════════════════════════════════════════"
echo "  log         : tail -F ${LOG}"
echo "  output OBJ  : ${TEX_DIR}/odm_textured_model_geo.obj"
echo "  ULTRA aside : ${ULTRA_BACKUP_DIR}/odm_texturing/odm_textured_model_geo.obj"
echo "  viewer      : http://3.133.43.231/twin/?mid=${MID}&name=Yankee%20Pier"
echo "  ETA         : ~45 min - 1 hr"
echo
echo " To revert back to today's ULTRA later:"
echo "   sudo rm -rf ${TEX_DIR}"
echo "   sudo mv ${ULTRA_BACKUP_DIR}/odm_texturing ${TEX_DIR}"
