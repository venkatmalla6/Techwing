package com.example.Techwing.service.implementation;

import com.example.Techwing.exception.InterviewException;
import com.example.Techwing.exception.ResourceNotFoundException;
import com.example.Techwing.models.*;
import com.example.Techwing.payload.*;
import com.example.Techwing.repository.*;
import com.example.Techwing.service.InterviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import com.example.Techwing.service.AIClientService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class InterviewServiceImpl implements InterviewService {

    private final InterviewSessionRepository sessionRepository;
    private final TechnicalQuestionRepository technicalQuestionRepository;
    private final TechnicalAnswerRepository technicalAnswerRepository;
    private final HRQuestionRepository hrQuestionRepository;
    private final HRAnswerRepository hrAnswerRepository;
    private final UserRepository userRepository;
    private final InterviewConfigurationRepository configRepository;
    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final AIClientService aiClientService;
    private final InterviewFeedbackRepository feedbackRepository;

    // ─── TECHNICAL ROUND ──────────────────────────────────────────────────────

    @Override
    public InterviewStartResponse startTechnicalRound(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Check if there is already an active session
        Optional<InterviewSession> activeSessionOpt = sessionRepository.findTopByUserIdOrderByCreatedAtDesc(userId);
        if (activeSessionOpt.isPresent()) {
            InterviewSession s = activeSessionOpt.get();
            if (s.getStatus() != SessionStatus.COMPLETED && s.getStatus() != SessionStatus.ABANDONED) {
                log.info("Abandoning previous incomplete session: {}", s.getId());
                s.setStatus(SessionStatus.ABANDONED);
                sessionRepository.save(s);
            }
        }

        // Fetch the configuration for the user's track
        InterviewConfiguration config = null;
        if (user.getTrack() != null) {
            config = configRepository.findByTrackIdAndIsActiveTrue(user.getTrack().getId()).orElse(null);
        }
        // Fallback if no specific config exists
        if (config == null) {
            config = configRepository.findAll().stream()
                    .filter(InterviewConfiguration::getIsActive).findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("InterviewConfiguration", "active", "true"));
        }

        InterviewSession session = InterviewSession.builder()
                .user(user)
                .track(user.getTrack() != null ? user.getTrack() : config.getTrack())
                .config(config)
                .status(SessionStatus.TECHNICAL_IN_PROGRESS)
                .startedAt(LocalDateTime.now())
                .build();
        session = sessionRepository.save(session);

        // Fetch resume analysis to get skills
        List<String> skills = new ArrayList<>();
        resumeAnalysisRepository.findByUserId(userId).ifPresent(analysis -> {
            try {
                if (analysis.getSkills() != null) {
                    JsonNode skillsNode = new ObjectMapper().readTree(analysis.getSkills());
                    if (skillsNode.isArray()) {
                        for (JsonNode node : skillsNode) skills.add(node.asText());
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to parse skills from resume analysis", e);
            }
        });

        // Force exactly 10 questions: 5 from resume, 5 from role
        int qCount = 10;
        List<TechnicalQuestion> sessionQuestions = new ArrayList<>();
        JsonNode aiQuestions = aiClientService.generateTechnicalQuestions(config.getTrack().getName(), skills, qCount);
        
        JsonNode questionsArray = null;
        if (aiQuestions != null) {
            if (aiQuestions.isArray()) {
                questionsArray = aiQuestions;
            } else if (aiQuestions.has("questions") && aiQuestions.get("questions").isArray()) {
                questionsArray = aiQuestions.get("questions");
            }
        }

        if (questionsArray != null) {
            for (JsonNode qNode : questionsArray) {
                Difficulty diff = Difficulty.MEDIUM;
                try {
                    diff = Difficulty.valueOf(qNode.path("difficulty").asText("MEDIUM").toUpperCase());
                } catch (Exception ignored) {}
                
                String cat = qNode.path("category").asText("TECHNICAL");
                if (cat.length() > 90) cat = cat.substring(0, 90);

                TechnicalQuestion q = TechnicalQuestion.builder()
                        .track(config.getTrack())
                        .questionText(qNode.path("question_text").asText("Explain this concept"))
                        .expectedAnswer(qNode.path("expected_answer").asText("A reasonable technical answer"))
                        .difficulty(diff)
                        .category(cat)
                        .isActive(true)
                        .build();
                q = technicalQuestionRepository.save(q);
                sessionQuestions.add(q);
            }
        } else {
            // Fallback to static if AI fails
            sessionQuestions = technicalQuestionRepository.findByTrackIdAndIsActiveTrue(config.getTrack().getId());
        }

        if (sessionQuestions.isEmpty()) {
            log.warn("AI generation failed and no DB questions found. Using built-in fallback questions.");
            String[] fallbackQs = {
                "Tell me about yourself and your technical background.",
                "What programming languages are you most comfortable with, and why?",
                "Explain the difference between object-oriented and functional programming.",
                "How do you approach debugging a complex issue in your code?",
                "Describe a challenging technical project you worked on and how you solved it.",
                "What is the difference between a stack and a queue? Give a real-world use case.",
                "Explain REST API design principles.",
                "What is your understanding of database indexing and when would you use it?",
                "How does garbage collection work in Java or your preferred language?",
                "Describe your experience with version control and CI/CD pipelines."
            };
            for (int i = 0; i < fallbackQs.length; i++) {
                TechnicalQuestion q = TechnicalQuestion.builder()
                        .track(config.getTrack())
                        .questionText(fallbackQs[i])
                        .expectedAnswer("A clear and thoughtful technical answer.")
                        .difficulty(Difficulty.MEDIUM)
                        .category("GENERAL")
                        .isActive(true)
                        .build();
                q = technicalQuestionRepository.save(q);
                sessionQuestions.add(q);
            }
        }
        
        // Ensure we only have up to qCount questions
        if (sessionQuestions.size() > qCount) {
            sessionQuestions = sessionQuestions.subList(0, qCount);
        }

        // Pre-create answers for the session so we can fetch them sequentially
        for (int i = 0; i < sessionQuestions.size(); i++) {
            TechnicalAnswer answer = TechnicalAnswer.builder()
                    .session(session)
                    .question(sessionQuestions.get(i))
                    .questionOrder(i + 1)
                    .build();
            technicalAnswerRepository.save(answer);
        }

        TechnicalQuestion firstQ = sessionQuestions.get(0);

        log.info("Technical round started for user: {} session: {}", userId, session.getId());
        InterviewStartResponse response = InterviewStartResponse.builder()
                .sessionId(session.getId())
                .totalQuestions(config.getTechnicalQuestionCount())
                .timeLimitMinutes(config.getTechnicalTimeMinutes())
                .questionId(firstQ.getId())
                .questionOrder(1)
                .questionText(firstQ.getQuestionText())
                .category(firstQ.getCategory())
                .difficulty(firstQ.getDifficulty().name())
                .build();
        return response;
    }

    @Override
    public AnswerEvalResponse submitTechnicalAnswer(AnswerRequest request) {
        InterviewSession session = sessionRepository.findById(request.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("Session", "id", request.getSessionId()));

        TechnicalAnswer answer = technicalAnswerRepository
                .findBySessionIdAndQuestionOrder(request.getSessionId(), request.getQuestionOrder())
                .orElseThrow(() -> new ResourceNotFoundException("TechnicalAnswer", "sessionId/questionOrder", request.getSessionId()));

        answer.setTranscript(request.getTranscript());
        answer.setAudioS3Url(request.getAudioS3Url());
        answer.setAnsweredAt(LocalDateTime.now());

        // Call Python AI service for evaluation
        double mockScore = 5.0; // fallback
        String aiFeedback = "Answer recorded.";
        
        JsonNode aiResponse = aiClientService.evaluateTechnicalAnswer(
                answer.getQuestion().getQuestionText(),
                answer.getQuestion().getExpectedAnswer(),
                request.getTranscript(),
                session.getTrack().getName()
        );
        
        if (aiResponse != null) {
            try {
                mockScore = aiResponse.get("score").asDouble();
                answer.setAccuracyScore(aiResponse.get("accuracy_score").asDouble());
                answer.setDepthScore(aiResponse.get("depth_score").asDouble());
                answer.setCommunicationScore(aiResponse.get("communication_score").asDouble());
                aiFeedback = aiResponse.get("feedback").asText();
            } catch (Exception e) {
                log.warn("Failed to parse AI evaluation response", e);
            }
        }
        
        answer.setScore(mockScore);
        answer.setAiFeedback(aiFeedback);
        technicalAnswerRepository.save(answer);

        // Infinite mode: always return true. Frontend timer will stop the interview.
        boolean hasNext = true;

        log.info("Technical answer submitted for session: {} order: {}", request.getSessionId(), request.getQuestionOrder());
        return AnswerEvalResponse.builder()
                .transcript(request.getTranscript())
                .evaluated(true)
                .score(mockScore)
                .feedback(answer.getAiFeedback())
                .nextAvailable(hasNext)
                .questionsRemaining(999) // Infinite
                .build();
    }

    @Override
    public QuestionResponse getNextTechnicalQuestion(Long sessionId) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session", "id", sessionId));
        List<TechnicalAnswer> pendingAnswers = technicalAnswerRepository.findBySessionIdAndTranscriptIsNullOrderByQuestionOrderAsc(sessionId);
        
        if (pendingAnswers.isEmpty()) {
            log.info("Current question batch exhausted for session {}. Dynamically generating 5 more questions.", sessionId);
            // Fetch resume skills
            List<String> skills = new ArrayList<>();
            resumeAnalysisRepository.findByUserId(session.getUser().getId()).ifPresent(analysis -> {
                try {
                    if (analysis.getSkills() != null) {
                        JsonNode skillsNode = new ObjectMapper().readTree(analysis.getSkills());
                        if (skillsNode.isArray()) {
                            for (JsonNode node : skillsNode) skills.add(node.asText());
                        }
                    }
                } catch (Exception e) {}
            });
            
            int qCount = 5;
            List<TechnicalQuestion> newQuestions = new ArrayList<>();
            JsonNode aiQuestions = aiClientService.generateTechnicalQuestions(session.getTrack().getName(), skills, qCount);
            
            JsonNode questionsArray = null;
            if (aiQuestions != null) {
                if (aiQuestions.isArray()) {
                    questionsArray = aiQuestions;
                } else if (aiQuestions.has("questions") && aiQuestions.get("questions").isArray()) {
                    questionsArray = aiQuestions.get("questions");
                }
            }

            if (questionsArray != null) {
                for (JsonNode qNode : questionsArray) {
                    Difficulty diff = Difficulty.MEDIUM;
                    try { diff = Difficulty.valueOf(qNode.path("difficulty").asText("MEDIUM").toUpperCase()); } catch (Exception ignored) {}
                    String cat = qNode.path("category").asText("TECHNICAL");
                    if (cat.length() > 90) cat = cat.substring(0, 90);
                    TechnicalQuestion q = TechnicalQuestion.builder()
                            .track(session.getTrack())
                            .questionText(qNode.path("question_text").asText("Explain this concept"))
                            .expectedAnswer(qNode.path("expected_answer").asText("A reasonable technical answer"))
                            .difficulty(diff)
                            .category(cat)
                            .isActive(true)
                            .build();
                    q = technicalQuestionRepository.save(q);
                    newQuestions.add(q);
                }
            } else {
                newQuestions = technicalQuestionRepository.findByTrackIdAndIsActiveTrue(session.getTrack().getId());
                if (newQuestions.size() > qCount) newQuestions = newQuestions.subList(0, qCount);
            }
            
            long currentMaxOrder = technicalAnswerRepository.countBySessionId(sessionId);
            for (int i = 0; i < newQuestions.size(); i++) {
                TechnicalAnswer newAnswer = TechnicalAnswer.builder()
                        .session(session)
                        .question(newQuestions.get(i))
                        .questionOrder((int)(currentMaxOrder + i + 1))
                        .build();
                technicalAnswerRepository.save(newAnswer);
            }
            
            pendingAnswers = technicalAnswerRepository.findBySessionIdAndTranscriptIsNullOrderByQuestionOrderAsc(sessionId);
            if (pendingAnswers.isEmpty()) {
                throw new InterviewException("Failed to generate additional questions.");
            }
        }

        TechnicalAnswer nextAnswer = pendingAnswers.get(0);
        TechnicalQuestion nextQ = nextAnswer.getQuestion();
        
        int total = session.getConfig().getTechnicalQuestionCount();

        return QuestionResponse.builder()
                .questionId(nextQ.getId())
                .order(nextAnswer.getQuestionOrder())
                .questionText(nextQ.getQuestionText())
                .category(nextQ.getCategory())
                .difficulty(nextQ.getDifficulty().name())
                .hasNext(pendingAnswers.size() > 1)
                .totalQuestions(total)
                .build();
    }

    @Override
    public void completeTechnicalRound(Long sessionId) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session", "id", sessionId));
        Double avgScore = technicalAnswerRepository.findAverageScoreBySessionId(sessionId);
        session.setTechnicalScore(avgScore != null ? avgScore : 0.0); // Already on 0-10 scale
        session.setStatus(SessionStatus.TECHNICAL_COMPLETE);
        session.setTechnicalEndAt(LocalDateTime.now());
        sessionRepository.save(session);
        log.info("Technical round completed for session: {}", sessionId);
    }

    // ─── HR ROUND ─────────────────────────────────────────────────────────────

    @Override
    public InterviewStartResponse startHRRound(Long userId) {
        InterviewSession session = sessionRepository.findTopByUserIdOrderByCreatedAtDesc(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Session", "userId", userId));

        // Allow after Technical round
        if (session.getStatus() != SessionStatus.TECHNICAL_COMPLETE) {
            // Also allow if already in HR progress (resume scenario)
            if (session.getStatus() != SessionStatus.HR_IN_PROGRESS) {
                session.setStatus(SessionStatus.TECHNICAL_COMPLETE);
                sessionRepository.save(session);
            }
        }

        List<HRQuestion> questions = hrQuestionRepository.findByIsActiveTrue();
        if (questions.isEmpty()) {
            log.warn("No HR questions in DB. Using built-in fallback HR questions.");
            String[][] fallbackHRQs = {
                {"Tell me about yourself.", "INTRODUCTION"},
                {"Why do you want to work in the technology field?", "MOTIVATION"},
                {"What are your greatest strengths and weaknesses?", "SELF_AWARENESS"},
                {"Describe a time you worked in a team and faced a conflict. How did you resolve it?", "TEAMWORK"},
                {"Where do you see yourself in 5 years?", "CAREER_GOALS"},
                {"How do you handle pressure and tight deadlines?", "WORK_ETHIC"},
                {"Tell me about a time you demonstrated leadership.", "LEADERSHIP"},
                {"What motivates you to give your best at work?", "MOTIVATION"},
                {"How do you prioritize tasks when you have multiple deadlines?", "PROBLEM_SOLVING"},
                {"Do you have any questions for us?", "CLOSING"}
            };
            for (String[] q : fallbackHRQs) {
                HRQuestion hrQ = HRQuestion.builder()
                        .questionText(q[0])
                        .category(com.example.Techwing.models.HRCategory.BEHAVIORAL)
                        .isActive(true)
                        .build();
                questions.add(hrQuestionRepository.save(hrQ));
            }
        }

        session.setStatus(SessionStatus.HR_IN_PROGRESS);
        sessionRepository.save(session);

        // Pick a random starting question for variety
        java.util.Collections.shuffle(questions);
        HRQuestion firstQ = questions.get(0);
        HRAnswer answer = HRAnswer.builder()
                .session(session)
                .question(firstQ)
                .questionOrder(1)
                .build();
        hrAnswerRepository.save(answer);

        int configTotal = session.getConfig().getHrQuestionCount() > 0
                ? session.getConfig().getHrQuestionCount() : 10;

        return InterviewStartResponse.builder()
                .sessionId(session.getId())
                .totalQuestions(configTotal)
                .timeLimitMinutes(session.getConfig().getHrTimeMinutes() > 0
                        ? session.getConfig().getHrTimeMinutes() : 20)
                .questionId(firstQ.getId())
                .questionOrder(1)
                .questionText(firstQ.getQuestionText())
                .category(firstQ.getCategory().name())
                .build();
    }

    @Override
    public AnswerEvalResponse submitHRAnswer(AnswerRequest request) {
        HRAnswer answer = hrAnswerRepository
                .findBySessionIdOrderByQuestionOrder(request.getSessionId())
                .stream().filter(a -> a.getQuestionOrder().equals(request.getQuestionOrder()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("HRAnswer", "order", request.getQuestionOrder()));

        answer.setTranscript(request.getTranscript());
        answer.setAudioS3Url(request.getAudioS3Url());
        answer.setAnsweredAt(LocalDateTime.now());

        // Call Python AI service for real HR evaluation
        double overallScore = 6.0;
        String aiFeedback = "Thank you for your response. Let's move to the next question.";
        JsonNode aiResponse = aiClientService.evaluateHRAnswer(
                answer.getQuestion().getQuestionText(),
                request.getTranscript()
        );
        if (aiResponse != null) {
            try {
                answer.setConfidenceScore(aiResponse.path("confidence_score").asDouble(6.0));
                answer.setCommunicationScore(aiResponse.path("communication_score").asDouble(6.0));
                answer.setFluencyScore(aiResponse.path("fluency_score").asDouble(6.0));
                answer.setGrammarScore(aiResponse.path("grammar_score").asDouble(6.0));
                answer.setLeadershipScore(aiResponse.path("leadership_score").asDouble(6.0));
                answer.setPositivityScore(aiResponse.path("positivity_score").asDouble(6.0));
                answer.setProfessionalismScore(aiResponse.path("professionalism_score").asDouble(6.0));
                overallScore = aiResponse.path("overall_hr_score").asDouble(6.0);
                aiFeedback = aiResponse.path("feedback").asText(aiFeedback);
            } catch (Exception e) {
                log.warn("Failed to parse HR AI evaluation response", e);
            }
        }
        answer.setOverallHrScore(overallScore);
        answer.setAiFeedback(aiFeedback);
        hrAnswerRepository.save(answer);

        // Infinite mode: always nextAvailable=true; timer on frontend controls the end
        return AnswerEvalResponse.builder()
                .transcript(request.getTranscript())
                .evaluated(true)
                .score(overallScore)
                .feedback(aiFeedback)
                .nextAvailable(true)
                .questionsRemaining(999)
                .build();
    }

    @Override
    public QuestionResponse getNextHRQuestion(Long sessionId) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session", "id", sessionId));
        long answered = hrAnswerRepository.countBySessionId(sessionId);

        // Shuffle all questions and pick next unanswered one for variety
        List<HRQuestion> allQuestions = hrQuestionRepository.findByIsActiveTrue();
        if (allQuestions.isEmpty()) throw new InterviewException("No HR questions available");

        // Get IDs of already-answered questions this session
        java.util.Set<Long> answeredIds = hrAnswerRepository
                .findBySessionIdOrderByQuestionOrder(sessionId)
                .stream().map(a -> a.getQuestion().getId())
                .collect(java.util.stream.Collectors.toSet());

        // Pick first unanswered question (cycle through if all done)
        HRQuestion nextQ = allQuestions.stream()
                .filter(q -> !answeredIds.contains(q.getId()))
                .findFirst()
                .orElse(allQuestions.get((int)(answered % allQuestions.size())));

        HRAnswer nextAnswer = HRAnswer.builder()
                .session(session).question(nextQ).questionOrder((int) answered + 1).build();
        hrAnswerRepository.save(nextAnswer);

        return QuestionResponse.builder()
                .questionId(nextQ.getId())
                .order((int) answered + 1)
                .questionText(nextQ.getQuestionText())
                .category(nextQ.getCategory().name())
                .hasNext(true)
                .totalQuestions(allQuestions.size())
                .build();
    }

    @Override
    public void completeHRRound(Long sessionId) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session", "id", sessionId));
        Double avgHR = hrAnswerRepository.findAverageHRScoreBySessionId(sessionId);
        session.setHrScore(avgHR != null ? avgHR : 0.0); // Already on 0-10 scale
        session.setStatus(SessionStatus.HR_COMPLETE);
        session.setHrEndAt(LocalDateTime.now());
        sessionRepository.save(session);
        log.info("HR round completed for session: {}", sessionId);
    }

    // ─── FEEDBACK ─────────────────────────────────────────────────────────────
    @Override
    public void submitFeedback(FeedbackRequest request, Long userId) {
        InterviewSession session = sessionRepository.findById(request.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("Session", "id", request.getSessionId()));

        if (!session.getUser().getId().equals(userId)) {
            throw new InterviewException("Unauthorized to submit feedback for this session");
        }

        InterviewFeedback feedback = InterviewFeedback.builder()
                .session(session)
                .user(session.getUser())
                .feedbackText(request.getFeedbackText())
                .rating(request.getRating())
                .build();

        feedbackRepository.save(feedback);
        log.info("Feedback submitted for session: {}", request.getSessionId());
    }
}
