# Mira Flight GCS

Custom Ground Control Station (GCS) for DJI Matrice 350 RTK drone inspections.
Built with React Native for Android.

## Architecture

```
src/
├── api/            # miraClient.ts — Axios client for Mira backend API
├── adapters/       # DroneAdapter interface + MockAdapter (ArduPilot adapter planned)
├── engine/         # MissionEngine, MissionState, PhotoCaptureManager
├── upload/         # PhotoQueue, UploadWorker, AnalysisTrigger
├── telemetry/      # TelemetryCollector, TelemetryUploader, TelemetryStore
├── routines/       # Flight routines: Sweep, Orbit, Grid, Traverse, Crawl, Scout
├── utils/          # geoUtils.ts (Haversine math)
├── store/          # Zustand stores (auth, drone, mission)
├── screens/        # HomeScreen, MissionPlanner, Preflight, HUD, MissionReview
└── types/          # Shared TypeScript types
```

## Backend

API: `http://3.144.48.124:8000/api/v1/`

## Testing

### MockAdapter (Simulated Drone)
The app ships with a `MockAdapter` that fully simulates drone behavior:
- GPS interpolation along waypoint paths
- Battery drain simulation
- 5Hz telemetry updates
- Photo capture simulation

### ArduPilot (SITL)
For realistic testing, use ArduPilot SITL (Software In The Loop):

1. **Install ArduPilot SITL**: Follow [ArduPilot SITL setup](https://ardupilot.org/dev/docs/sitl-simulator-software-in-the-loop.html)
2. **Start SITL**:
   ```bash
   sim_vehicle.py -v ArduCopter --map --console
   ```
3. **Connect**: The app's adapter layer is designed for easy swapping.
   Replace `MockAdapter` with an ArduPilot MAVLink adapter when ready.

Future: An `ArduPilotAdapter` will implement the same `DroneAdapter` interface
using MAVLink protocol to communicate with ArduPilot SITL or real hardware.

## Development

### Prerequisites
- Node.js 18+
- Android Studio with Android SDK
- Android emulator or device

### Setup
```bash
cd mira-flight
npm install
npx react-native run-android
```

### Flight Routines
| Routine   | Description                                    |
|-----------|------------------------------------------------|
| Sweep     | Linear path with photo intervals               |
| Orbit     | Circular path around center point               |
| Grid      | Boustrophedon lawnmower pattern for mapping     |
| Traverse  | User-defined waypoint path                      |
| Crawl     | Zigzag/vertical scan at standoff distance       |
| Scout     | Circle + cross overview pattern                 |

## Project Rules
- Work ONLY in `mira-flight/` directory
- Do NOT modify `backend/` or `frontend/`
- Build against MockAdapter (ArduPilot SITL for integration testing)
- Backend API at `http://3.144.48.124:8000/api/v1/`
- Commit prefixes: `[Feat]` / `[Fix]`
