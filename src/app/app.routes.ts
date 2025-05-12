import { Routes } from '@angular/router';
import { VideoCallComponent } from './video-call/video-call.component';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
            { path: '', component: HomeComponent },

        { path: 'join-room/:id', component: VideoCallComponent },

];
