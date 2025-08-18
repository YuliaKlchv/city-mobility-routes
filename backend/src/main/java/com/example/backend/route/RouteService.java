package com.example.backend.route;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@Transactional
public class RouteService {
  private final RouteRepository repo;
  public RouteService(RouteRepository repo) { this.repo = repo; }

  public List<RouteDTO> list(Boolean activeOnly) {
    List<Route> routes = (activeOnly != null && activeOnly)
        ? repo.findByActiveTrue()
        : repo.findAll();
    return routes.stream()
            .map(this::toDTO).toList(); // Convert each Route entity to RouteDTO
  }

  public List<RouteDTO> search(String query) {
    String q = (query == null) ? "" : query.trim();
    if (q.isEmpty()) {
      return repo.findAll().stream().map(this::toDTO).toList();
    }
    return repo
            .findByLineNumberIgnoreCaseContainingOrNameIgnoreCaseContaining(q, q)
            .stream()
            .map(this::toDTO)
            .toList();
  }

  public RouteDTO create(RouteDTO dto) {
    if (repo.existsByLineNumberIgnoreCase(dto.lineNumber()))
      throw new IllegalArgumentException("Line number already exists");
    Route e = toEntity(dto);
    e.setId(null);
    return toDTO(repo.save(e));
  }

  public RouteDTO update(Long id, RouteDTO dto) {
    Route e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Not found"));
    e.setLineNumber(dto.lineNumber());
    e.setName(dto.name());
    e.setStopsJson(dto.stopsJson());
    e.setActive(dto.active());
    return toDTO(e);
  }

  public void delete(Long id) { repo.deleteById(id); }

  private RouteDTO toDTO(Route e) {
    return new RouteDTO(e.getId(), e.getLineNumber(), e.getName(), e.getStopsJson(), e.getActive());
  }
  private Route toEntity(RouteDTO d) {
    Route e = new Route();
    e.setLineNumber(d.lineNumber());
    e.setName(d.name());
    e.setStopsJson(d.stopsJson());
    e.setActive(d.active());
    return e;
  }
}
