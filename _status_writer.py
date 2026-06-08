"""
ODM live status writer — polls the box every 3 seconds and emits status.json
that the browser dashboard reads. No external deps beyond stdlib.

Run on EC2:  sudo nohup python3 _status_writer.py > /tmp/status_writer.log 2>&1 &
"""
import glob, json, os, re, shutil, subprocess, time
from datetime import datetime, timezone

MID = "2abe1a45-0fc7-4e92-9d87-5c7cc7b0c1b8"
ODM_DIR = f"/var/lib/odm-data/{MID}"
LOG = f"{ODM_DIR}/odm_run.log"
OUT_JSON = f"{ODM_DIR}/status.json"
CONTAINER = "odm-yankee-2abe1a45"

OPENMVS_DIR = f"{ODM_DIR}/opensfm/undistorted/openmvs"
DEPTHMAPS = f"{OPENMVS_DIR}/depthmaps"
DENSE_PLY = f"{OPENMVS_DIR}/scene_dense.ply"
FILTERPOINTS_PLY = f"{ODM_DIR}/odm_filterpoints/point_cloud.ply"
MESH_25D = f"{ODM_DIR}/odm_meshing/odm_25dmesh.ply"
MESH_3D = f"{ODM_DIR}/odm_meshing/odm_mesh.ply"
TEX_DIR = f"{ODM_DIR}/odm_texturing"
OBJ = f"{TEX_DIR}/odm_textured_model_geo.obj"
MTL = f"{TEX_DIR}/odm_textured_model_geo.mtl"

STAGES = [
    "dataset", "split", "merge", "opensfm", "openmvs",
    "odm_filterpoints", "odm_meshing", "mvs_texturing", "odm_georeferencing",
]

ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")
TIMESTAMP_RE = re.compile(r"(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})")
RUN_STAGE_RE = re.compile(r"Running\s+([a-z_]+)\s+stage")
END_STAGE_RE = re.compile(r"Finished\s+([a-z_]+)\s+stage")
PROGRESS_RE = re.compile(
    r"(Geometric-consistent\s+estimated\s+depth-maps|Estimated\s+depth-maps|"
    r"Fusing\s+depth-maps|Filtered\s+depth-maps|Texturing|Meshing|Filtering)"
    r"\D+(\d+)\s*\(\s*([0-9.]+)%[^,]*,\s*([0-9hms ]+),\s*ETA\s+([0-9hms ]+)\)",
    re.IGNORECASE,
)
OOM_RE = re.compile(r"OpenMVS ran out of memory|Killed|Memory cgroup out of memory")
ERROR_RE = re.compile(r"\[ERROR\]|Traceback")
DENSIFY_LAUNCH_RE = re.compile(r"running.*DensifyPointCloud")
FUSION_MODE_RE = re.compile(r"--fusion-mode\s+1")


def strip_ansi(s: str) -> str:
    return ANSI_RE.sub("", s)


def parse_log_time(line: str):
    m = TIMESTAMP_RE.search(line)
    if not m:
        return None
    try:
        s = m.group(1).replace(" ", "T")
        return datetime.fromisoformat(s).replace(tzinfo=timezone.utc).isoformat()
    except Exception:
        return None


def docker_stats():
    try:
        r = subprocess.run(
            ["docker", "stats", "--no-stream", "--format",
             "{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.BlockIO}}|{{.PIDs}}",
             CONTAINER],
            capture_output=True, text=True, timeout=10,
        )
        if r.returncode != 0 or not r.stdout.strip():
            return None
        cpu, mem, mempct, bio, pids = r.stdout.strip().split("|")
        used_str = mem.split("/")[0].strip()
        return {
            "cpu_pct": float(cpu.replace("%", "").strip()),
            "mem_str": mem.strip(),
            "mem_gib": parse_gib(used_str),
            "mem_pct": float(mempct.replace("%", "").strip()),
            "block_io": bio.strip(),
            "pids": int(pids.strip()),
        }
    except Exception:
        return None


def docker_uptime_seconds():
    try:
        r = subprocess.run(
            ["docker", "inspect", "--format", "{{.State.StartedAt}}", CONTAINER],
            capture_output=True, text=True, timeout=5,
        )
        if r.returncode != 0:
            return None
        # "2026-06-03T08:19:33.029218171Z"
        s = r.stdout.strip().rstrip("Z").split(".")[0]
        started = datetime.fromisoformat(s).replace(tzinfo=timezone.utc)
        return int((datetime.now(timezone.utc) - started).total_seconds())
    except Exception:
        return None


def parse_gib(s: str) -> float:
    s = s.strip()
    if s.endswith("GiB"):
        return float(s[:-3])
    if s.endswith("MiB"):
        return float(s[:-3]) / 1024
    if s.endswith("KiB"):
        return float(s[:-3]) / 1024 / 1024
    if s.endswith("B"):
        return float(s[:-1]) / 1024 / 1024 / 1024
    return 0.0


def file_count(pattern: str) -> int:
    try:
        return len(glob.glob(pattern))
    except Exception:
        return 0


def file_size(path: str) -> int:
    try:
        return os.path.getsize(path)
    except Exception:
        return 0


def file_mtime_iso(path: str):
    try:
        ts = os.path.getmtime(path)
        return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
    except Exception:
        return None


def newest_filtered_age():
    """How many seconds since the latest *.filtered.cmap was written."""
    try:
        files = glob.glob(f"{DEPTHMAPS}/*.filtered.cmap")
        if not files:
            return None
        newest = max(os.path.getmtime(f) for f in files)
        return int(time.time() - newest)
    except Exception:
        return None


def parse_log():
    """One pass through the log. Returns:
        - stage state map (pending/active/done)
        - per-stage start/finish times
        - latest sub-task progress (depth-map / filter / fuse / mesh / texture)
        - error log lines (last 5)
        - densify launches (count + timestamps + tiled?)
        - log tail (last 40 lines)
        - latest log timestamp
    """
    state = {s: "pending" for s in STAGES}
    started = {}
    finished = {}
    latest_progress = None
    errors = []
    densify_launches = []
    last_density_was_tiled = False
    log_tail = []
    last_ts = None

    if not os.path.exists(LOG):
        return state, started, finished, latest_progress, errors, densify_launches, log_tail, last_ts

    try:
        with open(LOG, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except Exception:
        return state, started, finished, latest_progress, errors, densify_launches, log_tail, last_ts

    lines = content.splitlines()
    if not lines:
        return state, started, finished, latest_progress, errors, densify_launches, log_tail, last_ts

    for line in lines:
        clean = strip_ansi(line)
        ts = parse_log_time(clean)
        if ts:
            last_ts = ts

        m = RUN_STAGE_RE.search(clean)
        if m:
            s = m.group(1)
            if s in state:
                if state[s] == "pending":
                    state[s] = "active"
                    if s not in started:
                        started[s] = ts
        m = END_STAGE_RE.search(clean)
        if m:
            s = m.group(1)
            if s in state:
                state[s] = "done"
                finished[s] = ts

        if DENSIFY_LAUNCH_RE.search(clean):
            densify_launches.append({
                "ts": ts,
                "tiled": bool(FUSION_MODE_RE.search(clean)),
            })
            last_density_was_tiled = bool(FUSION_MODE_RE.search(clean))

        if OOM_RE.search(clean) or ERROR_RE.search(clean):
            errors.append({"ts": ts, "line": clean.strip()[:300]})

    # latest progress: scan backwards
    for line in reversed(lines[-1000:]):
        clean = strip_ansi(line)
        m = PROGRESS_RE.search(clean)
        if m:
            latest_progress = {
                "label": m.group(1),
                "count": int(m.group(2)),
                "pct": float(m.group(3)),
                "elapsed_str": m.group(4).strip(),
                "eta_str": m.group(5).strip(),
            }
            break

    # tail
    log_tail = [strip_ansi(l).rstrip() for l in lines[-40:]]

    # keep last 5 errors only
    errors = errors[-5:]

    return state, started, finished, latest_progress, errors, densify_launches, log_tail, last_ts


def detect_active_stage(state):
    for s in STAGES:
        if state.get(s) == "active":
            return s
    # if nothing active but openmvs done, return next
    for s in STAGES:
        if state.get(s) == "pending":
            return s
    return None


def derive_openmvs_substage(state, latest_progress, n_dmap, n_filtered, dense_size, last_densify_tiled):
    """Best-effort identification of which OpenMVS sub-step is running."""
    if state.get("openmvs") != "active":
        return None
    if dense_size > 0:
        # scene_dense.ply exists; fusion done
        return {"name": "complete", "tiled": last_densify_tiled}
    if n_filtered > 0 and n_filtered < n_dmap:
        # currently filtering
        return {
            "name": "filtering",
            "tiled": last_densify_tiled,
            "done": n_filtered,
            "total": n_dmap,
            "pct": round(n_filtered / n_dmap * 100, 1) if n_dmap else 0,
        }
    if n_filtered >= n_dmap and n_dmap > 0 and dense_size == 0:
        return {"name": "fusing", "tiled": last_densify_tiled, "depthmaps_filtered": n_filtered}
    if latest_progress and "depth-maps" in latest_progress["label"].lower():
        name = "estimating"
        if "geometric" in latest_progress["label"].lower():
            name = "geo_consistent"
        return {
            "name": name,
            "tiled": last_densify_tiled,
            "pct": latest_progress["pct"],
            "eta_str": latest_progress["eta_str"],
            "elapsed_str": latest_progress["elapsed_str"],
        }
    return {"name": "starting", "tiled": last_densify_tiled}


def compute_filter_rate():
    """Files filtered per minute over the last 5 min, plus ETA seconds."""
    try:
        files = glob.glob(f"{DEPTHMAPS}/*.filtered.cmap")
        if not files:
            return None
        now = time.time()
        recent = [f for f in files if (now - os.path.getmtime(f)) <= 300]
        rate_per_min = len(recent) / 5.0 if recent else None
        return rate_per_min
    except Exception:
        return None


def disk_free_gib(path="/var/lib"):
    try:
        usage = shutil.disk_usage(path)
        return round(usage.free / 1024 ** 3, 1)
    except Exception:
        return None


def host_meminfo():
    try:
        with open("/proc/meminfo") as f:
            d = {}
            for line in f:
                k, v = line.split(":", 1)
                d[k.strip()] = int(v.strip().split()[0])  # kB
        return {
            "total_gib": round(d.get("MemTotal", 0) / 1024 / 1024, 1),
            "available_gib": round(d.get("MemAvailable", 0) / 1024 / 1024, 1),
            "swap_used_gib": round((d.get("SwapTotal", 0) - d.get("SwapFree", 0)) / 1024 / 1024, 2),
        }
    except Exception:
        return None


def build_status():
    state, started, finished, latest_progress, errors, densify_launches, log_tail, last_log_ts = parse_log()
    stats = docker_stats()
    uptime = docker_uptime_seconds()
    container_up = stats is not None

    last_densify_tiled = densify_launches[-1]["tiled"] if densify_launches else False

    # File-based progress
    n_dmap = file_count(f"{DEPTHMAPS}/depth*.dmap")
    n_filtered = file_count(f"{DEPTHMAPS}/*.filtered.cmap")
    dense_size = file_size(DENSE_PLY)
    filterpoints_size = file_size(FILTERPOINTS_PLY)
    mesh_3d_size = file_size(MESH_3D)
    mesh_25d_size = file_size(MESH_25D)
    obj_size = file_size(OBJ)
    obj_exists = obj_size > 0
    mtl_exists = file_size(MTL) > 0
    tex_pngs = file_count(f"{TEX_DIR}/*.png") + file_count(f"{TEX_DIR}/*_map_Kd.png")
    newest_filtered = newest_filtered_age()
    filter_rate = compute_filter_rate()
    filter_eta_s = None
    if filter_rate and filter_rate > 0 and n_dmap > n_filtered:
        filter_eta_s = int((n_dmap - n_filtered) / filter_rate * 60)

    substage = derive_openmvs_substage(state, latest_progress, n_dmap, n_filtered, dense_size, last_densify_tiled)

    active_stage = detect_active_stage(state)

    return {
        "ts": datetime.now(timezone.utc).isoformat(),
        "mission_id": MID,
        "viewer_url": f"/twin/?mid={MID}&name=BAT%20Pier%204",
        "obj_url": f"/twin-data/{MID}/odm_texturing/odm_textured_model_geo.obj",
        "container": {
            "up": container_up,
            "uptime_seconds": uptime,
            **(stats or {}),
        },
        "host": {
            "disk_free_gib": disk_free_gib(),
            **(host_meminfo() or {}),
        },
        "stages": state,
        "stage_started": started,
        "stage_finished": finished,
        "active_stage": active_stage,
        "openmvs": {
            "substage": substage,
            "densify_launches": densify_launches,
            "last_run_tiled": last_densify_tiled,
            "depthmaps_total": n_dmap,
            "depthmaps_filtered": n_filtered,
            "filter_rate_per_min": filter_rate,
            "filter_eta_seconds": filter_eta_s,
            "seconds_since_last_filter_write": newest_filtered,
            "latest_progress": latest_progress,
        },
        "outputs": {
            "dense_ply_mb": round(dense_size / 1e6, 2),
            "filterpoints_ply_mb": round(filterpoints_size / 1e6, 2),
            "mesh_3d_ply_mb": round(mesh_3d_size / 1e6, 2),
            "mesh_25d_ply_mb": round(mesh_25d_size / 1e6, 2),
            "obj_exists": obj_exists,
            "obj_size_mb": round(obj_size / 1e6, 2) if obj_exists else None,
            "mtl_exists": mtl_exists,
            "texture_atlases": tex_pngs,
        },
        "errors_recent": errors,
        "log": {
            "last_modified": file_mtime_iso(LOG),
            "last_log_ts": last_log_ts,
            "line_count": file_count(LOG) if False else (sum(1 for _ in open(LOG)) if os.path.exists(LOG) else 0),
            "tail": log_tail,
        },
    }


def main():
    print(f"status writer starting, output → {OUT_JSON}")
    tmp = OUT_JSON + ".tmp"
    while True:
        try:
            data = build_status()
            with open(tmp, "w") as f:
                json.dump(data, f, separators=(",", ":"))
            os.replace(tmp, OUT_JSON)
        except Exception as e:
            print(f"writer error: {type(e).__name__}: {e}")
        time.sleep(3)


if __name__ == "__main__":
    main()
