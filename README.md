
***

# School Bus Live Tracking System – Solution Overview

## 1. Executive Summary
The **School Bus Live Tracking System** is a real-time web solution designed to bridge the communication gap between school bus drivers, school administrations, and parents. By utilizing standard GPS geolocation directly from the driver's device, the system delivers immediate location and routing telemetry to parents without requiring expensive dedicated hardware or paid mapping APIs.

---

## 2. Key System Features

*  **Active Route Tracking**
  * Groups stops into logical sequences (Routes).
  * Drivers and parents see the exact bus location relative to each upcoming stop.
*  **Dual-ETA Overlay Dashboard**
  * Displays time and distance remaining to the very next stop on the route.
  * Displays time and distance remaining to the final school destination.
*  **Automatic Stop Detection**
  * Tracks the bus’s proximity using geofencing.
  * Automatically logs arrival when the bus enters within 150 meters of an upcoming stop.
  * Shifts the tracker's focus to the next sequential stop automatically.
*  **Resource-Saving Persistence**
  * Operates on a "last-known-location" strategy to keep database costs and server footprints minimal.
  * Saves only the single latest position in the database.
  * Draws the historical trail dynamically in the parent's browser to keep the database light.
*  **Privacy-First Sharing**
  * GPS tracking activates only when the driver explicitly starts a trip.
  * Clears active markers and displays an offline template immediately when the route finishes.

---

## 3. How It Works (The Core Flow)

```text
 [ Driver Console ]   ──(Coordinates + Active Stop)──>   [ Spring Boot Backend ]
         │                                                        │
(Browser GPS + Speed)                                      (Database Updates)
         │                                                        │
         ▼                                                        ▼
[ Auto-Advances Stops ]                                  [ WebSocket Broadcast ]
                                                                  │
                                                                  ▼
                                                          [ Parent Live Map ]
                                                    (Leaflet Map + Route Lines
                                                     + Stop-by-Stop Dual ETAs)
```

### The Flow 

1. **Initiating the Trip**
   * The driver logs into the mobile-friendly **Driver Console**.
   * They select their assigned route (e.g., *Route 101 - North Line*) and click **Start Location Sharing**.
2. **Live Ingestion**
   * The driver's phone captures GPS coordinates and uploads them to the server.
   * The server updates the database (overwriting the old coordinate) and broadcasts the update.
3. **Parent Map Experience**
   * Parents open the **Live Tracker** and see a moving bus icon on a Leaflet map.
   * A **red dotted line** connects the bus to its next stop.
   * A **blue dashed line** outlines the remaining journey to the school.
4. **Automatic Progression**
   * The driver's console detects when the bus passes a stop.
   * The system advances the target stop and updates the parent's screen with the next ETA.
5. **Trip Completion**
   * Upon arrival at the school, the driver clicks **Stop Location Sharing**.
   * The bus marker clears from the map instantly to prevent stale tracking or privacy leaks.

---

## 4. Primary Use Cases

### A. Parent Peace of Mind
* **Scenario:** Parents wait at bus stops in extreme weather or rush blindly to meet the bus.
* **Solution:** Parents check the live tracker on their phones to see exactly how many minutes remain until arrival, allowing them to time their departures perfectly.

### B. School Dispatch & Administration
* **Scenario:** Administration offices get overwhelmed with phone calls asking for bus locations.
* **Solution:** Administrators use a central dashboard to view all active buses, real-time speeds, and current stop progressions simultaneously.

### C. Driver Focus & Safety
* **Scenario:** Drivers get distracted when forced to manually log stops while driving.
* **Solution:** Background geofencing automatically handles all stop sequences, allowing drivers to interact with the console only at the start and end of shifts.

---

## 5. How to Add & Manage Routes (Easy Customization)

To make the system simple for non-technical users to manage, all bus routes and stops are stored in a single, simple configuration file (`routes.json`). 

Schools can add, edit, or remove routes and stops in minutes without touching a single line of application code:

1. **Open the Configuration File**: Locate `assets/routes.json`.
2. **Define a Route & Stops**: Add a route block with a list of stop names and their coordinates (latitude/longitude coordinates can easily be copied from a free tool like Google Maps or OpenStreetMap).
3. **Save and Launch**: Once saved, the application automatically loads the new routes, updates the driver's dropdown selections, plots the correct stop markers, and updates the double-ETA dashboard dynamically.

**Example Route Layout:**
```json
  {
    "name": "Route 103 - East Express",
    "stops": [
      { "name": "Stop A - Station Square", "lat": 20.2980, "lng": 85.8270 },
      { "name": "Stop B - Market Square", "lat": 20.2950, "lng": 85.8210 },
      { "name": "School Campus", "lat": 20.3504, "lng": 85.8065 }
    ]
  }
```

---

## 6. Project Demo Links

### For Tracking (Parents, Students)
 [Tracker Console](https://schoolbustrack.netlify.app/tracker)

### For Drivers to start Trip
 [Driver Start Trip Console](https://schoolbustrack.netlify.app/driver)
