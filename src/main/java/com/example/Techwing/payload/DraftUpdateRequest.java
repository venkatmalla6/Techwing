package com.example.Techwing.payload;

import lombok.Data;

@Data
public class DraftUpdateRequest {
    private Object answers;
    private Object violationLog;
    private Object cameraCaptures;
}
