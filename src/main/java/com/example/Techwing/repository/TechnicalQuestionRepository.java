package com.example.Techwing.repository;

import com.example.Techwing.models.Difficulty;
import com.example.Techwing.models.TechnicalQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TechnicalQuestionRepository extends JpaRepository<TechnicalQuestion, Long> {
    List<TechnicalQuestion> findByTrackIdAndIsActiveTrue(Long trackId);
    List<TechnicalQuestion> findByTrackIdAndDifficultyAndIsActiveTrue(Long trackId, Difficulty difficulty);
    long countByTrackId(Long trackId);
}
