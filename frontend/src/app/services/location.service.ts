import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BusLocation } from '../models/bus-location';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private baseUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:8080/api/location'
    : 'https://poc-livetracking-backend.onrender.com/api/location';

  constructor(private http: HttpClient) {}

  /**
   * Sends the current coordinates of a driver device to the backend.
   */
  updateLocation(
    busId: number, 
    latitude: number, 
    longitude: number, 
    speed: number = 0,
    destinationName?: string,
    destinationLatitude?: number,
    destinationLongitude?: number,
    routeName?: string,
    nextStopName?: string,
    nextStopLatitude?: number,
    nextStopLongitude?: number,
    finalDestinationName?: string,
    finalDestinationLatitude?: number,
    finalDestinationLongitude?: number
  ): Observable<BusLocation> {
    const payload = {
      busId,
      latitude,
      longitude,
      speed,
      destinationName,
      destinationLatitude,
      destinationLongitude,
      routeName,
      nextStopName,
      nextStopLatitude,
      nextStopLongitude,
      finalDestinationName,
      finalDestinationLatitude,
      finalDestinationLongitude
    };
    return this.http.post<BusLocation>(`${this.baseUrl}/update`, payload);
  }

  /**
   * Fetches the latest known location for a specific bus.
   */
  getLatestLocation(busId: number): Observable<BusLocation> {
    return this.http.get<BusLocation>(`${this.baseUrl}/latest/${busId}`);
  }

  /**
   * Notifies the backend that the driver has stopped sharing location.
   */
  stopSharing(busId: number): Observable<BusLocation> {
    return this.http.post<BusLocation>(`${this.baseUrl}/stop/${busId}`, {});
  }

  /**
   * Fetches the complete coordinates history for a specific bus.
   */
  getLocationHistory(busId: number): Observable<BusLocation[]> {
    return this.http.get<BusLocation[]>(`${this.baseUrl}/history/${busId}`);
  }
}
