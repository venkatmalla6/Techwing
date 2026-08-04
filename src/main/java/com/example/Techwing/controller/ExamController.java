package com.example.Techwing.controller;

import com.example.Techwing.models.Exam;
import com.example.Techwing.payload.ApiResponse;
import com.example.Techwing.service.ExamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
public class ExamController {

    private final ExamService examService;

    @GetMapping
    public ResponseEntity<ApiResponse> getAllExams() {
        List<Exam> exams = examService.getAllExams();
        return ResponseEntity.ok(new ApiResponse(true, "Exams retrieved successfully", exams));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse> getExamById(@PathVariable String id) {
        Optional<Exam> exam = examService.getExamById(id);
        return exam.map(value -> ResponseEntity.ok(new ApiResponse(true, "Exam retrieved", value)))
                .orElseGet(() -> ResponseEntity.status(404).body(new ApiResponse(false, "Exam not found", null)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse> createExam(@RequestBody Map<String, Object> payload) {
        try {
            Exam exam = new Exam();
            exam.setId((String) payload.get("id"));
            exam.setTitle((String) payload.get("title"));
            exam.setDuration((Integer) payload.get("duration"));
            exam.setPassingMarks((Integer) payload.get("passingMarks"));
            exam.setStartDate((String) payload.get("startDate"));
            exam.setEndDate((String) payload.get("endDate"));
            exam.setShuffleQuestions((Boolean) payload.get("shuffleQuestions"));
            exam.setShuffleOptions((Boolean) payload.get("shuffleOptions"));
            exam.setShowResultToStudent((Boolean) payload.get("showResultToStudent"));
            exam.setResumeWindow((Integer) payload.get("resumeWindow"));
            
            Object questions = payload.get("questions");
            
            Exam savedExam = examService.createExam(exam, questions);
            return ResponseEntity.ok(new ApiResponse(true, "Exam created successfully", savedExam));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "Failed to create exam: " + e.getMessage(), null));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse> updateExam(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        try {
            Exam exam = new Exam();
            exam.setTitle((String) payload.get("title"));
            exam.setDuration((Integer) payload.get("duration"));
            exam.setPassingMarks((Integer) payload.get("passingMarks"));
            exam.setStartDate((String) payload.get("startDate"));
            exam.setEndDate((String) payload.get("endDate"));
            exam.setShuffleQuestions((Boolean) payload.get("shuffleQuestions"));
            exam.setShuffleOptions((Boolean) payload.get("shuffleOptions"));
            exam.setShowResultToStudent((Boolean) payload.get("showResultToStudent"));
            exam.setResumeWindow((Integer) payload.get("resumeWindow"));
            
            Object questions = payload.get("questions");
            
            Exam updatedExam = examService.updateExam(id, exam, questions);
            return ResponseEntity.ok(new ApiResponse(true, "Exam updated successfully", updatedExam));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "Failed to update exam: " + e.getMessage(), null));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteExam(@PathVariable String id) {
        try {
            examService.deleteExam(id);
            return ResponseEntity.ok(new ApiResponse(true, "Exam deleted successfully", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "Failed to delete exam: " + e.getMessage(), null));
        }
    }
}
