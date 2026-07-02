import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { LocationService } from '../../services/location.service';
import { WebsocketService } from '../../services/websocket.service';
import { BusLocation } from '../../models/bus-location';
import * as L from 'leaflet';

@Component({
  selector: 'app-live-tracker',
  templateUrl: './live-tracker.component.html',
  styleUrls: ['./live-tracker.component.css']
})
export class LiveTrackerComponent implements OnInit, AfterViewInit, OnDestroy {
  busId: number = 1;
  latestLocation: BusLocation | null = null;
  historyCount: number = 0;
  
  // Leaflet Map & Marker instances
  private map!: L.Map;
  private marker: L.Marker | null = null;
  private pathLine: L.Polyline | null = null;
  private destinationMarker: L.Marker | null = null;
  private routeLine: L.Polyline | null = null;
  private remainingRouteLine: L.Polyline | null = null;
  private stopMarkers: L.CircleMarker[] = [];
  
  // Dynamic Route Metrics
  nextStopDistance: number | null = null;
  nextStopEtaMinutes: number | null = null;
  finalDistance: number | null = null;
  finalEtaMinutes: number | null = null;

  routesPresets: { [key: string]: { name: string; lat: number; lng: number }[] } = {};
  
  // Settings
  autoCenter: boolean = true;
  showTrail: boolean = true;
  
  private wsSubscription!: Subscription;
  private connSubscription!: Subscription;
  wsConnected: boolean = false;

  constructor(
    private locationService: LocationService,
    private websocketService: WebsocketService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Monitor connection status
    this.connSubscription = this.websocketService.connected$.subscribe({
      next: (connected) => {
        this.wsConnected = connected;
      }
    });

    // Load dynamic route presets from assets
    this.http.get<any[]>('assets/routes.json').subscribe({
      next: (routesArray) => {
        const presets: { [key: string]: { name: string; lat: number; lng: number }[] } = {};
        routesArray.forEach(route => {
          presets[route.name] = route.stops;
        });
        this.routesPresets = presets;
      },
      error: (err) => {
        console.error('Failed to load dynamic routes.json in live-tracker', err);
      }
    });

    // Subscribe to WebSocket updates
    this.wsSubscription = this.websocketService.subscribe<BusLocation>(`/topic/bus/${this.busId}`)
      .subscribe({
        next: (location) => {
          this.handleLocationUpdate(location);
        },
        error: (err) => {
          console.error('WebSocket subscription error', err);
        }
      });
  }

  ngAfterViewInit() {
    this.initMap();
    this.loadInitialLocation();
  }

  private initMap() {
    const defaultLat = 20.2961;
    const defaultLng = 85.8245;
    
    this.map = L.map('map', {
      center: [defaultLat, defaultLng],
      zoom: 15,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    // Initialize path line (trail)
    this.pathLine = L.polyline([], {
      color: '#3b82f6', // blue-500
      weight: 4,
      opacity: 0.8,
      dashArray: '5, 8'
    }).addTo(this.map);
  }

  private loadInitialLocation() {
    this.locationService.getLatestLocation(this.busId).subscribe({
      next: (location) => {
        if (location && location.active) {
          this.handleLocationUpdate(location);
        } else {
          this.latestLocation = null;
          this.clearDestinationLayers();
        }
      },
      error: (err) => {
        console.warn('Could not load latest location history', err);
      }
    });

    this.locationService.getLocationHistory(this.busId).subscribe({
      next: (history) => {
        if (history && history.length > 0) {
          this.historyCount = history.length;
          const latLngs = history.map(loc => L.latLng(loc.latitude, loc.longitude));
          if (this.pathLine) {
            this.pathLine.setLatLngs(latLngs);
          }
        }
      }
    });
  }

  private handleLocationUpdate(location: BusLocation) {
    if (!location.active) {
      this.latestLocation = null;
      this.clearDestinationLayers();
      if (this.marker) {
        this.map.removeLayer(this.marker);
        this.marker = null;
      }
      if (this.pathLine) {
        this.pathLine.setLatLngs([]);
      }
      return;
    }

    this.latestLocation = location;
    this.historyCount++;

    const lat = location.latitude;
    const lng = location.longitude;
    const latLng = L.latLng(lat, lng);

    // 1. Create or update bus marker
    if (!this.marker) {
      const busIcon = L.divIcon({
        html: `
          <div class="bus-marker-pulse"></div>
          <div class="bus-marker-body">
            <span class="bus-icon">🚌</span>
          </div>
        `,
        className: 'custom-bus-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      this.marker = L.marker(latLng, { icon: busIcon }).addTo(this.map);
      this.marker.bindPopup(`
        <div class="marker-popup">
          <strong>${location.bus.busNumber}</strong><br>
          Driver: ${location.bus.driverName}<br>
          Speed: ${location.speed} km/h
        </div>
      `);
    } else {
      this.marker.setLatLng(latLng);
      this.marker.getPopup()?.setContent(`
        <div class="marker-popup">
          <strong>${location.bus.busNumber}</strong><br>
          Driver: ${location.bus.driverName}<br>
          Speed: ${location.speed} km/h
        </div>
      `);
    }

    // 2. Handle Multi-Stop Route Rendering & Metrics
    if (location.routeName && location.nextStopName) {
      const stops = this.routesPresets[location.routeName];

      // Re-draw stop circle markers
      this.clearStopMarkers();
      if (stops) {
        stops.forEach(stop => {
          const isNextStop = stop.name === location.nextStopName;
          const isFinalStop = stop.name === location.finalDestinationName;
          
          const color = isNextStop ? '#f43f5e' : (isFinalStop ? '#10b981' : '#3b82f6');
          const radius = isNextStop ? 8 : (isFinalStop ? 9 : 5.5);

          const stopMarker = L.circleMarker([stop.lat, stop.lng], {
            radius: radius,
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.85
          }).addTo(this.map);

          const iconHtml = isNextStop 
            ? '<i class="bi bi-geo-alt-fill" style="color: #f43f5e; margin-right: 4px;"></i>' 
            : (isFinalStop 
              ? '<i class="bi bi-flag-fill" style="color: #10b981; margin-right: 4px;"></i>' 
              : '<i class="bi bi-geo-alt" style="color: #3b82f6; margin-right: 4px;"></i>');
          
          stopMarker.bindPopup(`
            <div style="font-family: 'Outfit', sans-serif; font-size: 12px; color: #ffffff; padding: 2px 0;">
              ${iconHtml}<strong>${isNextStop ? 'Next Stop: ' : (isFinalStop ? 'School: ' : 'Stop: ')}</strong>${stop.name}
            </div>
          `);
          this.stopMarkers.push(stopMarker);
        });
      }

      // Draw active leg: Bus -> Next Stop (Red Dotted Polyline)
      if (location.nextStopLatitude && location.nextStopLongitude) {
        const nextLatLng = L.latLng(location.nextStopLatitude, location.nextStopLongitude);
        const activeLegPoints = [latLng, nextLatLng];
        
        if (!this.routeLine) {
          this.routeLine = L.polyline(activeLegPoints, {
            color: '#f43f5e',
            weight: 4,
            opacity: 0.8,
            dashArray: '6, 10'
          }).addTo(this.map);
        } else {
          this.routeLine.setLatLngs(activeLegPoints);
        }

        // Calculate next stop metrics
        const nextDist = this.calculateDistance(lat, lng, location.nextStopLatitude, location.nextStopLongitude);
        this.nextStopDistance = nextDist;
        const speedKmh = location.speed && location.speed > 5 ? location.speed : 25;
        this.nextStopEtaMinutes = Math.round((nextDist / speedKmh) * 60);

        // Draw remaining leg: Next Stop -> remaining stops sequence -> School (Blue Polyline)
        if (stops) {
          const nextStopIdx = stops.findIndex(s => s.name === location.nextStopName);
          if (nextStopIdx !== -1) {
            const remainingPoints = stops.slice(nextStopIdx).map(s => L.latLng(s.lat, s.lng));
            if (!this.remainingRouteLine) {
              this.remainingRouteLine = L.polyline(remainingPoints, {
                color: '#3b82f6',
                weight: 3,
                opacity: 0.6,
                dashArray: '3, 6'
              }).addTo(this.map);
            } else {
              this.remainingRouteLine.setLatLngs(remainingPoints);
            }

            // Calculate final destination metrics
            let totalDist = nextDist;
            for (let i = nextStopIdx; i < stops.length - 1; i++) {
              totalDist += this.calculateDistance(
                stops[i].lat, stops[i].lng,
                stops[i+1].lat, stops[i+1].lng
              );
            }
            this.finalDistance = Number(totalDist.toFixed(2));
            this.finalEtaMinutes = Math.round((totalDist / speedKmh) * 60);
          }
        }
      }
    } else {
      this.clearDestinationLayers();
    }

    // 3. Add coordinate to trail
    if (this.showTrail && this.pathLine) {
      this.pathLine.addLatLng(latLng);
    }

    // 4. Auto-center map if option is enabled
    if (this.autoCenter) {
      this.map.panTo(latLng);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  private clearDestinationLayers() {
    this.clearStopMarkers();
    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = null;
    }
    if (this.remainingRouteLine) {
      this.map.removeLayer(this.remainingRouteLine);
      this.remainingRouteLine = null;
    }
    this.nextStopDistance = null;
    this.nextStopEtaMinutes = null;
    this.finalDistance = null;
    this.finalEtaMinutes = null;
  }

  private clearStopMarkers() {
    this.stopMarkers.forEach(m => this.map.removeLayer(m));
    this.stopMarkers = [];
  }

  toggleAutoCenter() {
    this.autoCenter = !this.autoCenter;
    if (this.autoCenter && this.latestLocation) {
      this.map.panTo(L.latLng(this.latestLocation.latitude, this.latestLocation.longitude));
    }
  }

  toggleShowTrail() {
    this.showTrail = !this.showTrail;
    if (!this.showTrail && this.pathLine) {
      this.pathLine.setLatLngs([]);
    } else if (this.showTrail) {
      this.loadInitialLocation();
    }
  }

  triggerManualZoom() {
    if (this.latestLocation) {
      this.map.setView(L.latLng(this.latestLocation.latitude, this.latestLocation.longitude), 17);
    }
  }

  ngOnDestroy() {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    if (this.connSubscription) {
      this.connSubscription.unsubscribe();
    }
    this.clearDestinationLayers();
  }
}
