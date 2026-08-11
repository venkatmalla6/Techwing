package com.example.Techwing.repository;

import com.example.Techwing.models.InterviewReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;


public interface InterviewReportRepository extends JpaRepository<InterviewReport, Long> {
    Optional<InterviewReport> findBySessionId(Long sessionId);
    List<InterviewReport> findByUserIdOrderByGeneratedAtDesc(Long userId);
}
