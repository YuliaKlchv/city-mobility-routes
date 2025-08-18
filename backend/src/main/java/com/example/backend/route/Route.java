package com.example.backend.route;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

@Entity
public class Route {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotBlank @Column(nullable=false, unique=true)
  private String lineNumber;

  @NotBlank @Column(nullable=false)
  private String name;

  @Column(length=4000)
  private String stopsJson;

  @NotNull @Column(nullable=false)
  private Boolean active = true;

  // getters/setters
  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getLineNumber() { return lineNumber; }
  public void setLineNumber(String lineNumber) { this.lineNumber = lineNumber; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getStopsJson() { return stopsJson; }
  public void setStopsJson(String stopsJson) { this.stopsJson = stopsJson; }
  public Boolean getActive() { return active; }
  public void setActive(Boolean active) { this.active = active; }
}
