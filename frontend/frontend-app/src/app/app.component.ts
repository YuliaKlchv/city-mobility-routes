import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { paginate, sortBy } from './pagination';
import { environment } from '../environments/environment';

type RouteDTO = {
  id?: number;
  lineNumber: string;
  name: string;
  stopsJson?: string | null;
  active: boolean;
};

type Stop = { stop: string; lat?: number; lng?: number };

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .container { max-width: 980px; }
    .app-card { border-radius: 14px; }
    .btn-icon { display:inline-flex; align-items:center; gap:.35rem }
    .json-invalid { border-color:#dc3545 !important }
    .small-muted { font-size:.8rem; color:#6c757d }
    .spinner { width:1rem;height:1rem;border:.15rem solid #dee2e6;border-top-color:#0d6efd;border-radius:50%;animation:spin .8s linear infinite }
    @keyframes spin { to { transform: rotate(360deg) } }
    .badge-line { min-width: 44px; display:inline-flex; justify-content:center }
  `],
  template: `
    <div class="container py-4">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h1 class="h4 mb-0">City Mobility Routes</h1>
        <span class="badge text-bg-secondary">Backend: <b>{{ title }}</b></span>
      </div>

      <div *ngIf="message()" class="alert" [ngClass]="messageType()==='error' ? 'alert-danger' : 'alert-success'">
        {{ message() }}
      </div>

      <!-- search / filters -->
      <div class="card app-card shadow-sm mb-3">
        <div class="card-body">
          <div class="row g-2 align-items-center">
            <div class="col-lg-5">
              <input class="form-control" placeholder="Search (line or name)"
                     (input)="onSearch($event)" (keyup.enter)="reload()">
            </div>
            <div class="col-lg-3">
              <div class="form-check">
                <input id="activeOnly" type="checkbox" class="form-check-input"
                       [(ngModel)]="activeOnly" (change)="reload()"/>
                <label for="activeOnly" class="form-check-label">Show only active routes</label>
              </div>
            </div>
            <div class="col-lg-4 d-flex gap-2 justify-content-lg-end">
              <select class="form-select w-auto" [(ngModel)]="sortByField" (change)="applyView()">
                <option value="lineNumber">Sort: Line</option>
                <option value="name">Sort: Name</option>
                <option value="active">Sort: Status</option>
              </select>
              <select class="form-select w-auto" [(ngModel)]="sortDir" (change)="applyView()">
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
              <button class="btn btn-outline-secondary btn-icon" (click)="reload()">
                <span class="spinner" *ngIf="loading()"></span><span>Reload</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- create -->
      <div class="card app-card shadow-sm mb-4">
        <div class="card-header"><strong>Create New Route</strong></div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-sm-3">
              <label class="form-label">Line Number</label>
              <input class="form-control" [(ngModel)]="createForm.lineNumber" maxlength="10" />
            </div>
            <div class="col-sm-5">
              <label class="form-label">Name</label>
              <input class="form-control" [(ngModel)]="createForm.name" maxlength="120" />
            </div>

            <!-- mini Stops editor -->
            <div class="col-12">
              <label class="form-label d-flex justify-content-between">
                <span>Stops</span>
                <span class="small-muted">Optional</span>
              </label>

              <div class="row g-2 align-items-center mb-2">
                <div class="col-md-5">
                  <input class="form-control" placeholder='Stop name (e.g. "Stephansplatz")'
                         [(ngModel)]="newStop.stop">
                </div>
                <div class="col-md-2">
                  <input class="form-control" type="number" placeholder="Lat"
                         [(ngModel)]="newStop.lat">
                </div>
                <div class="col-md-2">
                  <input class="form-control" type="number" placeholder="Lng"
                         [(ngModel)]="newStop.lng">
                </div>
                <div class="col-md-3 text-md-end">
                  <button class="btn btn-outline-primary btn-icon" (click)="addStop()"
                          [disabled]="!newStop.stop?.trim()">
                    <i class="bi bi-plus-lg"></i><span>Add stop</span>
                  </button>
                  <button class="btn btn-outline-secondary btn-icon ms-2" (click)="clearStops()" [disabled]="stops.length===0">
                    <i class="bi bi-trash"></i><span>Clear</span>
                  </button>
                </div>
              </div>

              <div class="small-muted" *ngIf="stops.length===0">No stops added.</div>
              <ul class="list-group" *ngIf="stops.length>0">
                <li class="list-group-item d-flex justify-content-between align-items-center" *ngFor="let s of stops; let i = index">
                  <span>{{ s.stop }} <span class="text-muted" *ngIf="s.lat && s.lng">({{s.lat}}, {{s.lng}})</span></span>
                  <button class="btn btn-sm btn-outline-danger" (click)="removeStop(i)">Remove</button>
                </li>
              </ul>
            </div>

            <div class="col-sm-3 d-flex align-items-center">
              <div class="form-check mt-2">
                <input id="create-active" type="checkbox" class="form-check-input" [(ngModel)]="createForm.active">
                <label for="create-active" class="form-check-label">Active</label>
              </div>
            </div>

            <div class="col-12">
              <button class="btn btn-primary btn-icon"
                      (click)="createRoute()"
                      [disabled]="!isCreateValid()">
                <i class="bi bi-plus-lg"></i><span>Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- list -->
      <div class="card app-card shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center">
          <strong>Routes</strong>
          <span class="text-muted small-muted" *ngIf="paged.length === 0">(no entries)</span>
        </div>

        <div class="table-responsive">
          <table class="table table-striped table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th style="width:120px;">Line</th>
                <th>Name</th>
                <th style="width:140px;">Status</th>
                <th style="width:240px;" class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of paged; trackBy: trackById">
                <ng-container *ngIf="editingId !== r.id; else editRow">
                  <td><span class="badge text-bg-primary badge-line">{{ r.lineNumber }}</span></td>
                  <td>{{ r.name }}</td>
                  <td>
                    <span class="badge" [ngClass]="r.active ? 'text-bg-success' : 'text-bg-secondary'">
                      {{ r.active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary btn-icon me-2" (click)="startEdit(r)">
                      <i class="bi bi-pencil"></i><span>Edit</span>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-icon" (click)="remove(r.id!)">
                      <i class="bi bi-trash"></i><span>Delete</span>
                    </button>
                  </td>
                </ng-container>

                <ng-template #editRow>
                  <td>
                    <input class="form-control form-control-sm" [(ngModel)]="editForm.lineNumber" maxlength="10">
                  </td>
                  <td>
                    <input class="form-control form-control-sm mb-1" [(ngModel)]="editForm.name" maxlength="120">
                    <input class="form-control form-control-sm"
                           [class.json-invalid]="!isJsonValid(editForm.stopsJson)"
                           [(ngModel)]="editForm.stopsJson" placeholder='[{"stop":"A"}]'>
                    <div *ngIf="!isJsonValid(editForm.stopsJson)" class="small text-danger mt-1">
                      Invalid JSON format
                    </div>
                  </td>
                  <td>
                    <div class="form-check">
                      <input id="edit-active-{{r.id}}" type="checkbox" class="form-check-input" [(ngModel)]="editForm.active">
                      <label for="edit-active-{{r.id}}" class="form-check-label">Active</label>
                    </div>
                  </td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-success btn-icon me-2"
                            (click)="saveEdit(r.id!)"
                            [disabled]="!isEditValid() || !isJsonValid(editForm.stopsJson)">
                      <i class="bi bi-check-lg"></i><span>Save</span>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary btn-icon" (click)="cancelEdit()">
                      <i class="bi bi-x-lg"></i><span>Cancel</span>
                    </button>
                  </td>
                </ng-template>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- pagination control -->
        <div class="d-flex justify-content-between align-items-center p-3">
          <div class="small-muted">Total: {{ routes.length }}</div>
          <div class="d-flex align-items-center gap-2">
            <select class="form-select form-select-sm w-auto" [(ngModel)]="pageSize" (change)="applyView()">
              <option [ngValue]="5">5</option>
              <option [ngValue]="10">10</option>
              <option [ngValue]="20">20</option>
            </select>
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-secondary" (click)="prevPage()" [disabled]="page<=1">Prev</button>
              <span class="px-2 d-flex align-items-center">Page {{page}} / {{maxPage}}</span>
              <button class="btn btn-sm btn-outline-secondary" (click)="nextPage()" [disabled]="page>=maxPage">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AppComponent implements OnInit {
  private http = inject(HttpClient);

  title = 'Frontend';
  routes: RouteDTO[] = [];
  paged: RouteDTO[] = [];

  activeOnly = false;
  sortByField: 'lineNumber' | 'name' | 'active' = 'lineNumber';
  sortDir: 'asc' | 'desc' = 'asc';

  // pagination state
  page = 1;
  pageSize = 10;
  get maxPage() { return Math.max(1, Math.ceil(this.routes.length / this.pageSize)); }

  // feedback/state
  message = signal('');
  messageType = signal<'ok'|'error'|''>('');
  loading = signal(false);

  // search
  private search$ = new Subject<string>();
  private currentQuery = '';

  // forms
  createForm: RouteDTO = { lineNumber: '', name: '', stopsJson: '[]', active: true };
  editingId: number | null = null;
  editForm: RouteDTO = { lineNumber: '', name: '', stopsJson: '[]', active: true };

  // mini stops editor (for create)
  stops: Stop[] = [];
  newStop: Stop = { stop: '' };

  ngOnInit() {
    // hello
    this.http.get(`${environment.apiBase}/hello`, { responseType: 'text' })
      .subscribe(txt => this.title = txt, () => this.title = 'Backend');

    this.reload();

    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(q => {
          this.currentQuery = q;
          return q
            ? this.http.get<RouteDTO[]>(`${environment.apiBase}/routes/search?q=${encodeURIComponent(q)}`)
            : this.fetchRoutes();
        })
      )
      .subscribe({
        next: list => { this.routes = list; this.page = 1; this.applyView(); },
        error: () => this.showError('Search failed')
      });
  }

  // ======= data =======
  private fetchRoutes() {
    const url = this.activeOnly
      ? `${environment.apiBase}/routes?activeOnly=true`
      : `${environment.apiBase}/routes`;
    return this.http.get<RouteDTO[]>(url);
  }

  reload() {
    this.loading.set(true);
    this.fetchRoutes().subscribe({
      next: list => { this.routes = list; this.page = 1; this.applyView(); this.loading.set(false); },
      error: () => { this.loading.set(false); this.showError('Failed to load routes'); }
    });
  }

  applyView() {
    const sorted = sortBy(this.routes, this.sortByField, this.sortDir);
    this.page = Math.min(this.page, this.maxPage);
    this.paged = paginate(sorted, this.page, this.pageSize);
  }
  nextPage() { if (this.page < this.maxPage) { this.page++; this.applyView(); } }
  prevPage() { if (this.page > 1) { this.page--; this.applyView(); } }

  onSearch(e: Event) {
    const v = (e.target as HTMLInputElement).value.trim();
    this.search$.next(v);
  }

  // ======= create =======
  isCreateValid() {
    return this.createForm.lineNumber.trim().length > 0 &&
           this.createForm.lineNumber.trim().length <= 10 &&
           this.createForm.name.trim().length > 0 &&
           this.createForm.name.trim().length <= 120;
  }

  addStop() {
    if (!this.newStop.stop?.trim()) return;
    this.stops.push({ ...this.newStop, stop: this.newStop.stop.trim() });
    this.newStop = { stop: '' };
    this.syncStopsJson();
  }
  removeStop(i: number) { this.stops.splice(i,1); this.syncStopsJson(); }
  clearStops() { this.stops = []; this.syncStopsJson(); }
  private syncStopsJson() {
    this.createForm.stopsJson = this.stops.length ? JSON.stringify(this.stops) : '[]';
  }

  createRoute() {
    const body: RouteDTO = {
      lineNumber: this.createForm.lineNumber.trim(),
      name: this.createForm.name.trim(),
      stopsJson: this.createForm.stopsJson ?? '[]',
      active: this.createForm.active
    };
    this.http.post<RouteDTO>(`${environment.apiBase}/routes`, body).subscribe({
      next: () => {
        this.showOk('Route created');
        this.createForm = { lineNumber: '', name: '', stopsJson: '[]', active: true };
        this.stops = [];
        this.reload();
      },
      error: (e) => {
        if (e.status === 409) this.showError('Line number already exists');
        else if (e.status === 400) this.showError('Validation error');
        else this.showError('Create failed');
      }
    });
  }

  // ======= edit =======
  startEdit(r: RouteDTO) {
    this.editingId = r.id!;
    this.editForm = {
      id: r.id,
      lineNumber: r.lineNumber,
      name: r.name,
      stopsJson: r.stopsJson ?? '[]',
      active: r.active
    };
  }
  cancelEdit() {
    this.editingId = null;
    this.editForm = { lineNumber: '', name: '', stopsJson: '[]', active: true };
  }
  isEditValid() {
    return this.editForm.lineNumber.trim().length > 0 &&
           this.editForm.lineNumber.trim().length <= 10 &&
           this.editForm.name.trim().length > 0 &&
           this.editForm.name.trim().length <= 120;
  }
  isJsonValid(v: string | null | undefined): boolean {
    if (v == null || v === '') return true;
    try { JSON.parse(v); return true; } catch { return false; }
  }
  saveEdit(id: number) {
    const body: RouteDTO = {
      lineNumber: this.editForm.lineNumber.trim(),
      name: this.editForm.name.trim(),
      stopsJson: this.editForm.stopsJson ?? '[]',
      active: this.editForm.active
    };
    this.http.put<RouteDTO>(`${environment.apiBase}/routes/${id}`, body).subscribe({
      next: () => { this.showOk('Route updated'); this.cancelEdit(); this.reload(); },
      error: (e) => {
        if (e.status === 409) this.showError('Line number already exists');
        else if (e.status === 400) this.showError('Validation error');
        else this.showError('Update failed');
      }
    });
  }

  // ======= delete =======
  remove(id: number) {
    if (!confirm('Delete this route?')) return;
    this.http.delete<void>(`${environment.apiBase}/routes/${id}`).subscribe({
      next: () => { this.showOk('Route deleted'); this.reload(); },
      error: () => this.showError('Delete failed')
    });
  }

  // utils
  trackById(_: number, r: RouteDTO) { return r.id ?? r.lineNumber; }
  private showOk(msg: string)  { this.messageType.set('ok');    this.message.set(msg);  setTimeout(() => this.message.set(''), 1800); }
  private showError(msg: string) { this.messageType.set('error'); this.message.set(msg); setTimeout(() => this.message.set(''), 2500); }
}
