import mongoose, { Document, Schema } from 'mongoose';
import { reqString } from './types';

export interface IDailyOtter extends Document {
    guid: string;
}

const DailyOtterSchema: Schema = new mongoose.Schema({
    guid: reqString,
});

export default mongoose.model<IDailyOtter>('dailyotter-pics', DailyOtterSchema);
