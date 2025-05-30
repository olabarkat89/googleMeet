import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environment';

@Injectable({ providedIn: 'root' })
export class SignalingService {
 socket: Socket;
    SERVER_URL: string = environment.apiUrl;

  constructor() {
    this.socket = io(this.SERVER_URL);
  }

  joinRoom(roomId: string, userId: string) {
    this.socket.emit('join-room', roomId, userId);
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket.on(event, callback);
  }

  emit(event: string, data: any) {
    this.socket.emit(event, data);
  }

  off(event: string) {
    this.socket.off(event);
  }
  
}