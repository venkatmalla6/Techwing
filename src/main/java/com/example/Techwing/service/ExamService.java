package com.example.Techwing.service;

import com.example.Techwing.models.Exam;
import com.example.Techwing.repository.ExamRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ExamService {

    private final ExamRepository examRepository;
    private final ObjectMapper objectMapper;

    public List<Exam> getAllExams() {
        return examRepository.findAll();
    }

    public Optional<Exam> getExamById(String id) {
        return examRepository.findById(id);
    }

    public Exam createExam(Exam exam, Object questionsObject) {
        if (questionsObject != null) {
            try {
                exam.setQuestions(objectMapper.writeValueAsString(questionsObject));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Failed to parse questions JSON", e);
            }
        }
        return examRepository.save(exam);
    }

    public Exam updateExam(String id, Exam examDetails, Object questionsObject) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found with id " + id));

        exam.setTitle(examDetails.getTitle());
        exam.setDuration(examDetails.getDuration());
        exam.setPassingMarks(examDetails.getPassingMarks());
        exam.setStartDate(examDetails.getStartDate());
        exam.setEndDate(examDetails.getEndDate());
        exam.setShuffleQuestions(examDetails.getShuffleQuestions());
        exam.setShuffleOptions(examDetails.getShuffleOptions());
        exam.setShowResultToStudent(examDetails.getShowResultToStudent());
        exam.setResumeWindow(examDetails.getResumeWindow());

        if (questionsObject != null) {
            try {
                exam.setQuestions(objectMapper.writeValueAsString(questionsObject));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Failed to parse questions JSON", e);
            }
        } else if (examDetails.getQuestions() != null) {
            exam.setQuestions(examDetails.getQuestions());
        }

        return examRepository.save(exam);
    }

    public void deleteExam(String id) {
        examRepository.deleteById(id);
    }
}
