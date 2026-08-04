package com.example.Techwing.service;

import com.example.Techwing.models.ExamResult;
import com.example.Techwing.payload.DraftUpdateRequest;
import com.example.Techwing.repository.ExamResultRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ExamResultService {

    private final ExamResultRepository examResultRepository;
    private final ObjectMapper objectMapper;

    public ExamResultService(ExamResultRepository examResultRepository, ObjectMapper objectMapper) {
        this.examResultRepository = examResultRepository;
        this.objectMapper = objectMapper;
    }

    public List<ExamResult> getAllResults() {
        return examResultRepository.findAll();
    }

    public List<ExamResult> getResultsByRollNumber(String rollNumber) {
        return examResultRepository.findByRollNumber(rollNumber);
    }

    public Optional<ExamResult> getActiveDraft(String rollNumber, String examId) {
        return examResultRepository.findByRollNumberAndExamIdAndIsSubmittedFalse(rollNumber, examId);
    }

    public ExamResult saveResult(ExamResult result, Object answers, Object violationLog, Object cameraCaptures) {
        if (result.getId() == null || result.getId().isEmpty()) {
            result.setId("res_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10));
        }
        
        try {
            if (answers != null) {
                result.setAnswers(objectMapper.writeValueAsString(answers));
            }
            if (violationLog != null) {
                result.setViolationLog(objectMapper.writeValueAsString(violationLog));
            }
            if (cameraCaptures != null) {
                result.setCameraCaptures(objectMapper.writeValueAsString(cameraCaptures));
            }
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to parse result JSON fields", e);
        }

        return examResultRepository.save(result);
    }

    public void updateDraft(String resultId, DraftUpdateRequest request) {
        ExamResult result = examResultRepository.findById(resultId)
                .orElseThrow(() -> new RuntimeException("ExamResult not found with id " + resultId));

        try {
            if (request.getAnswers() != null) {
                result.setAnswers(objectMapper.writeValueAsString(request.getAnswers()));
            }
            if (request.getViolationLog() != null) {
                result.setViolationLog(objectMapper.writeValueAsString(request.getViolationLog()));
            }
            if (request.getCameraCaptures() != null) {
                result.setCameraCaptures(objectMapper.writeValueAsString(request.getCameraCaptures()));
            }
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to parse draft update JSON fields", e);
        }

        examResultRepository.save(result);
    }
}
