package com.example.Techwing.payload;

public class DraftUpdateRequest {
    private Object answers;
    private Object violationLog;
    private Object cameraCaptures;

    public DraftUpdateRequest() {}

    public Object getAnswers() { return answers; }
    public void setAnswers(Object answers) { this.answers = answers; }

    public Object getViolationLog() { return violationLog; }
    public void setViolationLog(Object violationLog) { this.violationLog = violationLog; }

    public Object getCameraCaptures() { return cameraCaptures; }
    public void setCameraCaptures(Object cameraCaptures) { this.cameraCaptures = cameraCaptures; }
}
