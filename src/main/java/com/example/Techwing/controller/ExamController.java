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
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ExamController {

    private final ExamService examService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Exam>>> getAllExams() {
        List<Exam> exams = examService.getAllExams();
        return ResponseEntity.ok(ApiResponse.success("Exams retrieved successfully", exams));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Exam>> getExamById(@PathVariable String id) {
        Optional<Exam> exam = examService.getExamById(id);
        return exam.map(value -> ResponseEntity.ok(ApiResponse.success("Exam retrieved", value)))
                .orElseGet(() -> ResponseEntity.status(404).body(ApiResponse.error("Exam not found")));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Exam>> createExam(@RequestBody Map<String, Object> payload) {
        try {
            Exam exam = new Exam();
            exam.setId((String) payload.get("id"));
            exam.setTitle((String) payload.get("title"));
            if (payload.get("duration") != null) {
                exam.setDuration(((Number) payload.get("duration")).intValue());
            }
            if (payload.get("passingMarks") != null) {
                exam.setPassingMarks(((Number) payload.get("passingMarks")).intValue());
            }
            exam.setStartDate((String) payload.get("startDate"));
            exam.setEndDate((String) payload.get("endDate"));
            exam.setShuffleQuestions((Boolean) payload.get("shuffleQuestions"));
            exam.setShuffleOptions((Boolean) payload.get("shuffleOptions"));
            exam.setShowResultToStudent((Boolean) payload.get("showResultToStudent"));
            if (payload.get("resumeWindow") != null) {
                exam.setResumeWindow(((Number) payload.get("resumeWindow")).intValue());
            }
            
            Object questions = payload.get("questions");
            
            Exam savedExam = examService.createExam(exam, questions);
            return ResponseEntity.ok(ApiResponse.success("Exam created successfully", savedExam));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to create exam: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Exam>> updateExam(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        try {
            Exam exam = new Exam();
            exam.setTitle((String) payload.get("title"));
            if (payload.get("duration") != null) {
                exam.setDuration(((Number) payload.get("duration")).intValue());
            }
            if (payload.get("passingMarks") != null) {
                exam.setPassingMarks(((Number) payload.get("passingMarks")).intValue());
            }
            exam.setStartDate((String) payload.get("startDate"));
            exam.setEndDate((String) payload.get("endDate"));
            exam.setShuffleQuestions((Boolean) payload.get("shuffleQuestions"));
            exam.setShuffleOptions((Boolean) payload.get("shuffleOptions"));
            exam.setShowResultToStudent((Boolean) payload.get("showResultToStudent"));
            if (payload.get("resumeWindow") != null) {
                exam.setResumeWindow(((Number) payload.get("resumeWindow")).intValue());
            }
            
            Object questions = payload.get("questions");
            
            Exam updatedExam = examService.updateExam(id, exam, questions);
            return ResponseEntity.ok(ApiResponse.success("Exam updated successfully", updatedExam));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to update exam: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteExam(@PathVariable String id) {
        try {
            examService.deleteExam(id);
            return ResponseEntity.ok(ApiResponse.success("Exam deleted successfully", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to delete exam: " + e.getMessage()));
        }
    }
}
