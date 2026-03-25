import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./template/resume/resume.component').then(m => m.ResumeComponent)
    }
];