package com.example.Techwing.models;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "exams")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exam {
    @Id
    private String id;

    private String title;
    private Integer duration;
    
    @Column(name = "passing_marks")
    private Integer passingMarks;
    
    @Column(name = "start_date")
    private String startDate;
    
    @Column(name = "end_date")
    private String endDate;
    
    @Column(name = "shuffle_questions")
    private Boolean shuffleQuestions;
    
    @Column(name = "shuffle_options")
    private Boolean shuffleOptions;
    
    @Column(name = "show_result_to_student")
    private Boolean showResultToStudent;
    
    @Column(name = "resume_window")
    private Integer resumeWindow;
    
    // Natively store the JSON array of questions
    @Column(columnDefinition = "JSON")
    private String questions;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
