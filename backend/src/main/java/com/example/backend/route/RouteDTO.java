package com.example.backend.route;

import jakarta.validation.constraints.*;

public record RouteDTO(
        Long id,
        @NotBlank(message = "lineNumber is required")
        @Size(max = 10, message = "lineNumber max 10 chars")
        String lineNumber,

        @NotBlank(message = "name is required")
        @Size(max = 120, message = "name max 120 chars")
        String name,

        String stopsJson,
        Boolean active
) {}