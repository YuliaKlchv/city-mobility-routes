package com.example.backend.route;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/routes")
public class RouteController {
  private final RouteService service;
  public RouteController(RouteService service) { this.service = service; }

  @GetMapping
  public List<RouteDTO> all(@RequestParam(required = false)Boolean activeOnly) {
    return service.list(activeOnly); } // List all routes, optionally filtering by active status

  @PostMapping
  public ResponseEntity<RouteDTO> create(@RequestBody @Validated RouteDTO dto) {
    RouteDTO created = service.create(dto);
    return ResponseEntity.created(URI.create("/api/routes/" + created.id())).body(created);
  }

  @PutMapping("/{id}")
  public RouteDTO update(@PathVariable Long id, @RequestBody @Validated RouteDTO dto) {
    return service.update(id, dto);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    service.delete(id);
    return ResponseEntity.noContent().build();
  }
}
