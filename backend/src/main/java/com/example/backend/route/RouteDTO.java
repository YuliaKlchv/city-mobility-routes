package com.example.backend.route;

import jakarta.validation.constraints.*;

public record RouteDTO(  // DTO for transferring Route data
  Long id,
  @NotBlank String lineNumber,
  @NotBlank String name,
  String stopsJson,
  @NotNull Boolean active
) {}
