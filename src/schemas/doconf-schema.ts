import mongoose, { Document, Schema } from 'mongoose';
import { reqString } from './types';

export interface IConfig extends Document {
    _id: string;
    channelId: string;
}

const ConfigSchema: Schema = new Schema({
    _id: reqString,
    channelId: reqString,
});

export default mongoose.model<IConfig>('dailyotter-channels', ConfigSchema);
