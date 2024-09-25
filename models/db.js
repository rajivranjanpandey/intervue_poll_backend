const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, '../data.json');

let DB;

function loadDB() {
    try {
        const data = fs.readFileSync(dataFilePath);
        DB = JSON.parse(data);
    } catch (err) {
        console.error("Error reading data file:", err);
        DB = {
            activeQuestion: null,
            livePoll: {},
            history: {},
            questions: {},
            students: {},
            teachers: {}
        };
    }
}

function saveDB() {
    fs.writeFileSync(dataFilePath, JSON.stringify(DB, null, 2));
}

function getDB() {
    return DB;
}

module.exports = { loadDB, saveDB, getDB };
