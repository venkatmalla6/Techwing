package com.example.Techwing.repository;

import com.example.Techwing.models.TechnologyTrack;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TechnologyTrackRepository extends JpaRepository<TechnologyTrack, Long> {
    List<TechnologyTrack> findByIsActiveTrue();
    boolean existsByName(String name);
}
