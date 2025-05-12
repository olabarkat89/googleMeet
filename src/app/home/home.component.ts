import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor(private router: Router){}
 createMeetingX() {
    const meetingId = uuidv4();
    localStorage.setItem('isHost-' + meetingId, 'true');
    localStorage.clear()
    // const link = `${location.origin}/room/${meetingId}`;
    // console.log('Meeting Link:', link); 
    this.router.navigate(['/join-room/', meetingId]);

  }
}
