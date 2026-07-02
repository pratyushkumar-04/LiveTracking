package com.schoolbus.livetracking.controller;

import com.schoolbus.livetracking.dto.LocationUpdateDTO;
import com.schoolbus.livetracking.entity.BusLocation;
import com.schoolbus.livetracking.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/location")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @PostMapping("/update")
    public ResponseEntity<BusLocation> updateLocation(@RequestBody LocationUpdateDTO dto) {
      BusLocation savedLocation = locationService.updateLocation(dto);
      return ResponseEntity.ok(savedLocation);
    }

    @PostMapping("/stop/{busId}")
    public ResponseEntity<BusLocation> stopSharing(@PathVariable Long busId) {
        BusLocation location = locationService.stopSharing(busId);
        return ResponseEntity.ok(location);
    }

    @GetMapping("/latest/{busId}")
    public ResponseEntity<BusLocation> getLatestLocation(@PathVariable Long busId) {
        return locationService.getLatestLocation(busId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/history/{busId}")
    public ResponseEntity<List<BusLocation>> getLocationHistory(@PathVariable Long busId) {
        List<BusLocation> history = locationService.getLocationHistory(busId);
        return ResponseEntity.ok(history);
    }
}
