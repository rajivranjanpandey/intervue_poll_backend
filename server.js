// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Create the Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*', // Allow all origins for now
    },
});

app.use(cors());
app.use(express.json()); // For parsing JSON requests

// In-memory storage
const DB = {
    activeQuestion: null,
    livePoll: {},
    history: new Map(),
    questions: new Map(),
    students: new Map(),
    teachers: new Map()
}

// Polling endpoints
app.get('/poll', (req, res) => {
    if (DB.activeQuestion) {
        res.json({ poll: DB.activeQuestion });
    } else {
        res.status(404).json({ message: 'No active poll' });
    }
});

app.post('/poll', (req, res) => {
    const payload = req.body;
    const questionObj = createNewQuestion(payload);
    createNewPollHistory();
    createLivePoll(questionObj);
    const questionReadyToPoll = createActiveQuestion(questionObj.id);
    if (questionReadyToPoll) {
        io.emit('newPoll', questionReadyToPoll); // Broadcast the new poll to all connected clients
        res.status(201).json(questionObj);
    } else {
        res.status(500).json({ message: "Unable to broadcast the question" });
    }
});
app.delete('/kickout/:studentId', (req, res) => {
    const { studentId } = req.params;
    deleteStudent(studentId);
    io.to(studentId).emit('kickout', { message: 'You have been removed' });
    res.status(200).json({ message: 'Student removed successfully' });
})

// Handle socket connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Register student or teacher
    socket.on('register', ({ role, name }) => {
        if (role === 'teacher') {
            DB.teachers[socket.id] = { name, id: socket.id };
            console.log(`Teacher connected: ${name}`);
        } else if (role === 'student') {
            createStudent({ name, id: socket.id });
            console.log('Student connected', name);
            io.emit('connectedStudents', getStudents())

        }
    });

    // Handle answer submission
    socket.on('submitAnswer', (payload) => {
        const updatedResult = updateLivePoll(payload);
        if (updatedResult) {
            io.emit('liveResults', updatedResult); // Broadcast live results to all clients
        }
    });

    // Handle disconnections
    socket.on('disconnect', () => {
        // Remove user from connected lists
        if (DB.teachers.has(socket.id)) {
            DB.teachers.delete(socket.id);
        } else if (DB.students.has(socket.id)) {
            deleteStudent(socket.id);
            io.emit('connectedStudents', getStudents())
        }
    });
});

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Questions
function getQuestions(questionId) {
    if (questionId)
        return DB.questions.get(questionId);
    else
        return DB.questions.values();
}
function createNewQuestion({ question, options }) {
    const questionId = v4();
    const record = { id: questionId, question, options }
    DB.questions.set(questionId, record);
    return record;
}
// Poll History
function createNewPollHistory() {
    const previousPoll = _.cloneDeep(DB.livePoll);
    const [questionId, pollResults] = Object.entries(previousPoll);
    DB.history.set(questionId, pollResults);
    DB.livePoll = {};
    return true;
}
// Live Poll
function getLivePoll() {
    return DB.livePoll;
}
function createLivePoll(questionObj) {
    const { id: questionId, options, question } = questionObj;
    const optionBasedPollInit = options.reduce((acc, option, index) => {
        acc[index + 1] = { students: [], selection_percent: 0 };
        return acc;
    }, {});

    DB.livePoll = {
        [questionId]: {
            question,
            answers: optionBasedPollInit,
            submissions: 0
        }
    }
    return true;
}
function updateLivePoll(payload) {
    const questionId = payload.question_id;
    if (DB.livePoll[questionId]) {
        const activeResults = DB.livePoll[questionId];
        activeResults.submissions += 1;
        activeResults.students.push(socket.id);
        activeResults.selection_percent = (activeResults.students.length / activeResults.submissions) * 100;
        return DB.livePoll;
    } else {
        return false
    }
}
// Active Question
function createActiveQuestion(questionId) {
    const questionRecord = getQuestions(questionId);
    if (questionRecord) {
        DB.activeQuestion = questionRecord;
        return DB.activeQuestion;
    } else {
        return false;
    }
}
// Students
function getStudents() {
    return DB.students.values();
}
function createStudent({ name, id }) {
    DB.students[id] = { name, id };
    console.log(`Student connected: ${name}`);
    return true;
}
function deleteStudent(studentId) {
    DB.students.delete(studentId);
    return true;
}