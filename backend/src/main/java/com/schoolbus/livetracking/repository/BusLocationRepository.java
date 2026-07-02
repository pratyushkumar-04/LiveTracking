package com.schoolbus.livetracking.repository;

import com.schoolbus.livetracking.entity.BusLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BusLocationRepository extends JpaRepository<BusLocation, Long> {

    // Retrieve the latest location of a bus ordered by timestamp descending
    Optional<BusLocation> findFirstByBusIdOrderByTimestampDesc(Long busId);

    // Retrieve history of a bus ordered by timestamp ascending
    List<BusLocation> findByBusIdOrderByTimestampAsc(Long busId);

    // Delete all location records for a bus to keep the database footprint constant
    void deleteByBusId(Long busId);
}
