export interface Bus {
  id: number;
  busNumber: string;
  driverName: string;
}

export interface BusLocation {
  id?: number;
  bus: Bus;
  latitude: number;
  longitude: number;
  speed?: number;
  timestamp: string;
  destinationName?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  routeName?: string;
  nextStopName?: string;
  nextStopLatitude?: number;
  nextStopLongitude?: number;
  finalDestinationName?: string;
  finalDestinationLatitude?: number;
  finalDestinationLongitude?: number;
  active?: boolean;
}
