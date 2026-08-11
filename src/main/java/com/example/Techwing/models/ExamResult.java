package com.example.Techwing.models;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "exam_results")
public class ExamResult {
    @Id
    private String id;

    @Column(name = "exam_id")
    private String examId;

    @Column(name = "exam_name")
    private String examName;

    @Column(name = "student_name")
    private String studentName;

    @Column(name = "roll_number")
    private String rollNumber;

    private String date;

    @Column(name = "total_marks")
    private Integer totalMarks;

    @Column(name = "marks_obtained")
    private Double marksObtained;

    private Double percentage;
    private String status;
    
    @Column(name = "time_taken")
    private String timeTaken;
    
    @Column(name = "is_submitted")
    private Boolean isSubmitted;
    
    @Column(name = "tab_switching_count")
    private Integer tabSwitchingCount;
    
    @Column(name = "total_violations")
    private Integer totalViolations;
    
    @Column(columnDefinition = "JSON")
    private String answers;
    
    @Column(name = "violation_log", columnDefinition = "JSON")
    private String violationLog;
    
    @Column(name = "camera_captures", columnDefinition = "JSON")
    private String cameraCaptures;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public ExamResult() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public String getExamName() { return examName; }
    public void setExamName(String examName) { this.examName = examName; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getRollNumber() { return rollNumber; }
    public void setRollNumber(String rollNumber) { this.rollNumber = rollNumber; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public Integer getTotalMarks() { return totalMarks; }
    public void setTotalMarks(Integer totalMarks) { this.totalMarks = totalMarks; }

    public Double getMarksObtained() { return marksObtained; }
    public void setMarksObtained(Double marksObtained) { this.marksObtained = marksObtained; }

    public Double getPercentage() { return percentage; }
    public void setPercentage(Double percentage) { this.percentage = percentage; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getTimeTaken() { return timeTaken; }
    public void setTimeTaken(String timeTaken) { this.timeTaken = timeTaken; }

    public Boolean getIsSubmitted() { return isSubmitted; }
    public void setIsSubmitted(Boolean isSubmitted) { this.isSubmitted = isSubmitted; }

    public Integer getTabSwitchingCount() { return tabSwitchingCount; }
    public void setTabSwitchingCount(Integer tabSwitchingCount) { this.tabSwitchingCount = tabSwitchingCount; }

    public Integer getTotalViolations() { return totalViolations; }
    public void setTotalViolations(Integer totalViolations) { this.totalViolations = totalViolations; }

    public String getAnswers() { return answers; }
    public void setAnswers(String answers) { this.answers = answers; }

    public String getViolationLog() { return violationLog; }
    public void setViolationLog(String violationLog) { this.violationLog = violationLog; }

    public String getCameraCaptures() { return cameraCaptures; }
    public void setCameraCaptures(String cameraCaptures) { this.cameraCaptures = cameraCaptures; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
