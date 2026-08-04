package com.example.Techwing.models;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "exam_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
}
