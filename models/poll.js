const { v4: uuidv4 } = require('uuid');
const lodash = require('lodash');
const { getDB, saveDB } = require('./db');

// Get questions
function getQuestions(questionId) {
    const DB = getDB();
    console.log('DB:::', DB);
    return questionId ? DB.questions[questionId] : Object.values(DB.questions);
}

// Create a new question
function createNewQuestion({ question, options }) {
    const questionId = getQuestions().length + 1;
    const record = { id: questionId, question, options };
    const DB = getDB();
    DB.questions[questionId] = record;
    saveDB();
    return record;
}

// Poll History
function getPollHistory() {
    const DB = getDB();
    return Object.values(DB.history);
}

function createNewPollHistory() {
    const DB = getDB();
    const previousPoll = lodash.cloneDeep(DB.livePoll);
    const previousPollDt = Object.entries(previousPoll)[0];
    if (previousPollDt) {
        const [questionId, pollResults] = previousPollDt[0];
        DB.history[questionId] = pollResults; // Store results in history
    }
    DB.livePoll = {}; // Clear live poll after saving
    saveDB(); // Save changes to the JSON file
    return true;
}

// Live Poll
function getLivePoll() {
    const DB = getDB();
    return Object.values(DB.livePoll)[0];
}

function createLivePoll(questionObj) {
    const { id: questionId, options, question } = questionObj;
    const optionBasedPollInit = options.reduce((acc, option) => {
        acc[option.text] = { students: [], selection_percent: 0 };
        return acc;
    }, {});

    const DB = getDB();
    DB.livePoll = {
        [questionId]: {
            question: questionObj,
            answers: optionBasedPollInit,
            submissions: 0,
            continuePolling: true,
        },
    };
    saveDB(); // Save changes to the JSON file
    return true;
}

function updateLivePoll(payload) {
    const DB = getDB();
    const questionId = payload.question_id;
    if (DB.livePoll[questionId]) {
        const activeResults = DB.livePoll[questionId];
        if (activeResults.continuePolling) {
            activeResults.submissions += 1;
            const optionSelection = activeResults.answers[payload.selected_option];
            optionSelection.students.push(payload.student_id); // Assuming student_id is part of the payload
            optionSelection.selection_percent = (optionSelection.students.length / activeResults.submissions) * 100;

            if (activeResults.submissions >= Object.keys(DB.students).length) {
                activeResults.continuePolling = false;
            }
        }
        saveDB(); // Save updated results
        return DB.livePoll;
    } else {
        return false;
    }
}

// Active Question
function getAcitveQuestion() {
    const DB = getDB();
    return DB.activeQuestion;
}
function createActiveQuestion(questionId) {
    const questionRecord = getQuestions(questionId);
    if (questionRecord) {
        const DB = getDB();
        DB.activeQuestion = questionRecord;
        saveDB(); // Save the updated active question
        return DB.activeQuestion;
    } else {
        return false;
    }
}

module.exports = {
    getQuestions,
    createNewQuestion,
    getPollHistory,
    createNewPollHistory,
    getLivePoll,
    createLivePoll,
    updateLivePoll,
    getAcitveQuestion,
    createActiveQuestion,
};
