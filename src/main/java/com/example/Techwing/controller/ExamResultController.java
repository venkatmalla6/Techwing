package com.example.Techwing.controller;

import com.example.Techwing.models.ExamResult;
import com.example.Techwing.payload.ApiResponse;
import com.example.Techwing.payload.DraftUpdateRequest;
import com.example.Techwing.service.ExamResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/exam-results")
public class ExamResultController {

    private final ExamResultService examResultService;

    public ExamResultController(ExamResultService examResultService) {
        this.examResultService = examResultService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse> getResults(@RequestParam(required = false) String rollNumber) {
        List<ExamResult> results;
        if (rollNumber != null && !rollNumber.isEmpty()) {
            results = examResultService.getResultsByRollNumber(rollNumber);
        } else {
            results = examResultService.getAllResults();
        }
        return ResponseEntity.ok(new ApiResponse(true, "Results retrieved successfully", results));
    }

    @GetMapping("/draft")
    public ResponseEntity<ApiResponse> getActiveDraft(
            @RequestParam String rollNumber, 
            @RequestParam String examId) {
        Optional<ExamResult> draft = examResultService.getActiveDraft(rollNumber, examId);
        return draft.map(examResult -> ResponseEntity.ok(new ApiResponse(true, "Active draft found", examResult)))
                .orElseGet(() -> ResponseEntity.ok(new ApiResponse(true, "No active draft", null)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse> submitResult(@RequestBody Map<String, Object> payload) {
        try {
            ExamResult result = new ExamResult();
            result.setId((String) payload.get("id"));
            result.setExamId((String) payload.get("examId"));
            result.setExamName((String) payload.get("examName"));
            result.setStudentName((String) payload.get("studentName"));
            result.setRollNumber((String) payload.get("rollNumber"));
            result.setDate((String) payload.get("date"));
            result.setTotalMarks((Integer) payload.get("totalMarks"));
            
            // Handle potentially Double or Integer values from JSON for percentage and marks
            Object marksObj = payload.get("marksObtained");
            if (marksObj instanceof Number) result.setMarksObtained(((Number) marksObj).doubleValue());
            
            Object percentageObj = payload.get("percentage");
            if (percentageObj instanceof Number) result.setPercentage(((Number) percentageObj).doubleValue());
            
            result.setStatus((String) payload.get("status"));
            result.setTimeTaken((String) payload.get("timeTaken"));
            result.setIsSubmitted((Boolean) payload.get("isSubmitted"));
            result.setTabSwitchingCount((Integer) payload.get("tabSwitchingCount"));
            result.setTotalViolations((Integer) payload.get("totalViolations"));
            
            Object answers = payload.get("answers");
            Object violationLog = payload.get("violationLog");
            Object cameraCaptures = payload.get("cameraCaptures");
            
            ExamResult savedResult = examResultService.saveResult(result, answers, violationLog, cameraCaptures);
            return ResponseEntity.ok(new ApiResponse(true, "Result submitted successfully", savedResult));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "Failed to submit result: " + e.getMessage(), null));
        }
    }

    @PatchMapping("/{resultId}/draft")
    public ResponseEntity<ApiResponse> updateDraft(
            @PathVariable String resultId, 
            @RequestBody DraftUpdateRequest request) {
        try {
            examResultService.updateDraft(resultId, request);
            return ResponseEntity.ok(new ApiResponse(true, "Draft updated successfully", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(false, "Failed to update draft: " + e.getMessage(), null));
        }
    }
}
