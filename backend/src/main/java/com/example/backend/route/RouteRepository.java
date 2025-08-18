package com.example.backend.route;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RouteRepository extends JpaRepository<Route, Long> {
  boolean existsByLineNumberIgnoreCase(String lineNumber);

    // This method checks if a route with the given line number already exists, ignoring case sensitivity.
  List<Route> findByActiveTrue(); // through this method, we can retrieve only active routes

}
