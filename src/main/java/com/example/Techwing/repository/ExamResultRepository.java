package com.example.Techwing.repository;

import com.example.Techwing.models.ExamResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamResultRepository extends JpaRepository<ExamResult, String> {
    List<ExamResult> findByRollNumber(String rollNumber);
    Optional<ExamResult> findByRollNumberAndExamIdAndIsSubmittedFalse(String rollNumber, String examId);
}
