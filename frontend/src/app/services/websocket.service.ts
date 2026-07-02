import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private client: Client;
  private connectedSubject = new Subject<boolean>();
  public connected$ = this.connectedSubject.asObservable();

  constructor() {
    const isLocal = window.location.hostname === 'localhost';
    const wsUrl = isLocal ? 'ws://localhost:8080/ws' : 'wss://poc-livetracking-backend.onrender.com/ws';
    const httpUrl = isLocal ? 'http://localhost:8080/ws' : 'https://poc-livetracking-backend.onrender.com/ws';

    this.client = new Client({
      brokerURL: wsUrl,
      webSocketFactory: () => new SockJS(httpUrl),
      debug: (str) => {
        console.log('STOMP: ' + str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = (frame) => {
      console.log('Connected to STOMP Broker');
      this.connectedSubject.next(true);
    };

    this.client.onWebSocketClose = () => {
      console.log('STOMP Connection Closed');
      this.connectedSubject.next(false);
    };

    this.client.onStompError = (frame) => {
      console.error('STOMP Broker error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    // Activate the STOMP connection
    this.client.activate();
  }

  /**
   * Subscribes to a dynamic STOMP topic and returns an observable of the received messages.
   * If not connected yet, it queues the subscription until connection is active.
   */
  subscribe<T>(topic: string): Observable<T> {
    return new Observable<T>((observer) => {
      let subscription: any = null;
      let active = true;

      const doSubscribe = () => {
        if (!active) return;
        subscription = this.client.subscribe(topic, (message) => {
          try {
            const body = JSON.parse(message.body) as T;
            observer.next(body);
          } catch (e) {
            console.error('Failed to parse WebSocket message body', e);
          }
        });
      };

      if (this.client.connected) {
        doSubscribe();
      } else {
        // If not connected, listen to connection state and subscribe on connection success
        const connSub = this.connected$.subscribe((connected) => {
          if (connected) {
            doSubscribe();
            connSub.unsubscribe();
          }
        });
      }

      // Return cleanup handler to unsubscribe when the observable is destroyed
      return () => {
        active = false;
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    });
  }
}
