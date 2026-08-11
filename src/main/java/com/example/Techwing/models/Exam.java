package com.example.Techwing.models;

import jakarta.persistence.*;

import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "exams")
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

    public Exam() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }

    public Integer getPassingMarks() { return passingMarks; }
    public void setPassingMarks(Integer passingMarks) { this.passingMarks = passingMarks; }

    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }

    public Boolean getShuffleQuestions() { return shuffleQuestions; }
    public void setShuffleQuestions(Boolean shuffleQuestions) { this.shuffleQuestions = shuffleQuestions; }

    public Boolean getShuffleOptions() { return shuffleOptions; }
    public void setShuffleOptions(Boolean shuffleOptions) { this.shuffleOptions = shuffleOptions; }

    public Boolean getShowResultToStudent() { return showResultToStudent; }
    public void setShowResultToStudent(Boolean showResultToStudent) { this.showResultToStudent = showResultToStudent; }

    public Integer getResumeWindow() { return resumeWindow; }
    public void setResumeWindow(Integer resumeWindow) { this.resumeWindow = resumeWindow; }

    public String getQuestions() { return questions; }
    public void setQuestions(String questions) { this.questions = questions; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
