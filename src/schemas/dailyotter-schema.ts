import mongoose, { Document, Schema } from 'mongoose';
import { reqString, reqDate } from './types';

export interface IDailyOtter extends Document {
    guid: string;
    title: string;
    date: string;
    reference: string;
    link: string;
    imageUrl: string;
}

const DailyOtterSchema: Schema = new mongoose.Schema({
    guid: reqString,
    title: reqString,
    date: reqDate,
    reference: reqString,
    link: reqString,
    imageUrl: reqString,
});

export default mongoose.model<IDailyOtter>('dailyotter-pics', DailyOtterSchema);
