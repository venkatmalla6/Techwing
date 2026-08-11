package com.example.Techwing.repository;

import com.example.Techwing.models.HRAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface HRAnswerRepository extends JpaRepository<HRAnswer, Long> {
    List<HRAnswer> findBySessionIdOrderByQuestionOrder(Long sessionId);

    @Query("SELECT AVG(a.overallHrScore) FROM HRAnswer a WHERE a.session.id = :sessionId AND a.overallHrScore IS NOT NULL")
    Double findAverageHRScoreBySessionId(@Param("sessionId") Long sessionId);

    long countBySessionId(Long sessionId);
}
