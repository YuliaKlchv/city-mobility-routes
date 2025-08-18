import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

// DTO type for route objects coming from backend
type RouteDTO = { 
  id?: number; 
  lineNumber: string; 
  name: string; 
  stopsJson?: string; 
  active: boolean 
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-4">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h1 class="h3 mb-0">City Mobility Routes</h1>
        <span class="badge text-bg-secondary">Backend: <b>{{ title }}</b></span>
      </div>

      <!-- Feedback messages -->
      <div *ngIf="message" class="alert" [ngClass]="messageType==='error' ? 'alert-danger' : 'alert-success'">
        {{ message }}
      </div>

      <!-- Search & Filters -->
      <div class="card app-card shadow-sm mb-3">
        <div class="card-body">
          <div class="row g-2 align-items-center">
            <div class="col-md-5">
              <input
                class="form-control"
                placeholder="Search (line or name)"
                (input)="onSearch($event)"
              />
            </div>
            <div class="col-md-4 d-flex align-items-center">
              <div class="form-check">
                <input id="activeOnly" type="checkbox" class="form-check-input"
                       [(ngModel)]="activeOnly" (change)="loadRoutes()"/>
                <label for="activeOnly" class="form-check-label">Show only active routes</label>
              </div>
            </div>
            <div class="col-md-3 text-md-end">
              <button class="btn btn-outline-secondary" (click)="loadRoutes()">
                <i class="bi bi-arrow-repeat"></i> Reload
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Form -->
      <div class="card app-card shadow-sm mb-4">
        <div class="card-header">
          <strong>Create New Route</strong>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-sm-3">
              <label class="form-label">Line Number (max 10)</label>
              <input class="form-control" [(ngModel)]="createForm.lineNumber" maxlength="10">
            </div>
            <div class="col-sm-6">
              <label class="form-label">Name (max 120)</label>
              <input class="form-control" [(ngModel)]="createForm.name" maxlength="120">
            </div>
            <div class="col-sm-6">
              <label class="form-label">Stops JSON</label>
              <input class="form-control" [(ngModel)]="createForm.stopsJson" placeholder='[] or ["A","B"]'>
            </div>
            <div class="col-sm-3 d-flex align-items-center">
              <div class="form-check mt-4">
                <input id="create-active" type="checkbox" class="form-check-input" [(ngModel)]="createForm.active">
                <label for="create-active" class="form-check-label">Active</label>
              </div>
            </div>
            <div class="col-12">
              <button class="btn btn-primary" (click)="createRoute()" [disabled]="!isCreateValid()">
                <i class="bi bi-plus-lg"></i> Save
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- List / Table -->
      <div class="card app-card shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center">
          <strong>Routes</strong>
          <span class="text-muted app-muted" *ngIf="routes.length === 0">(no entries)</span>
        </div>

        <div class="table-responsive">
          <table class="table table-striped table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th style="width:120px;">Line</th>
                <th>Name</th>
                <th style="width:140px;">Status</th>
                <th style="width:220px;" class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <!-- Display mode -->
              <tr *ngFor="let r of routes" [hidden]="editingId === r.id">
                <td><span class="badge text-bg-primary">{{ r.lineNumber }}</span></td>
                <td>{{ r.name }}</td>
                <td>
                  <span class="badge" [ngClass]="r.active ? 'text-bg-success' : 'text-bg-secondary'">
                    {{ r.active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-primary me-2" (click)="startEdit(r)">
                    <i class="bi bi-pencil"></i> Edit
                  </button>
                  <button class="btn btn-sm btn-outline-danger" (click)="remove(r.id!)">
                    <i class="bi bi-trash"></i> Delete
                  </button>
                </td>
              </tr>

              <!-- Edit mode -->
              <tr *ngFor="let r of routes" [hidden]="editingId !== r.id">
                <td>
                  <input class="form-control form-control-sm" [(ngModel)]="editForm.lineNumber" maxlength="10">
                </td>
                <td>
                  <input class="form-control form-control-sm" [(ngModel)]="editForm.name" maxlength="120">
                  <small class="text-muted">Stops: </small>
                  <input class="form-control form-control-sm mt-1" [(ngModel)]="editForm.stopsJson">
                </td>
                <td>
                  <div class="form-check">
                    <input id="edit-active" type="checkbox" class="form-check-input" [(ngModel)]="editForm.active">
                    <label for="edit-active" class="form-check-label">Active</label>
                  </div>
                </td>
                <td class="text-end">
                  <button class="btn btn-sm btn-success me-2" (click)="saveEdit(r.id!)" [disabled]="!isEditValid()">
                    <i class="bi bi-check-lg"></i> Save
                  </button>
                  <button class="btn btn-sm btn-outline-secondary" (click)="cancelEdit()">
                    <i class="bi bi-x-lg"></i> Cancel
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  `
})
export class AppComponent implements OnInit {
  private http = inject(HttpClient);

  // General state
  title = 'Frontend Application';
  routes: RouteDTO[] = [];
  activeOnly = false;

  // Messages
  message = '';
  messageType: 'ok' | 'error' | '' = '';

  // Reactive search input
  private search$ = new Subject<string>();

  // CREATE form state
  createForm: RouteDTO = { lineNumber: '', name: '', stopsJson: '[]', active: true };

  // EDIT form state
  editingId: number | null = null;
  editForm: RouteDTO = { lineNumber: '', name: '', stopsJson: '[]', active: true };

  ngOnInit() {
    // Test "hello" endpoint
    this.http.get('http://localhost:8080/api/hello', { responseType: 'text' })
      .subscribe(txt => this.title = txt);

    // Load initial routes
    this.loadRoutes();

    // Setup live search with debounce
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(q =>
          q
            ? this.http.get<RouteDTO[]>(`http://localhost:8080/api/routes/search?q=${encodeURIComponent(q)}`)
            : this.fetchRoutes()
        )
      )
      .subscribe({
        next: list => { this.routes = list; },
        error: () => this.showError('Search failed')
      });
  }

  // ===================== READ =====================
  loadRoutes() {
    this.fetchRoutes().subscribe({
      next: list => { this.routes = list; },
      error: () => this.showError('Failed to load routes')
    });
  }

  private fetchRoutes() {
    const url = this.activeOnly
      ? 'http://localhost:8080/api/routes?activeOnly=true'
      : 'http://localhost:8080/api/routes';
    return this.http.get<RouteDTO[]>(url);
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.search$.next(value.trim());
  }

  // ===================== CREATE =====================
  isCreateValid() {
    return this.createForm.lineNumber.trim().length > 0
        && this.createForm.lineNumber.trim().length <= 10
        && this.createForm.name.trim().length > 0
        && this.createForm.name.trim().length <= 120;
  }

  createRoute() {
    const body: RouteDTO = {
      lineNumber: this.createForm.lineNumber.trim(),
      name: this.createForm.name.trim(),
      stopsJson: this.createForm.stopsJson ?? '[]',
      active: this.createForm.active
    };

    this.http.post<RouteDTO>('http://localhost:8080/api/routes', body).subscribe({
      next: _ => {
        this.showOk('Route created successfully');
        // Reset form & refresh list
        this.createForm = { lineNumber: '', name: '', stopsJson: '[]', active: true };
        this.loadRoutes();
      },
      error: (e) => {
        if (e.status === 409) this.showError('Line number already exists');
        else if (e.status === 400) this.showError('Validation error');
        else this.showError('Failed to create route');
      }
    });
  }

  // ===================== EDIT =====================
  startEdit(r: RouteDTO) {
    this.editingId = r.id!;
    this.editForm = { id: r.id, lineNumber: r.lineNumber, name: r.name, stopsJson: r.stopsJson ?? '[]', active: r.active };
  }

  cancelEdit() {
    this.editingId = null;
    this.editForm = { lineNumber: '', name: '', stopsJson: '[]', active: true };
  }

  isEditValid() {
    return this.editForm.lineNumber.trim().length > 0
        && this.editForm.lineNumber.trim().length <= 10
        && this.editForm.name.trim().length > 0
        && this.editForm.name.trim().length <= 120;
  }

  // ===================== UPDATE =====================
  saveEdit(id: number) {
    const body: RouteDTO = {
      lineNumber: this.editForm.lineNumber.trim(),
      name: this.editForm.name.trim(),
      stopsJson: this.editForm.stopsJson ?? '[]',
      active: this.editForm.active
    };

    this.http.put<RouteDTO>(`http://localhost:8080/api/routes/${id}`, body).subscribe({
      next: _ => {
        this.showOk('Route updated successfully');
        this.cancelEdit();
        this.loadRoutes();
      },
      error: (e) => {
        if (e.status === 409) this.showError('Line number already exists');
        else if (e.status === 400) this.showError('Validation error');
        else this.showError('Failed to update route');
      }
    });
  }

  // ===================== DELETE =====================
  remove(id: number) {
    if (!confirm('Delete this route?')) return;
    this.http.delete<void>(`http://localhost:8080/api/routes/${id}`).subscribe({
      next: _ => {
        this.showOk('Route deleted successfully');
        this.loadRoutes();
      },
      error: _ => this.showError('Failed to delete route')
    });
  }

  // ===================== MESSAGE HELPERS =====================
  private showOk(msg: string) {
    this.messageType = 'ok'; 
    this.message = msg; 
    setTimeout(() => this.message = '', 2000);
  }

  private showError(msg: string) {
    this.messageType = 'error'; 
    this.message = msg; 
    setTimeout(() => this.message = '', 3000);
  }
}
