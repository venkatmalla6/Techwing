package com.example.Techwing.repository;

import com.example.Techwing.models.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExamRepository extends JpaRepository<Exam, String> {
}
