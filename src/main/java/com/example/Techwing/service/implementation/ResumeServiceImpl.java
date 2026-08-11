package com.example.Techwing.service.implementation;

import com.example.Techwing.exception.FileUploadException;
import com.example.Techwing.exception.ResourceNotFoundException;
import com.example.Techwing.models.*;
import com.example.Techwing.repository.*;
import com.example.Techwing.service.AIClientService;
import com.example.Techwing.service.ResumeService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDateTime;

@Service
@Slf4j
@Transactional
public class ResumeServiceImpl implements ResumeService {

    private final ResumeRepository resumeRepository;
    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final UserRepository userRepository;
    private final AIClientService aiClientService;
    private final ResumeService self;

    public ResumeServiceImpl(
            ResumeRepository resumeRepository,
            ResumeAnalysisRepository resumeAnalysisRepository,
            UserRepository userRepository,
            AIClientService aiClientService,
            @Lazy ResumeService self) {
        this.resumeRepository = resumeRepository;
        this.resumeAnalysisRepository = resumeAnalysisRepository;
        this.userRepository = userRepository;
        this.aiClientService = aiClientService;
        this.self = self;
    }

    @Override
    public Resume uploadResume(Long userId, MultipartFile file) {
        if (file.isEmpty()) throw new FileUploadException("File is empty");
        String ct = file.getContentType();
        if (!("application/pdf".equals(ct) || "application/octet-stream".equals(ct)))
            throw new FileUploadException("Only PDF files are allowed");
        if (file.getSize() > 5 * 1024 * 1024)
            throw new FileUploadException("File size must not exceed 5MB");

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (Exception e) {
            throw new FileUploadException("Failed to read file bytes: " + e.getMessage());
        }

        Resume resume;
        if (resumeRepository.existsByUserId(userId)) {
            resume = resumeRepository.findByUserId(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Resume", "userId", userId));
            // Wipe out old analysis so we don't accidentally reuse mock data if the new analysis fails!
            resumeAnalysisRepository.findByResumeId(resume.getId())
                .ifPresent(analysis -> resumeAnalysisRepository.delete(analysis));
        } else {
            resume = Resume.builder().user(user).build();
        }

        resume.setFileData(fileBytes);
        resume.setFileName(file.getOriginalFilename());
        resume.setContentType(file.getContentType());
        resume.setFileSizeKb((int)(file.getSize() / 1024));
        resume.setStatus(ResumeStatus.UPLOADED);
        resume.setAnalyzedAt(null);
        resume = resumeRepository.save(resume);

        log.info("Resume stored in DB for userId: {}, filename: {}", userId, resume.getFileName());
        
        self.triggerAnalysis(resume.getId());
        
        return resume;
    }

    @Override
    @Async
    public void triggerAnalysis(Long resumeId) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume", "id", resumeId));
        try {
            resume.setStatus(ResumeStatus.ANALYZING);
            resumeRepository.save(resume);

            // Call Python AI Service with download URL, userId and name for context
            String downloadUrl = "http://localhost:8080/api/resume/download/" + resume.getUser().getId();
            JsonNode aiResult = aiClientService.analyzeResume(
                    downloadUrl,
                    resume.getUser().getId(),
                    resume.getUser().getName()
            );

            String skills, projects, education, certifications, summary;
            double experienceYears;

            if (aiResult != null && aiResult.has("skills")) {
                skills         = aiResult.get("skills").toString();
                projects       = aiResult.has("projects")       ? aiResult.get("projects").toString()       : "[]";
                education      = aiResult.has("education")      ? aiResult.get("education").toString()      : "[]";
                certifications = aiResult.has("certifications") ? aiResult.get("certifications").toString() : "[]";
                experienceYears= aiResult.has("experience_years") ? aiResult.get("experience_years").asDouble(0.0) : 0.0;
                summary        = aiResult.has("summary")        ? aiResult.get("summary").asText("") : "";

            } else {
                // Fail gracefully instead of injecting mock data
                log.error("AI service returned null. Python backend failed to analyze the resume.");
                throw new RuntimeException("AI service failed to analyze resume and return valid data.");
            }

            ResumeAnalysis analysis = resumeAnalysisRepository.findByResumeId(resume.getId())
                    .orElseGet(() -> ResumeAnalysis.builder()
                            .resume(resume)
                            .user(resume.getUser())
                            .build());

            analysis.setSkills(skills);
            analysis.setProjects(projects);
            analysis.setEducation(education);
            analysis.setCertifications(certifications);
            analysis.setExperienceYears(experienceYears);
            analysis.setSummary(summary);
            analysis.setAiRawResponse(aiResult != null ? aiResult.toString() : null);

            resumeAnalysisRepository.save(analysis);
            resume.setStatus(ResumeStatus.ANALYZED);
            resume.setAnalyzedAt(LocalDateTime.now());
            resumeRepository.save(resume);
            log.info("Resume analysis completed for resumeId: {}", resumeId);
        } catch (Exception e) {
            log.error("Resume analysis failed for resumeId: {}", resumeId, e);
            resume.setStatus(ResumeStatus.FAILED);
            resumeRepository.save(resume);
        }
    }

    @Override
    public Resume getResumeByUserId(Long userId) {
        return resumeRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume", "userId", userId));
    }

    @Override
    public ResumeAnalysis getAnalysisByUserId(Long userId) {
        return resumeAnalysisRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("ResumeAnalysis", "userId", userId));
    }

    @Override
    public String getResumePreviewUrl(Long userId) {
        // With MySQL storage, the preview URL now points to our own download endpoint
        return "/api/resume/download/" + userId;
    }
}