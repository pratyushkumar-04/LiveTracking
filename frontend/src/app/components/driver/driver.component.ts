import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LocationService } from '../../services/location.service';

@Component({
  selector: 'app-driver',
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.css']
})
export class DriverComponent implements OnDestroy, OnInit {
  busId: number = 1;
  isSharing: boolean = false;
  watchId: number | null = null;
  
  currentLatitude: number | null = null;
  currentLongitude: number | null = null;
  currentSpeed: number | null = null;
  lastUpdateTime: Date | null = null;
  errorMessage: string | null = null;
  logMessages: string[] = [];

  // Loaded dynamically from assets/routes.json
  routes: any[] = [];
  selectedRoute: any = null;
  currentStopIndex: number = 0;

  private lastPosition: { lat: number; lng: number; time: number } | null = null;

  constructor(
    private locationService: LocationService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.http.get<any[]>('assets/routes.json').subscribe({
      next: (data) => {
        this.routes = data;
        if (this.routes.length > 0) {
          this.selectedRoute = this.routes[0];
        }
      },
      error: (err) => {
        console.error('Failed to load routes.json', err);
        this.addLog('Error: Failed to load routes configuration file.');
      }
    });
  }

  toggleSharing() {
    if (this.isSharing) {
      this.stopSharing();
    } else {
      this.startSharing();
    }
  }

  startSharing() {
    if (!('geolocation' in navigator)) {
      this.errorMessage = 'Geolocation is not supported by your browser.';
      this.addLog('Error: Geolocation not supported');
      return;
    }

    this.isSharing = true;
    this.errorMessage = null;
    this.lastPosition = null;
    this.currentStopIndex = 0;
    this.addLog(`Starting sharing on Route: ${this.selectedRoute.name}...`);

    // Geolocation options
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const time = position.timestamp;

        this.currentLatitude = lat;
        this.currentLongitude = lng;
        this.lastUpdateTime = new Date();
        this.errorMessage = null;

        // Calculate speed (km/h)
        let gpsSpeed = position.coords.speed !== null && position.coords.speed > 0
          ? Number((position.coords.speed * 3.6).toFixed(1))
          : 0;

        // Fallback speed calculation based on distance from last recorded point
        if (gpsSpeed === 0 && this.lastPosition) {
          const timeDiffMs = time - this.lastPosition.time;
          gpsSpeed = this.calculateSpeedFallback(
            this.lastPosition.lat,
            this.lastPosition.lng,
            lat,
            lng,
            timeDiffMs
          );
        }

        this.currentSpeed = gpsSpeed;
        this.lastPosition = { lat, lng, time };

        // 1. Next Stop & Final Destination Auto-Advance Logic
        const stops = this.selectedRoute.stops;
        let nextStop = stops[this.currentStopIndex];
        const finalStop = stops[stops.length - 1];

        if (nextStop) {
          const distanceToNext = this.calculateDistanceMetric(lat, lng, nextStop.lat, nextStop.lng);
          // If within 150m (0.15 km) and not already at the last stop
          if (distanceToNext < 0.15 && this.currentStopIndex < stops.length - 1) {
            this.addLog(`Arrived at stop: ${nextStop.name}. Auto-advancing.`);
            this.currentStopIndex++;
            nextStop = stops[this.currentStopIndex];
          }
        }

        const targetStop = nextStop || finalStop;

        this.addLog(`GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)} | Speed: ${this.currentSpeed} km/h | Next: ${targetStop.name}`);

        // 2. Send detailed routing metrics to backend
        this.locationService.updateLocation(
          this.busId, 
          lat, 
          lng, 
          this.currentSpeed,
          targetStop.name, // compatibility destinationName
          targetStop.lat,  // compatibility destinationLatitude
          targetStop.lng,  // compatibility destinationLongitude
          this.selectedRoute.name,
          targetStop.name,
          targetStop.lat,
          targetStop.lng,
          finalStop.name,
          finalStop.lat,
          finalStop.lng
        ).subscribe({
          next: (res) => {
            this.addLog(`Uploaded coordinates & routing info successfully.`);
          },
          error: (err) => {
            console.error('REST Upload failed', err);
            this.addLog(`Failed to upload: ${err.message || 'Server error'}`);
          }
        });
      },
      (error) => {
        console.error('Geolocation error', error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.errorMessage = 'Permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            this.errorMessage = 'Position unavailable. GPS signal might be weak.';
            break;
          case error.TIMEOUT:
            this.errorMessage = 'GPS request timed out.';
            break;
          default:
            this.errorMessage = 'An unknown GPS error occurred.';
        }
        this.addLog(`GPS Error: ${this.errorMessage}`);
      },
      options
    );
  }

  calculateSpeedFallback(lat1: number, lon1: number, lat2: number, lon2: number, timeDiffMs: number): number {
    // Treat the elapsed time as at least 1000ms to prevent division-by-zero or excessive speed spikes
    const elapsedMs = Math.max(timeDiffMs, 1000);

    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    const hours = elapsedMs / 3600000;
    const speed = distanceKm / hours; // km/h

    // If they manually jump coordinates, cap at a realistic city speed of 35-45 km/h instead of discarding to 0
    if (speed > 90) {
      return Number((30 + Math.random() * 10).toFixed(1));
    }
    return Number(speed.toFixed(1));
  }

  calculateDistanceMetric(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  advanceStop() {
    const stops = this.selectedRoute.stops;
    if (this.currentStopIndex < stops.length - 1) {
      this.currentStopIndex++;
      this.addLog(`Manually advanced. Next stop is: ${stops[this.currentStopIndex].name}`);
      this.triggerUpdate();
    } else {
      this.addLog(`Already at final stop: ${stops[this.currentStopIndex].name}`);
    }
  }

  resetRoute() {
    this.currentStopIndex = 0;
    this.addLog(`Route reset. Next stop: ${this.selectedRoute.stops[0].name}`);
    this.triggerUpdate();
  }

  private triggerUpdate() {
    if (this.isSharing && this.currentLatitude !== null && this.currentLongitude !== null) {
      const lat = this.currentLatitude;
      const lng = this.currentLongitude;
      const stops = this.selectedRoute.stops;
      const nextStop = stops[this.currentStopIndex];
      const finalStop = stops[stops.length - 1];

      this.locationService.updateLocation(
        this.busId,
        lat,
        lng,
        this.currentSpeed || 0,
        nextStop.name,
        nextStop.lat,
        nextStop.lng,
        this.selectedRoute.name,
        nextStop.name,
        nextStop.lat,
        nextStop.lng,
        finalStop.name,
        finalStop.lat,
        finalStop.lng
      ).subscribe();
    }
  }

  stopSharing() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isSharing = false;
    this.currentLatitude = null;
    this.currentLongitude = null;
    this.currentSpeed = null;
    this.lastPosition = null;
    this.addLog('Stopped location sharing.');

    this.locationService.stopSharing(this.busId).subscribe({
      next: () => {
        this.addLog('Server notified: tracking deactivated.');
      },
      error: (err) => {
        console.error('Failed to notify stop sharing', err);
      }
    });
  }

  addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.logMessages.unshift(`[${timestamp}] ${message}`);
    if (this.logMessages.length > 50) {
      this.logMessages.pop();
    }
  }

  clearLogs() {
    this.logMessages = [];
  }

  ngOnDestroy() {
    this.stopSharing();
  }
}
