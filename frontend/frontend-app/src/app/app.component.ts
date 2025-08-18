import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

type RouteDTO = { id?: number; lineNumber: string; name: string; stopsJson?: string; active: boolean };

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h1>Angular ↔ Spring Boot</h1>
    <p>Connected to backend: <b>{{ title }}</b></p>

    <button (click)="loadRoutes()">/api/routes</button>

    <div *ngIf="routes.length === 0" style="margin-top:8px;">
      (There is no entry yet)
    </div>

    <ul *ngIf="routes.length > 0" style="margin-top:8px;">
      <li *ngFor="let r of routes">
        <b>{{ r.lineNumber }}</b> — {{ r.name }}
      </li>
    </ul>
  `
})
export class AppComponent implements OnInit { 
  private http = inject(HttpClient);
  title = 'Frontend Application';
  routes: RouteDTO[] = [];

  ngOnInit() { // Load initial data
    this.http.get('http://localhost:8080/api/hello', { responseType: 'text' })
      .subscribe(txt => this.title = txt);
  }

  loadRoutes() {
    this.http.get<RouteDTO[]>('http://localhost:8080/api/routes')
      .subscribe(list => this.routes = list);
  }
}
