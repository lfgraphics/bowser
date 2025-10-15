import { Schema } from 'mongoose';
import { getUsersAndRolesDatabaseConnection } from '../../config/database.js';

const reportSchema = new Schema({
    reportId: { type: String },
    reportMessage: { type: String, required: true },
    devPersonal: { type: String, required: true },
    reporter: { type: String, required: true }
});

export default getUsersAndRolesDatabaseConnection().model('Report', reportSchema, 'Reports');
