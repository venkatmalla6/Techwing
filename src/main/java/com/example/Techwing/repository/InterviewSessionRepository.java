package com.example.Techwing.repository;

import com.example.Techwing.models.InterviewSession;
import com.example.Techwing.models.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewSessionRepository extends JpaRepository<InterviewSession, Long> {
    List<InterviewSession> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<InterviewSession> findTopByUserIdOrderByCreatedAtDesc(Long userId);
    List<InterviewSession> findByStatus(SessionStatus status);
    long countByStatus(SessionStatus status);

    @Query("SELECT AVG(s.overallScore) FROM InterviewSession s WHERE s.overallScore IS NOT NULL")
    Double findAverageOverallScore();

    @Query("SELECT COUNT(s) FROM InterviewSession s WHERE s.user.id = :userId AND s.status = 'COMPLETED'")
    long countCompletedByUserId(Long userId);

    @Query("SELECT s FROM InterviewSession s LEFT JOIN FETCH s.track ORDER BY s.createdAt DESC")
    List<InterviewSession> findAllWithTrack();
}
