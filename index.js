const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIo = require('socket.io');
const { loadDB } = require('./models/db');
const pollRoutes = require('./routes/pollRoutes');
const { getStudents, deleteStudent } = require('./models/student');
const { createTeacher } = require('./models/teacher');
const { updateLivePoll, getLivePoll } = require('./models/poll');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*', // Allow all origins for now
    },
});

app.use(cors());
app.use(express.json());
app.use('/api', (req, res, next) => { req.io = io; next() }, pollRoutes); // Use '/api' prefix for routes

// Load database when the application starts
loadDB();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Register student or teacher
    socket.on('register', ({ role, name }) => {
        console.log('registeration event', { role, name });
        if (role === 'teacher') {
            createTeacher({ name: name, id: socket.id });
            console.log(`Teacher connected: ${name}`);
        } else if (role === 'student') {
            createTeacher({ name, id: socket.id });
            console.log('Student connected', name);
            io.emit('connectedStudents', getStudents())

        }
    });

    // Handle answer submission
    socket.on('submitAnswer', (payload) => {
        payload.student_id = socket.id;
        const updatedResult = updateLivePoll(payload);
        if (updatedResult) {
            io.emit('liveResults', getLivePoll()); // Broadcast live results to all clients
        }
    });

    // Handle disconnections
    socket.on('disconnect', () => {
        // Remove user from connected lists
        const studentInfo = getStudents(socket.id);
        if (studentInfo) {
            deleteStudent(socket.id);
            io.emit('connectedStudents', getStudents())
        }
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
