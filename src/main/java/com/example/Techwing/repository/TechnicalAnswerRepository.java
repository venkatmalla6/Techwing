package com.example.Techwing.repository;

import com.example.Techwing.models.TechnicalAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TechnicalAnswerRepository extends JpaRepository<TechnicalAnswer, Long> {
    List<TechnicalAnswer> findBySessionIdOrderByQuestionOrder(Long sessionId);
    Optional<TechnicalAnswer> findTopBySessionIdOrderByQuestionOrderDesc(Long sessionId);
    Optional<TechnicalAnswer> findBySessionIdAndQuestionOrder(Long sessionId, Integer questionOrder);
    List<TechnicalAnswer> findBySessionIdAndTranscriptIsNullOrderByQuestionOrderAsc(Long sessionId);

    @Query("SELECT AVG(a.score) FROM TechnicalAnswer a WHERE a.session.id = :sessionId AND a.score IS NOT NULL")
    Double findAverageScoreBySessionId(@Param("sessionId") Long sessionId);

    long countBySessionId(Long sessionId);
}
