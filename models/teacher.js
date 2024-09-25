const { getDB, saveDB } = require('./db');

function getTeachers() {
    const DB = getDB();
    return Object.values(DB.teachers);
}

function createTeacher({ name, id }) {
    const DB = getDB();
    DB.teachers[id] = { name, id };
    saveDB();
    return true;
}

function deleteTeacher(TeacherId) {
    const DB = getDB();
    delete DB.teachers[TeacherId];
    saveDB();
    return true;
}

module.exports = {
    getTeachers,
    createTeacher,
    deleteTeacher
};
