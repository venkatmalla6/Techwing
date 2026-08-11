package com.example.Techwing.service;

import com.example.Techwing.models.LearningRoadmap;
import com.example.Techwing.payload.ReportResponse;
import java.util.List;

public interface ReportService {
    void generateReport(Long sessionId);
    ReportResponse getReport(Long sessionId);
    String getReportDownloadUrl(Long sessionId);
    LearningRoadmap getRoadmap(Long sessionId);
    List<ReportResponse> getMyReports(Long userId);
}
