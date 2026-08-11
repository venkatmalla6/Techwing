package com.example.Techwing.repository;

import com.example.Techwing.models.InterviewConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InterviewConfigurationRepository extends JpaRepository<InterviewConfiguration, Long> {
    Optional<InterviewConfiguration> findByTrackIdAndIsActiveTrue(Long trackId);
    Optional<InterviewConfiguration> findByTrackId(Long trackId);
}
