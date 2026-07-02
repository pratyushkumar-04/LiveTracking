package com.schoolbus.livetracking.service;

import com.schoolbus.livetracking.dto.LocationUpdateDTO;
import com.schoolbus.livetracking.entity.Bus;
import com.schoolbus.livetracking.entity.BusLocation;
import com.schoolbus.livetracking.repository.BusRepository;
import com.schoolbus.livetracking.repository.BusLocationRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class LocationService {

    private final BusRepository busRepository;
    private final BusLocationRepository busLocationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Seeds the database with a default bus if it doesn't already exist.
     * This ensures the application runs immediately without requiring manual SQL setup.
     */
    @PostConstruct
    @Transactional
    public void seedDefaultBus() {
        Bus defaultBus = busRepository.findById(1L).orElse(new Bus());
        defaultBus.setId(1L);
        defaultBus.setBusNumber("BUS-101");
        defaultBus.setDriverName("Ramesh Kumar");
        busRepository.save(defaultBus);
        log.info("Database seeded: Default Bus ID 1 configured.");
    }

    /**
     * Receives location updates, saves it to history, and broadcasts it to WebSocket clients.
     */
    @Transactional
    public BusLocation updateLocation(LocationUpdateDTO dto) {
        Long busId = dto.getBusId();
        
        // Find the bus. If it doesn't exist, create a fallback bus record.
        Bus bus = busRepository.findById(busId)
                .orElseGet(() -> {
                    Bus newBus = Bus.builder()
                            .id(busId)
                            .busNumber("BUS-" + busId)
                            .driverName("Driver " + busId)
                            .build();
                    log.info("Bus ID {} not found. Creating fallback bus.", busId);
                    return busRepository.save(newBus);
                });

        // Delete previous location records for this bus to prevent DB bloating (only store the latest)
        busLocationRepository.deleteByBusId(busId);

        // Create and save the new location update
        BusLocation location = BusLocation.builder()
                .bus(bus)
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .speed(dto.getSpeed() != null ? dto.getSpeed() : 0.0)
                .timestamp(LocalDateTime.now())
                .destinationName(dto.getDestinationName())
                .destinationLatitude(dto.getDestinationLatitude())
                .destinationLongitude(dto.getDestinationLongitude())
                .routeName(dto.getRouteName())
                .nextStopName(dto.getNextStopName())
                .nextStopLatitude(dto.getNextStopLatitude())
                .nextStopLongitude(dto.getNextStopLongitude())
                .finalDestinationName(dto.getFinalDestinationName())
                .finalDestinationLatitude(dto.getFinalDestinationLatitude())
                .finalDestinationLongitude(dto.getFinalDestinationLongitude())
                .active(dto.getActive() != null ? dto.getActive() : true)
                .build();

        BusLocation savedLocation = busLocationRepository.save(location);
        log.info("Location saved for Bus ID {}: ({}, {})", busId, savedLocation.getLatitude(), savedLocation.getLongitude());

        // Broadcast the update dynamically to clients subscribed to "/topic/bus/{busId}"
        String destination = "/topic/bus/" + busId;
        messagingTemplate.convertAndSend(destination, savedLocation);
        log.info("Broadcasted location update to destination: {}", destination);

        return savedLocation;
    }

    /**
     * Updates the latest recorded location to active = false and broadcasts it to WebSocket clients.
     */
    @Transactional
    public BusLocation stopSharing(Long busId) {
        Optional<BusLocation> latestOpt = busLocationRepository.findFirstByBusIdOrderByTimestampDesc(busId);
        if (latestOpt.isPresent()) {
            BusLocation latest = latestOpt.get();
            latest.setActive(false);
            latest.setTimestamp(LocalDateTime.now());
            BusLocation saved = busLocationRepository.save(latest);
            
            // Broadcast the update immediately so tracker switches template
            messagingTemplate.convertAndSend("/topic/bus/" + busId, saved);
            log.info("Broadcasted stop sharing update for Bus ID {}", busId);
            return saved;
        }
        return null;
    }

    /**
     * Retrieves the latest known location for a bus.
     */
    public Optional<BusLocation> getLatestLocation(Long busId) {
        return busLocationRepository.findFirstByBusIdOrderByTimestampDesc(busId);
    }

    /**
     * Retrieves the full location tracking history for a bus.
     */
    public List<BusLocation> getLocationHistory(Long busId) {
        return busLocationRepository.findByBusIdOrderByTimestampAsc(busId);
    }
}
