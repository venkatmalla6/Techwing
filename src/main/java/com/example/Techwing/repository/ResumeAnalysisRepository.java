package com.example.Techwing.repository;

import com.example.Techwing.models.ResumeAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;


public interface ResumeAnalysisRepository extends JpaRepository<ResumeAnalysis, Long> {
    Optional<ResumeAnalysis> findByUserId(Long userId);
    Optional<ResumeAnalysis> findByResumeId(Long resumeId);
}
