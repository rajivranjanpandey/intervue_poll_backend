const express = require('express');
const router = express.Router();
const {
    createNewQuestion,
    createNewPollHistory,
    createLivePoll,
    updateLivePoll,
    getLivePoll,
    getPollHistory,
    createActiveQuestion,
    getAcitveQuestion
} = require('../models/poll');
const { createStudent, deleteStudent, getStudents } = require('../models/student');

// Polling endpoints
router.get('/poll', (req, res) => {
    const activeQuestion = getAcitveQuestion();
    if (activeQuestion?.id) {
        res.json({ poll: activeQuestion });
    } else {
        res.status(404).json({ message: 'No active poll' });
    }
});

router.post('/poll', (req, res) => {
    const payload = req.body;
    const questionObj = createNewQuestion(payload);
    createNewPollHistory();
    createLivePoll(questionObj);
    const questionReadyToPoll = createActiveQuestion(questionObj.id);
    if (questionReadyToPoll) {
        // Assuming `req.io` is available in the context
        req.io.emit('newPoll', questionReadyToPoll);
        res.status(201).json(questionObj);
    } else {
        res.status(500).json({ message: "Unable to broadcast the question" });
    }
});

router.post('/poll-answer', (req, res) => {
    const updatedResult = updateLivePoll(req.body);
    if (updatedResult) {
        req.io.emit('liveResults', updatedResult);
        res.status(200).json(updatedResult);
    } else {
        res.status(404).json({ message: 'Poll not found' });
    }
});

router.get('/live-poll', (req, res) => {
    const dt = getLivePoll();
    if (dt) {
        res.status(200).json(dt);
    } else {
        res.status(404).json({ message: 'No active poll' });
    }
});

router.get('/poll-history', (req, res) => {
    res.status(200).json(getPollHistory());
});
router.get('/students', (req, res) => {
    res.status(200).json(getStudents());
})
router.delete('/kickout/:studentId', (req, res) => {
    const { studentId } = req.params;
    deleteStudent(studentId);
    req.io.to(studentId).emit('kickout', { message: 'You have been removed' });
    res.status(200).json({ message: 'Student removed successfully' });
});

module.exports = router;
