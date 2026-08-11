package com.example.Techwing.repository;

import com.example.Techwing.models.HRQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;


public interface HRQuestionRepository extends JpaRepository<HRQuestion, Long> {
    List<HRQuestion> findByIsActiveTrue();
    long countByIsActiveTrue();
}
