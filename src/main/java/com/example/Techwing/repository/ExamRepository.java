package com.example.Techwing.repository;

import com.example.Techwing.models.Exam;
import org.springframework.data.jpa.repository.JpaRepository;



public interface ExamRepository extends JpaRepository<Exam, String> {
}
