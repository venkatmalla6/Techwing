package com.example.Techwing.repository;

import com.example.Techwing.models.LearningRoadmap;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;


public interface LearningRoadmapRepository extends JpaRepository<LearningRoadmap, Long> {
    Optional<LearningRoadmap> findBySessionId(Long sessionId);
    Optional<LearningRoadmap> findByUserId(Long userId);
}
