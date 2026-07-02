package com.schoolbus.livetracking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationUpdateDTO {

    private Long busId;
    private double latitude;
    private double longitude;
    private Double speed;
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
