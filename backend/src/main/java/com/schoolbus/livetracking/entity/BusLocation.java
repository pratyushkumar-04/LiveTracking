package com.schoolbus.livetracking.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "bus_location")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "bus_id", nullable = false)
    private Bus bus;

    private double latitude;
    private double longitude;
    private Double speed;
    private LocalDateTime timestamp;

     private String destinationName;
    private Double destinationLatitude;
    private Double destinationLongitude;

    private String routeName;
    private String nextStopName;
    private Double nextStopLatitude;
    private Double nextStopLongitude;
    private String finalDestinationName;
    private Double finalDestinationLatitude;
    private Double finalDestinationLongitude;

    private Boolean active;
}
