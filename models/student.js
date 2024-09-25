const { getDB, saveDB } = require('./db');

function getStudents() {
    const DB = getDB();
    return Object.values(DB.students);
}

function createStudent({ name, id }) {
    const DB = getDB();
    DB.students[id] = { name, id };
    saveDB();
    return true;
}

function deleteStudent(studentId) {
    const DB = getDB();
    delete DB.students[studentId];
    saveDB();
    return true;
}

module.exports = {
    getStudents,
    createStudent,
    deleteStudent
};
